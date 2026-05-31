const mongoose = require("mongoose");

const verificationTokenSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  token:     { type: String, required: true, unique: true },
  type:      { type: String, enum: ["email_verify", "password_reset"], required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// token unique index defined inline above
verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL auto-delete

module.exports = mongoose.model("VerificationToken", verificationTokenSchema);
