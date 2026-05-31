const pino = require("pino");

const isProd = process.env.NODE_ENV === "production";

const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
  // Pretty-print in dev, JSON in prod (for log aggregators like Datadog/CloudWatch)
  transport: isProd
    ? undefined
    : { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } },
  base: { service: "momenta-api" },
  timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = logger;
