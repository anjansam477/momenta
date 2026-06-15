const mongoose = require("mongoose");

const wallSchema = new mongoose.Schema(
  {
    slug:        { type: String, unique: true, required: true, lowercase: true, trim: true },
    title:       { type: String, required: true, minlength: 1, maxlength: 80, trim: true },
    description: { type: String, default: "", maxlength: 500, trim: true },
    ownerEmail:  { type: String, required: true, lowercase: true, trim: true },
    type:        { type: String, required: true, maxlength: 50 },
    status:      { type: String, enum: ["active", "locked", "archived"], default: "active" },
    openDate:    { type: Date, default: null },
    closeDate:   { type: Date, default: null },
    theme: {
      bgImg:       { type: String, default: "assets/images/background_images/Default/default_background.png" },
      animationId: { type: String, default: "" },
      audio:       { type: String, default: "" },
      bgColor:     { type: String, default: "" },       // hex or empty = use bgImg
      fontFamily:  { type: String, default: "" },       // CSS font-family name or empty = default
      textColor:   { type: String, default: "" },       // hex or empty = default theme color
    },
    anyoneCanView: { type: Boolean, default: false },
    anyoneCanPost: { type: Boolean, default: false },
    // Per-wall receiver-link epoch. Receiver view tokens embed the version that
    // was current when minted; bumping this (rotateViewToken) invalidates every
    // previously shared link for THIS wall only, without touching other walls.
    viewTokenVersion: { type: Number, default: 0 },
    postConfig: {
      allowText:       { type: Boolean, default: true },
      allowImage:      { type: Boolean, default: true },
      allowGif:        { type: Boolean, default: true },
      allowVideo:      { type: Boolean, default: true },
      allowSticker:    { type: Boolean, default: true },
      requireApproval: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// slug unique index defined inline above
wallSchema.index({ ownerEmail: 1 });
wallSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Wall", wallSchema);
