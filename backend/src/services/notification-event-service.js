const { sendMessage } = require("../utils/message-broker/producer");
const {
  handleNotificationEvent,
  handleRemoveNotificationEvent,
} = require("./notification-event-handler");

async function publishNotification(type, data = {}) {
  const event = { type, data };
  const queued = await sendMessage("notifications", event);

  if (!queued) {
    return await handleNotificationEvent(event);
  }

  return null;
}

async function publishNotificationRemoval(type, data = {}) {
  const event = { type, data };
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
