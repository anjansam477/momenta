const client = require("prom-client");

// Business + runtime metrics, exposed on the existing /metrics endpoint.
// Counters use the default registry (same one index.js serves).

const postsCreated = new client.Counter({
  name: "momenta_posts_created_total",
  help: "Total posts created (active + pending approval)",
});

const wallsCreated = new client.Counter({
  name: "momenta_walls_created_total",
  help: "Total walls created",
});

const notificationsDelivered = new client.Counter({
  name: "momenta_notifications_delivered_total",
  help: "Total notification events successfully processed/persisted",
});

const socketConnections = new client.Gauge({
  name: "momenta_socket_connections",
  help: "Current number of connected Socket.io clients",
});

// Incremented when the JWT-revocation (blacklist) check can't reach Redis and
// fails open — i.e. revoked tokens may be honored during that window. Alert on this.
const jwtBlacklistCheckFailures = new client.Counter({
  name: "momenta_jwt_blacklist_check_failures_total",
  help: "JWT blacklist checks that failed open due to Redis being unavailable",
});

module.exports = {
  postsCreated,
  wallsCreated,
  notificationsDelivered,
  socketConnections,
  jwtBlacklistCheckFailures,
};
