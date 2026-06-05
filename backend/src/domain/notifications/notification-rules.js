const NOTIFICATION_TYPES = Object.freeze({
  POST_ADDED:               "postAdded",
  POST_PENDING:             "postPending",
  POST_APPROVED:            "postApproved",
  POST_REJECTED:            "postRejected",
  POST_REPORTED:            "postReported",
  POST_REPORT_THRESHOLD:    "postReportThreshold",
  POST_UNREPORTED:          "postUnreported",
  POST_DELETED:             "postDeleted",
  REACTION_ADDED:           "reactionAdded",
  ACCESS_GRANTED:           "accessGranted",
  INVITE_ACCEPTED:          "inviteAccepted",
  WALL_UPDATED:             "wallUpdated",
  WALL_LOCKED:              "wallLocked",
  WALL_UNLOCKED:            "wallUnlocked",
  WALL_ARCHIVED:            "wallArchived",
});

const NOTIFICATION_STATUSES = Object.freeze({
  UNREAD:   "unread",
  READ:     "read",
  ARCHIVED: "archived",
});

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function uniqueEmails(emails, excludeEmail) {
  const excluded = normalizeEmail(excludeEmail);
  return Array.from(
    new Set((emails || []).map(normalizeEmail).filter((e) => e && e !== excluded))
  );
}

function toRecipients(emails, actorEmail) {
  return uniqueEmails(emails, actorEmail).map((userEmail) => ({
    userEmail,
    status: NOTIFICATION_STATUSES.UNREAD,
  }));
}

/**
 * Build a notification document ready for MongoDB insertion.
 *
 * @param {string} type - One of NOTIFICATION_TYPES values
 * @param {object} ctx
 * @param {object} ctx.wall       - Wall document
 * @param {object} ctx.post       - Post document (optional)
 * @param {string} ctx.actorEmail - Who triggered the action
 * @param {string[]} ctx.memberEmails      - All emails with any wall access (pre-fetched from WallMember)
 * @param {string[]} ctx.maintainerEmails  - Emails of maintainer-role members only
 * @param {object} ctx.metadata   - Extra data for the notification
 */
function buildNotification(type, { wall = {}, post = {}, actorEmail, memberEmails = [], maintainerEmails = [], metadata = {} }) {
  if (!Object.values(NOTIFICATION_TYPES).includes(type)) {
    throw new Error(`Unsupported notification type: ${type}`);
  }

  const wallId   = wall._id || post?.wallId || metadata.wallId;
  const postId   = post?._id || metadata.postId || null;
  const actor    = normalizeEmail(actorEmail || metadata.email);
  const owner    = normalizeEmail(wall.ownerEmail);
  const postAuthor = normalizeEmail(post?.authorEmail || post?.email);

  let recipients;

  switch (type) {
    case NOTIFICATION_TYPES.POST_ADDED:
      // Notify owner + all members except poster
      recipients = toRecipients([owner, ...memberEmails], actor);
      break;

    case NOTIFICATION_TYPES.POST_PENDING:
      // Notify owner + maintainers that a post needs review (not the poster)
      recipients = toRecipients([owner, ...maintainerEmails], actor);
      break;

    case NOTIFICATION_TYPES.POST_APPROVED:
      // Notify the poster that their post was approved
      recipients = toRecipients([postAuthor], actor);
      break;

    case NOTIFICATION_TYPES.POST_REJECTED:
      // Notify the poster that their post was rejected
      recipients = toRecipients([postAuthor], actor);
      break;

    case NOTIFICATION_TYPES.POST_REPORTED:
      recipients = toRecipients([owner, postAuthor, ...memberEmails], actor);
      break;

    case NOTIFICATION_TYPES.POST_REPORT_THRESHOLD:
      // Only owner + maintainers need to act — not the post author
      recipients = toRecipients([owner, ...memberEmails], actor);
      break;

    case NOTIFICATION_TYPES.POST_UNREPORTED:
      recipients = toRecipients([postAuthor], actor);
      break;

    case NOTIFICATION_TYPES.POST_DELETED:
      recipients = toRecipients([postAuthor || metadata.postEmail], actor);
      break;

    case NOTIFICATION_TYPES.REACTION_ADDED:
      recipients = toRecipients([postAuthor], actor);
      break;

    case NOTIFICATION_TYPES.ACCESS_GRANTED:
      recipients = toRecipients(metadata.grantedEmails || [], actor);
      break;

    case NOTIFICATION_TYPES.INVITE_ACCEPTED:
      // Notify owner + maintainers that someone joined via invite link
      recipients = toRecipients([owner, ...maintainerEmails], actor);
      break;

    case NOTIFICATION_TYPES.WALL_UPDATED:
    case NOTIFICATION_TYPES.WALL_LOCKED:
    case NOTIFICATION_TYPES.WALL_UNLOCKED:
    case NOTIFICATION_TYPES.WALL_ARCHIVED:
      recipients = toRecipients([owner, ...memberEmails], actor);
      break;

    default:
      recipients = [];
  }

  return {
    wallId,
    postId,
    actorEmail: actor,
    type,
    metadata,
    recipients,
    createdAt: new Date(),
  };
}

module.exports = {
  NOTIFICATION_TYPES,
  NOTIFICATION_STATUSES,
  buildNotification,
  normalizeEmail,
  toRecipients,
};
