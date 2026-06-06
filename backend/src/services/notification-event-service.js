const crypto = require("crypto");
const { sendMessage } = require("../utils/message-broker/producer");
const {
  handleNotificationEvent,
  handleRemoveNotificationEvent,
} = require("./notification-event-handler");

async function publishNotification(type, data = {}) {
  // eventId makes delivery idempotent: if Kafka both delivers AND we fall back to
  // direct delivery (or Kafka redelivers), the handler processes it only once.
  const event = { eventId: crypto.randomUUID(), type, data };
  const queued = await sendMessage("notifications", event);

  if (!queued) {
    return await handleNotificationEvent(event);
  }

  return null;
}

async function publishNotificationRemoval(type, data = {}) {
  const event = { eventId: crypto.randomUUID(), type, data };
  const queued = await sendMessage("removeNotifications", event);

  if (!queued) {
    return await handleRemoveNotificationEvent(event);
  }

  return null;
}

module.exports = {
  publishNotification,
  publishNotificationRemoval,
};
