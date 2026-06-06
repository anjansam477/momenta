const { Kafka } = require("kafkajs");
const {
  handleNotificationEvent,
  handleRemoveNotificationEvent,
} = require("../../services/notification-event-handler");
const { sendMessage } = require("./producer");

const kafka = new Kafka({
  clientId: "momenta",
  brokers: [(process.env.KAFKA_BROKER || "kafka:9092")],
});

const MAX_RETRIES = 3;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Track live consumers so graceful shutdown can disconnect them cleanly.
const activeConsumers = [];

// Process a parsed event with bounded retries; on exhaustion route to a
// dead-letter topic. Returns true if "handled" (success or successfully DLQ'd)
// so the offset can commit; false means we couldn't even DLQ → caller rethrows
// so Kafka redelivers later instead of silently dropping the event.
const processWithRetry = async (handler, parsed, topic) => {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await handler(parsed);
      return true;
    } catch (err) {
      lastErr = err;
      console.warn(`Handler failed for topic ${topic} (attempt ${attempt}/${MAX_RETRIES}):`, err.message);
      if (attempt < MAX_RETRIES) await sleep(200 * attempt);
    }
  }
  // Retries exhausted → dead-letter the event with failure metadata.
  const dlqd = await sendMessage(`${topic}.DLQ`, {
    ...parsed,
    _dlq: { error: lastErr?.message, originalTopic: topic, failedAt: new Date().toISOString() },
  });
  if (!dlqd) {
    console.error(`Could not DLQ message from topic ${topic}; will be redelivered`);
    return false;
  }
  console.error(`Message from topic ${topic} sent to ${topic}.DLQ after ${MAX_RETRIES} attempts`);
  return true;
};

const createConsumer = async (groupId, topic, messageHandler) => {
  const consumer = kafka.consumer({ groupId });

  try {
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });
    activeConsumers.push(consumer);

    await consumer.run({
      // autoCommit (default) commits the offset only after eachMessage resolves
      // without throwing — so we retry/DLQ inside, and only rethrow when we want
      // Kafka to redeliver.
      eachMessage: async ({ topic: currentTopic, partition, message }) => {
        let parsed;
        try {
          parsed = JSON.parse(message.value.toString());
        } catch (err) {
          // Poison message — can't be reprocessed. Park the raw value in the DLQ.
          console.error(`Unparseable message on ${currentTopic}/${partition}; routing to DLQ:`, err.message);
          await sendMessage(`${currentTopic}.DLQ`, {
            raw: message.value?.toString?.() ?? null,
            _dlq: { error: "JSON parse failed", originalTopic: currentTopic, failedAt: new Date().toISOString() },
          });
          return;
        }

        const handled = await processWithRetry(messageHandler, parsed, currentTopic);
        if (!handled) {
          // Couldn't process AND couldn't DLQ — throw so kafkajs redelivers.
          throw new Error(`Unhandled message on ${currentTopic}/${partition}`);
        }
      },
    });

    // Disconnect handled by index.js graceful shutdown — not here
  } catch (error) {
    console.error("Error in Kafka Consumer:", error);
  }
};

const disconnectConsumers = async () => {
  await Promise.all(activeConsumers.map((c) => c.disconnect().catch(() => {})));
  activeConsumers.length = 0;
};

const connectConsumer = async () => {
  if (process.env.ENABLE_KAFKA_NOTIFICATIONS !== "true") {
    console.log("Kafka notification consumers disabled");
    return;
  }

  await Promise.all([
    createConsumer("momenta-notifications", "notifications", handleNotificationEvent),
    createConsumer("momenta-notification-removals", "removeNotifications", handleRemoveNotificationEvent),
  ]);
};

module.exports = {
  connectConsumer,
  disconnectConsumers,
};
