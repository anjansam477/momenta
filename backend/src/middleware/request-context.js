const { randomUUID } = require("crypto");
const logger = require("../utils/logger");
const { runWithContext } = require("../utils/request-context-store");

/**
 * Stamps every request with a unique ID and attaches a child logger.
 * Downstream code uses req.log.info(...) — all entries share the same requestId
 * so you can grep a full request trace across any log aggregator.
 */
module.exports = function requestContext(req, res, next) {
  const requestId = req.headers["x-request-id"] || randomUUID();
  req.id = requestId;
  res.setHeader("X-Request-ID", requestId);

  req.log = logger.child({
    requestId,
    method: req.method,
    url: req.originalUrl,
  });

  const start = Date.now();
  res.on("finish", () => {
    req.log.info(
      { statusCode: res.statusCode, durationMs: Date.now() - start },
      "request completed"
    );
  });

  // Run the rest of the request inside the async-local context so every shared
  // logger call downstream inherits this requestId.
  runWithContext({ requestId }, () => next());
};
