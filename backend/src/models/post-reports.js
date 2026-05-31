const mongoose = require("mongoose");

const postReportSchema = new mongoose.Schema(
  {
    postId:     { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    reportedBy: { type: String, required: true, lowercase: true, trim: true },
    reason:     { type: String, enum: ["spam", "offensive", "inappropriate", "other"], required: true },
    note:       { type: String, maxlength: 500, default: "" },
    status:     { type: String, enum: ["open", "dismissed", "actioned"], default: "open" },
    reviewedBy: { type: String, default: null },
  },
  { timestamps: true }
);

postReportSchema.index({ postId: 1, reportedBy: 1 }, { unique: true }); // one report per user per post
postReportSchema.index({ status: 1, createdAt: -1 }); // moderation queue

module.exports = mongoose.model("PostReport", postReportSchema);
