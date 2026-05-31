const mongoose = require("mongoose");
const { POST_CONTENT_MAX_LENGTH, POST_AUTHOR_NAME_MAX_LENGTH } = require("../domain/posts/post-rules");

const postSchema = new mongoose.Schema(
  {
    wallId: { type: mongoose.Schema.Types.ObjectId, ref: "Wall", required: true },
    authorEmail: { type: String, required: true, lowercase: true, trim: true },
    authorName: {
      first: { type: String, required: true, maxlength: POST_AUTHOR_NAME_MAX_LENGTH },
      last:  { type: String, default: "", maxlength: POST_AUTHOR_NAME_MAX_LENGTH },
    },
    content:  { type: String, maxlength: POST_CONTENT_MAX_LENGTH, default: "" },
    media: {
      url:          { type: String, default: null },
      type:         { type: String, enum: ["image", "gif", "video", "sticker", null], default: null },
      thumbnailUrl: { type: String, default: null },
    },
    status:   { type: String, enum: ["active", "pending_approval", "rejected", "deleted"], default: "active" },
    pinned:   { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

postSchema.index({ wallId: 1, status: 1, createdAt: 1 });
postSchema.index({ authorEmail: 1 });

module.exports = mongoose.model("Post", postSchema);
