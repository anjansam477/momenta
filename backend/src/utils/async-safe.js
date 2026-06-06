const client = require("prom-client");
const logger = require("./logger");

// Counter for fire-and-forget background tasks that failed (notifications,
// analytics, etc.). Lets dashboards/alerts surface silent degradation that was
// previously hidden behind empty `.catch(() => {})` blocks.
const backgroundTaskFailures = new client.Counter({
  name: "background_task_failures_total",
  help: "Count of non-blocking background tasks that failed",
  labelNames: ["task"],
});

/**
 * Returns a `.catch()` handler that records + logs the failure instead of
 * silently swallowing it, while keeping the path non-blocking.
 *
 *   await publishNotification(...).catch(swallow("notify:POST_ADDED"));
 */
function swallow(task) {
  return (err) => {
    try {
      backgroundTaskFailures.inc({ task });
    } catch (_) {
      /* metric registration race — ignore */
    }
    logger.warn({ err: err?.message, task }, "Background task failed (non-blocking)");
  };
}

module.exports = { swallow, backgroundTaskFailures };
