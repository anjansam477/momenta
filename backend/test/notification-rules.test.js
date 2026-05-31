const assert = require("node:assert/strict");
const test = require("node:test");

const {
  NOTIFICATION_TYPES,
  addedAccessEmails,
  buildNotification,
  notificationRecipients,
} = require("../src/domain/notifications/notification-rules");

const board = {
  _id: "wall-1",
  title: "Birthday",
  ownerEmail: "owner@example.com",
  maintainerEmails: ["mod@example.com", "OWNER@example.com"],
  receivers: ["receiver@example.com"],
  viewAccess: { emails: ["viewer@example.com"], domains: [] },
  postAccess: { emails: ["poster@example.com"], domains: [] },
};

test("postAdded notifies owner and maintainers except actor, deduped", () => {
  const recipients = notificationRecipients(NOTIFICATION_TYPES.POST_ADDED, {
    board,
    actorEmail: "owner@example.com",
  });

  assert.deepEqual(recipients, [
    { userEmail: "mod@example.com", status: "unread" },
  ]);
});

test("reactionAdded notifies post author except self reactions", () => {
  const recipients = notificationRecipients(NOTIFICATION_TYPES.REACTION_ADDED, {
    board,
    post: { _id: "post-1", email: "author@example.com" },
    actorEmail: "reactor@example.com",
  });
  const selfRecipients = notificationRecipients(NOTIFICATION_TYPES.REACTION_ADDED, {
    board,
    post: { _id: "post-1", email: "reactor@example.com" },
    actorEmail: "reactor@example.com",
  });

  assert.deepEqual(recipients, [
    { userEmail: "author@example.com", status: "unread" },
  ]);
  assert.deepEqual(selfRecipients, []);
});

test("access grant notifications target only newly added emails", () => {
  const before = {
    ...board,
    viewAccess: { emails: ["viewer@example.com"], domains: [] },
  };
  const after = {
    ...board,
    viewAccess: { emails: ["viewer@example.com", "new@example.com"], domains: [] },
    postAccess: { emails: ["poster@example.com", "second@example.com"], domains: [] },
  };

  assert.deepEqual(addedAccessEmails(before, after), ["new@example.com", "second@example.com"]);
});

test("delete notification can use metadata when post was already removed", () => {
  const notification = buildNotification(NOTIFICATION_TYPES.POST_DELETED, {
    board,
    actorEmail: "owner@example.com",
    metadata: { postEmail: "author@example.com" },
  });

  assert.equal(notification.type, NOTIFICATION_TYPES.POST_DELETED);
  assert.deepEqual(notification.sendToEmails, [
    { userEmail: "author@example.com", status: "unread" },
  ]);
});
