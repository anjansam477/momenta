const assert = require('node:assert/strict');
const test = require('node:test');

const { swallow, backgroundTaskFailures } = require('../src/utils/async-safe');

test('swallow returns a non-throwing handler that records the failure metric', async () => {
  const handler = swallow('unit:test-task');
  // Must not throw even on a rejected/again-failing input.
  assert.doesNotThrow(() => handler(new Error('boom')));

  const metric = await backgroundTaskFailures.get();
  const entry = metric.values.find((v) => v.labels.task === 'unit:test-task');
  assert.ok(entry && entry.value >= 1, 'failure counter should increment for the task label');
});

test('swallow tolerates a missing error object', () => {
  const handler = swallow('unit:no-error');
  assert.doesNotThrow(() => handler(undefined));
});
