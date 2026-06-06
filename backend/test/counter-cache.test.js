const assert = require('node:assert/strict');
const test = require('node:test');

const counterCache = require('../src/utils/counter-cache');
const { client: redisClient } = require('../src/utils/redis');

// counter-cache pulls in the shared Redis client; close it so the suite exits.
test.after(() => {
  try { redisClient.disconnect(); } catch (_) { /* already closed */ }
});

test('jittered TTL stays within [24h, 28h) so expirations de-synchronize', () => {
  const BASE = 60 * 60 * 24;
  const MAX = BASE + 60 * 60 * 4;
  let sawVariation = false;
  let prev = null;

  for (let i = 0; i < 200; i++) {
    const t = counterCache._ttl();
    assert.ok(t >= BASE && t < MAX, `ttl ${t} out of range`);
    if (prev !== null && t !== prev) sawVariation = true;
    prev = t;
  }
  assert.ok(sawVariation, 'TTL should vary across calls (jitter)');
});
