const { Kafka } = require("kafkajs");
const {
  handleNotificationEvent,
  handleRemoveNotificationEvent,
} = require("../../services/notification-event-handler");

const kafka = new Kafka({
  clientId: "momenta",
  brokers: [(process.env.KAFKA_BROKER || "kafka:9092")],
});

const createConsumer = async (groupId, topic, messageHandler) => {
  const consumer = kafka.consumer({ groupId });

  try {
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic: currentTopic, partition, message }) => {
        try {
          const parsedMessage = JSON.parse(message.value.toString());
          await messageHandler(parsedMessage);
        } catch (error) {
          console.error(`Error processing message from topic ${currentTopic}, partition ${partition}:`, error);
        }
      },
    });

    // Disconnect handled by index.js graceful shutdown — not here
  } catch (error) {
    console.error("Error in Kafka Consumer:", error);
  }
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
};
