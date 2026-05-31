const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'momenta-admin',
  brokers: ['kafka:9092'],
});

const increasePartitions = async (topic, numPartitions) => {
  const admin = kafka.admin();
  await admin.connect();

  try {
    const existingTopics = await admin.listTopics();
    if (!existingTopics.includes(topic)) {
      await admin.createTopics({
        topics: [
          {
            topic,
            numPartitions,
            replicationFactor: 1,
          },
        ],
      });
      console.log(`Topic '${topic}' created with ${numPartitions} partitions.`);
    } else {
      const topicMetadata = await admin.fetchTopicMetadata({ topics: [topic] });
      const currentPartitions = topicMetadata.topics[0]?.partitions.length || 0;

      if (numPartitions > currentPartitions) {
        await admin.createPartitions({
          topicPartitions: [
            {
              topic,
              count: numPartitions,
            },
          ],
        });
        console.log(`Partitions for topic '${topic}' increased to ${numPartitions}.`);
      }
    }
  } catch (error) {
    console.error(`Error ensuring partitions for topic '${topic}':`, error);
  } finally {
    await admin.disconnect();
  }
};

module.exports = {
    increasePartitions
};
