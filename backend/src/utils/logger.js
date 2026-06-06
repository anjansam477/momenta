const pino = require("pino");
const { getRequestId } = require("./request-context-store");

const isProd = process.env.NODE_ENV === "production";

const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
  // Pretty-print in dev, JSON in prod (for log aggregators like Datadog/CloudWatch)
  transport: isProd
    ? undefined
    : { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } },
  base: { service: "momenta-api" },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Auto-stamp the active request's correlation id onto every log line, so a
  // shared logger call in any service/repository is traceable to its request.
  mixin() {
    const requestId = getRequestId();
    return requestId ? { requestId } : {};
  },
});

module.exports = logger;
