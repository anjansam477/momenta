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

// Brute-force guard for login (per IP)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  store: makeRedisStore("rl:login:"),
  handler: makeHandler(),
});

// Signup abuse guard (per IP)
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  store: makeRedisStore("rl:signup:"),
  handler: makeHandler(),
});

// Authenticated write limiters — keyed by user email (falls back to IP).
// These run after verifyToken, so req.email is populated.
const byUser = (req) => req.email || req.ip;

// Post creation spam guard
const postWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: byUser,
  store: makeRedisStore("rl:postwrite:"),
  handler: makeHandler(),
});

// Reaction spam guard
const reactionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: byUser,
  store: makeRedisStore("rl:react:"),
  handler: makeHandler(),
});

module.exports = {
  mailLimiter,
  forgotPasswordLimiter,
  generateTokenLimiter,
  loginLimiter,
  signupLimiter,
  postWriteLimiter,
  reactionLimiter,
};
