const mongoose = require("mongoose");
const logger = require("./logger");

// Detect the "standalone mongod can't do transactions" family of errors so we
// can degrade gracefully in environments without a replica set.
function isUnsupportedTxnError(err) {
  const msg = err?.message || "";
  return (
    /Transaction numbers are only allowed on a replica set/i.test(msg) ||
    /Transactions are not supported/i.test(msg) ||
    /does not support transactions/i.test(msg) ||
    /This MongoDB deployment does not support retryable writes/i.test(msg)
  );
}

/**
 * Run `work(session)` inside a MongoDB transaction (atomic multi-document write).
 *
 * If the deployment is a standalone mongod (no replica set), transactions aren't
 * available — we transparently re-run `work(null)` without a session so dev
 * still works. Pass the `session` through to every model call inside `work`.
 *
 *   await withTransaction(async (session) => {
 *     await Post.create([doc], session ? { session } : {});
 *     await Other.updateOne(filter, update, session ? { session } : {});
 *   });
 */
async function withTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (err) {
    if (isUnsupportedTxnError(err)) {
      logger.warn("MongoDB transactions unavailable (standalone) — running without a session");
      return work(null);
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

module.exports = { withTransaction, isUnsupportedTxnError };
