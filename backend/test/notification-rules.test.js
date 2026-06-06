const assert = require("node:assert/strict");
const test = require("node:test");

const {
  NOTIFICATION_TYPES,
  NOTIFICATION_STATUSES,
  buildNotification,
  normalizeEmail,
  toRecipients,
} = require("../src/domain/notifications/notification-rules");

const wall = {
  _id: "wall-1",
  title: "Birthday",
  ownerEmail: "owner@example.com",
};

test("normalizeEmail trims and lowercases", () => {
  assert.equal(normalizeEmail("  Owner@Example.COM "), "owner@example.com");
  assert.equal(normalizeEmail(undefined), "");
});

test("toRecipients dedupes, normalizes, and excludes the actor", () => {
  const recipients = toRecipients(
    ["MOD@example.com", "mod@example.com", "owner@example.com", ""],
    "owner@example.com"
  );
  assert.deepEqual(recipients, [
    { userEmail: "mod@example.com", status: NOTIFICATION_STATUSES.UNREAD },
  ]);
});

test("POST_ADDED notifies owner + members except the actor, deduped", () => {
  const notification = buildNotification(NOTIFICATION_TYPES.POST_ADDED, {
    wall,
    memberEmails: ["mod@example.com", "OWNER@example.com"],
    actorEmail: "owner@example.com",
  });

  assert.equal(notification.type, NOTIFICATION_TYPES.POST_ADDED);
  assert.equal(notification.wallId, "wall-1");
  assert.equal(notification.actorEmail, "owner@example.com");
  assert.deepEqual(notification.recipients, [
    { userEmail: "mod@example.com", status: "unread" },
  ]);
});

test("POST_PENDING notifies owner + maintainers except the actor", () => {
  const notification = buildNotification(NOTIFICATION_TYPES.POST_PENDING, {
    wall,
    maintainerEmails: ["mod@example.com"],
    actorEmail: "owner@example.com",
  });
  assert.deepEqual(notification.recipients, [
    { userEmail: "mod@example.com", status: "unread" },
  ]);
});

test("REACTION_ADDED notifies the post author except on self-reactions", () => {
  const toAuthor = buildNotification(NOTIFICATION_TYPES.REACTION_ADDED, {
    wall,
    post: { _id: "post-1", authorEmail: "author@example.com" },
    actorEmail: "reactor@example.com",
  });
  const selfReaction = buildNotification(NOTIFICATION_TYPES.REACTION_ADDED, {
    wall,
    post: { _id: "post-1", authorEmail: "reactor@example.com" },
    actorEmail: "reactor@example.com",
  });

  assert.deepEqual(toAuthor.recipients, [
    { userEmail: "author@example.com", status: "unread" },
  ]);
  assert.deepEqual(selfReaction.recipients, []);
});

test("POST_DELETED falls back to metadata.postEmail when the post is already gone", () => {
  const notification = buildNotification(NOTIFICATION_TYPES.POST_DELETED, {
    wall,
    actorEmail: "owner@example.com",
    metadata: { postEmail: "author@example.com" },
  });

  assert.equal(notification.type, NOTIFICATION_TYPES.POST_DELETED);
  assert.deepEqual(notification.recipients, [
    { userEmail: "author@example.com", status: "unread" },
  ]);
});

test("ACCESS_GRANTED targets only the granted emails from metadata", () => {
  const notification = buildNotification(NOTIFICATION_TYPES.ACCESS_GRANTED, {
    wall,
    actorEmail: "owner@example.com",
    metadata: { grantedEmails: ["new@example.com", "second@example.com"] },
  });
  assert.deepEqual(notification.recipients, [
    { userEmail: "new@example.com", status: "unread" },
    { userEmail: "second@example.com", status: "unread" },
  ]);
});

test("buildNotification rejects unknown notification types", () => {
  assert.throws(
    () => buildNotification("notARealType", { wall }),
    /Unsupported notification type/
  );
});
