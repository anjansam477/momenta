const assert = require('node:assert/strict');
const test = require('node:test');

const { verifyToken } = require('../src/middleware/auth');
const { client: redisClient } = require('../src/utils/redis');

// The auth middleware pulls in the shared Redis client (JWT blacklist). Its
// connection keeps the event loop alive, so without this the test process hangs
// forever in CI. Force-close it once all tests finish.
test.after(() => {
  try { redisClient.disconnect(); } catch (_) { /* already closed */ }
});

function makeRes() {
  return {
    code: undefined,
    body: undefined,
    status(code) {
      this.code = code;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
  };
}

test('verifyToken returns 401 when authorization header is missing', async () => {
  const res = makeRes();
  let nextCalled = false;

  await verifyToken({ headers: {} }, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.code, 401);
  assert.equal(res.body.message, 'Your session has been expired. Please login again.');
});
