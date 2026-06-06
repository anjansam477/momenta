const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/users");
const config = require("../config/security-config");
const { client: redisClient } = require("../utils/redis");
const Response = require("../utils/error-handler");
const userRepository = require("../repositories/user-repository");
const logger = require("../utils/logger");
const { jwtBlacklistCheckFailures } = require("../utils/metrics");

const BLACKLIST_PREFIX = "jwt:bl:";

exports.generateToken = (email) => {
  const token = jwt.sign({ email }, config.secretKey, { expiresIn: "3h" });
  return token;
};

exports.getEmailFromToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.secretKey);
    return decoded.email;
  } catch (error) {
    return null
  }
};

exports.generateTokenForReceiver = (email, wallId) => {
  const token = jwt.sign({ email, wallId }, config.deliveredKey, { expiresIn: "30d" });
  return token;
};

exports.getEmailAndWallIdFromToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.deliveredKey);
    return {
      email: decoded.email,
      wallId: decoded.wallId
    };
  } catch (error) {
    return null;
  }
}

async function isBlacklisted(iat) {
  try {
    const result = await redisClient.exists(`${BLACKLIST_PREFIX}${iat}`);
    return result === 1;
  } catch (err) {
    // EXPLICIT POLICY: fail OPEN. A Redis outage must not lock every user out,
    // so we honor the token — at the cost of not enforcing revocation during the
    // outage. This is observable (metric + warn) so it can be alerted on.
    jwtBlacklistCheckFailures.inc();
    logger.warn({ err: err.message }, "JWT blacklist check failed (Redis) — failing open");
    return false;
  }
}

exports.verifyToken = asyncHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, config.secretKey);
      if (await isBlacklisted(decoded.iat)) {
        throw new Error(Response.errorMessage.INVALID_TOKEN);
      }
      req.email = decoded.email;
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return Response.respondError(res, new Error(Response.errorMessage.SESSION_EXPIRED));
      } else if (error instanceof jwt.JsonWebTokenError) {
        return Response.respondError(res, new Error(Response.errorMessage.INVALID_TOKEN));
      } else {
        return Response.respondError(res, new Error(Response.errorMessage.SOMETHING_WENT_WRONG));
      }
    }
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("View")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, config.deliveredKey);
      if (await isBlacklisted(decoded.iat)) {
        throw new Error(Response.errorMessage.INVALID_TOKEN);
      }
      req.email = decoded.email;
      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return Response.respondError(res, new Error(Response.errorMessage.INVALID_TOKEN));
      } else {
        return Response.respondError(res, new Error(Response.errorMessage.SOMETHING_WENT_WRONG));
      }
    }
  } else {
    return Response.respondError(res, new Error(Response.errorMessage.SESSION_EXPIRED));
  }
});

exports.expireToken = asyncHandler(async (req, res, next) => {
  try {
    const token = req.headers["authorization"].split(" ")[1];
    if (!token) {
      throw new Error(Response.generateMessage(Response.errorMessage.PARAMS_REQUIRED, 'Token'));
    }
    const decoded = jwt.verify(token, config.secretKey);
    // TTL = remaining token lifetime so Redis entry auto-cleans up
    const ttl = Math.max(decoded.exp - Math.floor(Date.now() / 1000), 1);
    await redisClient.set(`${BLACKLIST_PREFIX}${decoded.iat}`, '1', 'EX', ttl);
    return Response.respondOk(res, { message: Response.successMessage.USER_LOGOUT });
  } catch (err) {
    return Response.respondError(res, new Error(Response.errorMessage.INVALID_TOKEN));
  }
});
