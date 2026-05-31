const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "momenta",
  brokers: [(process.env.KAFKA_BROKER || "kafka:9092")],
});

const producer = kafka.producer();
let isConnected = false;

const connectProducer = async () => {
  if (isConnected) {
    return true;
  }

  await producer.connect();
  isConnected = true;
  console.log("Kafka Producer connected");
  return true;
};

const sendMessage = async (topic, message) => {
  if (process.env.ENABLE_KAFKA_NOTIFICATIONS !== "true") {
    return false;
  }

  try {
    await connectProducer();
    await producer.send({
      topic: topic,
      messages: [
        { value: JSON.stringify(message) },
      ],
    });
    return true;
  } catch (error) {
    isConnected = false;
    console.warn(`Kafka publish failed for ${topic}; using direct notification delivery`, error.message);
    return false;
  }
};

const disconnectProducer = async () => {
  if (!isConnected) {
    return;
  }
  await producer.disconnect();
  isConnected = false;
  console.log('Kafka Producer disconnected');
};


module.exports = {
  connectProducer,
  sendMessage
};
