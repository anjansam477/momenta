const wallRepository = require("../repositories/wall-repository");
const postRepository = require("../repositories/post-repository");
const NotificationService = require("./notification-service");
const { buildNotification } = require("../domain/notifications/notification-rules");

async function loadContext(data = {}) {
  const post   = data.postId  ? await postRepository.getPostById(data.postId).catch(() => null)   : null;
  const wallId = data.wallId  || post?.wallId;
  const wall   = wallId       ? await wallRepository.getWallById(wallId).catch(() => null)         : null;

  // Pre-fetch all member emails so notification-rules stays a pure function
  const members      = wallId ? await wallRepository.getMembers(wallId).catch(() => []) : [];
  const memberEmails = members.map((m) => m.userEmail);

  return { wall: wall?.toObject?.() ?? wall ?? {}, post, memberEmails };
}

async function handleNotificationEvent(event) {
  const { type, data = {} } = event || {};
  const { wall, post, memberEmails } = await loadContext(data);

  const notification = buildNotification(type, {
    wall,
    post,
    actorEmail:   data.email,
    memberEmails,
    metadata:     data.metadata || {},
  });

  if (!notification.wallId || notification.recipients.length === 0) return null;

  return NotificationService.createNotification(notification);
}

async function handleRemoveNotificationEvent(event) {
  const { type, data = {} } = event || {};

  switch (type) {
    case "removePost":
      return NotificationService.findAndDeleteNotification("postAdded", data);
    case "removeReaction":
      return NotificationService.findAndDeleteNotification("reactionAdded", data);
    default:
      return null;
  }
}

module.exports = { handleNotificationEvent, handleRemoveNotificationEvent };
