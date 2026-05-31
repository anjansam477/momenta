const isProduction = process.env.NODE_ENV === "production" || process.env.ENV === "production";

function getSecret(name, devFallback) {
  const value = process.env[name];
  if (value) {
    return value;
  }

  if (isProduction) {
    throw new Error(`${name} must be configured in production.`);
  }

  return devFallback;
}

function getAllowedCorsOrigins(uiBaseUrl) {
  const configuredOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configuredOrigins.length > 0 ? configuredOrigins : [uiBaseUrl];
}

module.exports = {
  secretKey: getSecret("JWT_SECRET", "dev-only-jwt-secret-change-me"),
  deliveredKey: getSecret("DELIVERED_JWT_SECRET", "dev-only-delivered-secret-change-me"),
  sessionSecret: getSecret("SESSION_SECRET", "dev-only-session-secret-change-me"),
  defaultOAuthPassword: getSecret("DEFAULT_USER_PASS", "dev-only-oauth-user-password"),
  googleClientId: getSecret("GOOGLE_CLIENT_ID", "dev-only-google-client-id"),
  googleClientSecret: getSecret("GOOGLE_CLIENT_SECRET", "dev-only-google-client-secret"),
  saltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 10),
  cookieSecure: process.env.COOKIE_SECURE === "true" || isProduction,
  cookieSameSite: process.env.COOKIE_SAMESITE || (isProduction ? "None" : "Lax"),
  isProduction,
  getAllowedCorsOrigins,
};
