const wallRepository = require("../repositories/wall-repository");
const postRepository = require("../repositories/post-repository");
const NotificationService = require("./notification-service");
const { buildNotification } = require("../domain/notifications/notification-rules");
const { client: redisClient } = require("../utils/redis");
const { notificationsDelivered } = require("../utils/metrics");

const IDEMPOTENCY_TTL = 60 * 60; // 1h — long enough to cover Kafka redelivery windows

// Idempotency is "check then mark-after-success": the key is only written once
// processing succeeds, so an in-flight retry (transient failure) re-runs the work
// instead of being silently skipped. Redis being down must not block delivery.
async function isProcessed(eventId) {
  if (!eventId) return false;
  try {
    return (await redisClient.exists(`notif:evt:${eventId}`)) === 1;
  } catch (_) {
    return false;
  }
}

async function markProcessed(eventId) {
  if (!eventId) return;
  try {
    await redisClient.set(`notif:evt:${eventId}`, "1", "EX", IDEMPOTENCY_TTL);
  } catch (_) {
    /* redis unavailable — accept rare duplicate over dropping the event */
  }
}

async function loadContext(data = {}) {
  const post   = data.postId  ? await postRepository.getPostById(data.postId).catch(() => null)   : null;
  const wallId = data.wallId  || post?.wallId;
  const wall   = wallId       ? await wallRepository.getWallById(wallId).catch(() => null)         : null;

  // Pre-fetch all member emails so notification-rules stays a pure function
  const members           = wallId ? await wallRepository.getMembers(wallId).catch(() => []) : [];
  const memberEmails      = members.map((m) => m.userEmail);
  const maintainerEmails  = members.filter((m) => m.role === "maintainer").map((m) => m.userEmail);

  return { wall: wall?.toObject?.() ?? wall ?? {}, post, memberEmails, maintainerEmails };
}

async function handleNotificationEvent(event) {
  const { eventId, type, data = {} } = event || {};
  if (await isProcessed(eventId)) return null;

  const { wall, post, memberEmails, maintainerEmails } = await loadContext(data);

  const notification = buildNotification(type, {
    wall,
    post,
    actorEmail:      data.email,
    memberEmails,
    maintainerEmails,
    metadata:        data.metadata || {},
  });

  let result = null;
  if (notification.wallId && notification.recipients.length > 0) {
    result = await NotificationService.createNotification(notification);
    notificationsDelivered.inc();
  }

  await markProcessed(eventId);
  return result;
}

async function handleRemoveNotificationEvent(event) {
  const { eventId, type, data = {} } = event || {};
  if (await isProcessed(eventId)) return null;

  let result = null;
  switch (type) {
    case "removePost":
      result = await NotificationService.findAndDeleteNotification("postAdded", data);
      break;
    case "removeReaction":
      result = await NotificationService.findAndDeleteNotification("reactionAdded", data);
      break;
    default:
      result = null;
  }

  await markProcessed(eventId);
  return result;
}

module.exports = { handleNotificationEvent, handleRemoveNotificationEvent };
