const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { client: redisClient } = require("../utils/redis");
const Response = require("../utils/error-handler");

function makeHandler() {
  return (req, res) => {
    const error = new Error(Response.errorMessage.LIMIT_EXCEEDED);
    error.statusCode = Response.statusCodes.TooManyRequests;
    return Response.respondError(res, error);
  };
}

function makeRedisStore(prefix) {
  return new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix,
  });
}

// Rate limiter for sendContactEmail endpoint
const mailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  store: makeRedisStore("rl:mail:"),
  handler: makeHandler(),
});

// Rate limiter for forgotPassword endpoint
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  store: makeRedisStore("rl:forgotpw:"),
  handler: makeHandler(),
});

// Rate limiter for generateVerificationToken endpoint
const generateTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  store: makeRedisStore("rl:gentoken:"),
  handler: makeHandler(),
});

module.exports = {
  mailLimiter,
  forgotPasswordLimiter,
  generateTokenLimiter,
};
