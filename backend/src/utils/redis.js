const Redis = require('ioredis');

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
const setAsync = (key, value, ...args) => client.set(key, value, ...args);
const hgetAsync = (hash, field) => client.hget(hash, field);
const hsetAsync = (hash, field, value) => client.hset(hash, field, value);
const existsAsync = (key) => client.exists(key);
module.exports = {
  client,
  getAsync,
  setAsync,
  hgetAsync,
  hsetAsync,
  existsAsync,
};


