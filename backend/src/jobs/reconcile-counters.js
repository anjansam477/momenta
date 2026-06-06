const cron = require("node-cron");
const { client } = require("../utils/redis");
const logger = require("../utils/logger");

// Redis counters (post counts) are eventually consistent — increments/decrements
// can drift from the authoritative MongoDB value over time (failed ops, restarts).
// This job periodically drops the cached counters so the next read rebuilds them
// from the source-of-truth Mongo aggregate (see post-repository.getPostCounts).
// Lazy rebuild + jittered TTL keeps this from stampeding the database.

const POST_COUNT_PATTERN = "cnt:posts:*";

// Non-blocking SCAN + DEL so we never block Redis with a big KEYS call.
async function clearByPattern(pattern) {
  let cursor = "0";
  let cleared = 0;
  do {
    const [next, keys] = await client.scan(cursor, "MATCH", pattern, "COUNT", 200);
    cursor = next;
    if (keys.length) {
      await client.del(...keys);
      cleared += keys.length;
    }
  } while (cursor !== "0");
  return cleared;
}

let task = null;

function startCounterReconciliation(schedule = process.env.COUNTER_RECONCILE_CRON || "0 */6 * * *") {
  if (process.env.DISABLE_COUNTER_RECONCILIATION === "true") {
    logger.info("Counter reconciliation disabled via env");
    return null;
  }
  task = cron.schedule(schedule, async () => {
    try {
      const cleared = await clearByPattern(POST_COUNT_PATTERN);
      logger.info({ clearedPostCounters: cleared }, "Counter reconciliation: caches dropped, will rebuild from Mongo");
    } catch (err) {
      logger.warn({ err: err.message }, "Counter reconciliation run failed");
    }
  });
  logger.info({ schedule }, "Counter reconciliation job scheduled");
  return task;
}

function stopCounterReconciliation() {
  if (task) {
    task.stop();
    task = null;
  }
}

module.exports = { startCounterReconciliation, stopCounterReconciliation, clearByPattern };
