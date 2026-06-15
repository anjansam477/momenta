const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/users");
const config = require("../config/security-config");
const { client: redisClient } = require("../utils/redis");
const Response = require("../utils/error-handler");
const userRepository = require("../repositories/user-repository");
const wallRepository = require("../repositories/wall-repository");
const logger = require("../utils/logger");
const { jwtBlacklistCheckFailures, viewTokenVersionCheckFailures } = require("../utils/metrics");

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

exports.generateTokenForReceiver = (email, wallId, version = 0) => {
  // Shared-wall receiver links are intentionally PERMANENT (no `expiresIn`) —
  // recipients keep access to a wall they were shared with. The embedded `v` is
  // the wall's receiver-link epoch at mint time; verifyToken rejects the link
  // once the owner rotates that epoch (per-wall revocation). Global revocation is
  // still possible by rotating `deliveredKey`.
  const token = jwt.sign({ email, wallId, v: version }, config.deliveredKey);
  return token;
};

// Pure comparison so it can be unit-tested without a DB/JWT. A token is current
// when its epoch matches the wall's, treating missing values as 0 (so links
// minted before versioning, and never-rotated walls, both stay valid).
const isVersionCurrent = (currentVersion, tokenVersion) =>
  (currentVersion || 0) === (tokenVersion || 0);
exports.isVersionCurrent = isVersionCurrent;

// Look up the wall's current epoch and compare. Fails OPEN on a DB error (same
// policy as the JWT blacklist) and on a missing wall (access fails downstream
// anyway) — only a definite epoch mismatch rejects the link.
async function isViewTokenCurrent(wallId, tokenVersion) {
  try {
    const current = await wallRepository.getViewTokenVersion(wallId);
    if (current === null) return true;
    return isVersionCurrent(current, tokenVersion);
  } catch (err) {
    viewTokenVersionCheckFailures.inc();
    logger.warn({ err: err.message }, "View-token version check failed — failing open");
    return true;
  }
}

exports.getEmailAndWallIdFromToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.deliveredKey);
    return {
      email: decoded.email,
      wallId: decoded.wallId,
      v: decoded.v,
    };
  } catch (error) {
    return null;
  }
}

// Full receiver-token validation: signature + per-wall epoch. Returns the decoded
// payload when the link is still current, or null if forged/expired/rotated. Use
// this (not the bare decode) wherever a receiver link grants wall access.
exports.getReceiverFromToken = async (token) => {
  const decoded = exports.getEmailAndWallIdFromToken(token);
  if (!decoded) return null;
  if (decoded.wallId && !(await isViewTokenCurrent(decoded.wallId, decoded.v))) return null;
  return decoded;
};

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
      if (decoded.wallId && !(await isViewTokenCurrent(decoded.wallId, decoded.v))) {
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
