// Integration-test harness: real MongoDB (ephemeral, via mongodb-memory-server)
// + an in-memory Redis (ioredis-mock) swapped in for the real ioredis client.
//
// IMPORTANT: requiring this module injects ioredis-mock into the require cache
// BEFORE any application module (repositories → utils/redis.js) is loaded, so the
// app transparently talks to the mock. Always `require('./harness')` FIRST in an
// integration test, before requiring any repository/service under test.

const RedisMock = require('ioredis-mock');
const ioredisPath = require.resolve('ioredis');
require.cache[ioredisPath] = {
  id: ioredisPath,
  filename: ioredisPath,
  loaded: true,
  exports: RedisMock,
};

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

async function start() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('momenta_test'));
}

async function stop() {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
}

// Wipe every collection between tests for isolation.
async function clear() {
  const { collections } = mongoose.connection;
  for (const name of Object.keys(collections)) {
    await collections[name].deleteMany({});
  }
}

module.exports = { start, stop, clear, mongoose };
