const mongoose = require("mongoose");

const mailJobSchema = new mongoose.Schema(
  {
    type:    { type: String, enum: ["REGISTER", "PASSWORD", "SCHEDULE", "ACCESS"], required: true },
    wallId:  { type: mongoose.Schema.Types.ObjectId, ref: "Wall", default: null },
    recipients: {
      primary: { type: [String], default: [] },
      cc:      { type: [String], default: [] },
    },
    scheduledAt:  { type: Date, default: null },
    status:       { type: String, enum: ["pending", "sent", "failed", "cancelled"], default: "pending" },
    sentAt:       { type: Date, default: null },
    error:        { type: String, default: null },
    retryCount:   { type: Number, default: 0 },
    maxRetries:   { type: Number, default: 3 },
  },
  { timestamps: true }
);

mailJobSchema.index({ status: 1, scheduledAt: 1 });
mailJobSchema.index({ wallId: 1 });

module.exports = mongoose.model("MailJob", mailJobSchema);
