const assert = require('node:assert/strict');
const test = require('node:test');

const { verifyToken } = require('../src/middleware/auth');

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
