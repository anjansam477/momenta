const assert = require('node:assert/strict');
const test = require('node:test');

const { runWithContext, getRequestId, getContext } = require('../src/utils/request-context-store');

test('getRequestId is undefined outside any request context', () => {
  assert.equal(getRequestId(), undefined);
});

test('runWithContext exposes the requestId to synchronous + async callees', async () => {
  await runWithContext({ requestId: 'req-123' }, async () => {
    assert.equal(getRequestId(), 'req-123');
    assert.deepEqual(getContext(), { requestId: 'req-123' });
    // survives an await boundary
    await Promise.resolve();
    assert.equal(getRequestId(), 'req-123');
  });

  // context does not leak outside the run scope
  assert.equal(getRequestId(), undefined);
});

test('nested contexts are isolated', async () => {
  await runWithContext({ requestId: 'outer' }, async () => {
    assert.equal(getRequestId(), 'outer');
    await runWithContext({ requestId: 'inner' }, async () => {
      assert.equal(getRequestId(), 'inner');
    });
    assert.equal(getRequestId(), 'outer');
  });
});
