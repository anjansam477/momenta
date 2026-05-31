const Redis = require('ioredis');
const cron = require('node-cron');

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};
// Only add password if non-empty — prevents "ERR Client sent AUTH but no password is set" error
if (process.env.REDIS_PASSWORD) redisConfig.password = process.env.REDIS_PASSWORD;

const client = new Redis(redisConfig);

client.on('ready', function () {
  console.log('Redis client is Ready.');
});

client.on('error', function (err) {
  console.warn('Redis client connection error:', err.message);
});

// ioredis natively supports promises — no promisify needed
const getAsync = (key) => client.get(key);
const setAsync = (key, value) => client.set(key, value);
const hgetAsync = (hash, field) => client.hget(hash, field);
const hsetAsync = (hash, field, value) => client.hset(hash, field, value);
const existsAsync = (key) => client.exists(key);
const hgetallAsync = (hash) => client.hgetall(hash);
const hdelAsync = (hash, field) => client.hdel(hash, field);

// Cleanup job function
async function cleanupExpiredEntries() {
  try {
      const hashes = ['searchedGif', 'searchedSticker'];
      const oneWeekInSeconds = 7 * 24 * 60 * 60;
      const currentTime = Math.floor(Date.now() / 1000);

      for (const hash of hashes) {
          const hashEntries = await hgetallAsync(hash);

          if (!hashEntries) {
              continue;
          }

          // Iterate over all queries in the hash
          for (const query in hashEntries) {
              const [count, timestamp] = hashEntries[query].split(':').map(Number);
              const key = `${hash === 'searchedGif' ? 'search_gifs_' : 'search_stickers_'}${query}`;

              // Check if the corresponding cache key exists
              const keyExists = await existsAsync(key);

              if (!keyExists) {
                if ((currentTime - timestamp) > oneWeekInSeconds && count < 5) {
                    // If the cache key does not exist, the entry is older than a week, and the count is less than 5, remove the entry from the hash
                    await hdelAsync(hash, query);
                } else if (count >= 5) {
                    // If the cache key does not exist and the count is 5 or more, remove the entry from the hash
                    await hdelAsync(hash, query);
                }
            }
          }
      }
  } catch (err) {
      console.error('Error during cleanup:', err);
  }
}


// Schedule the cleanup job to run every day
cron.schedule('0 0 * * *', cleanupExpiredEntries);


module.exports = {
  client,
  getAsync,
  setAsync,
  hgetAsync,
  hsetAsync,
  existsAsync,
};


