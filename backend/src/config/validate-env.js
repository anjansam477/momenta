const logger = require("../utils/logger");

// Fail fast on misconfiguration. In production a bad/missing critical setting
// aborts startup; in dev it only warns (security-config supplies dev fallbacks).
const REQUIRED = [
  "CONNECTION_STRING",
  "REDIS_HOST",
  "JWT_SECRET",
  "DELIVERED_JWT_SECRET",
  "SESSION_SECRET",
];

function validateEnv() {
  const isProd =
    process.env.NODE_ENV === "production" || process.env.ENV === "production";
  const problems = [];

  for (const key of REQUIRED) {
    if (!process.env[key]) problems.push(`${key} is missing`);
  }

  for (const key of ["JWT_SECRET", "DELIVERED_JWT_SECRET", "SESSION_SECRET"]) {
    const val = process.env[key];
    if (val && val.length < 16) problems.push(`${key} is too short (< 16 chars)`);
  }

  const port = Number(process.env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    problems.push(`PORT is invalid: ${process.env.PORT}`);
  }

  if (problems.length === 0) {
    logger.info("Environment configuration validated");
    return;
  }

  const summary = `Config validation failed: ${problems.join("; ")}`;
  if (isProd) {
    logger.fatal(summary);
    throw new Error(summary);
  }
  logger.warn(`${summary} (continuing — non-production)`);
}

module.exports = { validateEnv };
