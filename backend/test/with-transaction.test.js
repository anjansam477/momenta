const assert = require('node:assert/strict');
const test = require('node:test');

const { isUnsupportedTxnError } = require('../src/utils/with-transaction');

test('isUnsupportedTxnError recognises standalone-mongod transaction errors', () => {
  assert.equal(
    isUnsupportedTxnError(new Error('Transaction numbers are only allowed on a replica set member or mongos')),
    true,
  );
  assert.equal(isUnsupportedTxnError(new Error('Transactions are not supported on this deployment')), true);
  assert.equal(isUnsupportedTxnError(new Error('This MongoDB deployment does not support retryable writes')), true);
});

test('isUnsupportedTxnError ignores unrelated errors', () => {
  assert.equal(isUnsupportedTxnError(new Error('duplicate key')), false);
  assert.equal(isUnsupportedTxnError(undefined), false);
});
