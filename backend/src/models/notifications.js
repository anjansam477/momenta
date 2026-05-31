const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  wallId:     { type: mongoose.Schema.Types.ObjectId, ref: "Wall", required: true },
  postId:     { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },
  actorEmail: { type: String, required: true, lowercase: true, trim: true }, // who triggered the action
  type: {
    type: String,
    required: true,
    enum: [
      "postAdded", "postReported", "postUnreported", "postDeleted",
      "reactionAdded", "accessGranted", "wallUpdated",
      "wallLocked", "wallUnlocked", "wallArchived",
    ],
  },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  recipients: [
    {
      userEmail: { type: String, required: true },
      status:    { type: String, enum: ["unread", "read", "archived"], default: "unread" },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

notificationSchema.index({ "recipients.userEmail": 1, createdAt: -1 }); // CRITICAL — was missing before
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 * 24 * 30 }); // TTL 30 days

module.exports = mongoose.model("Notification", notificationSchema);
