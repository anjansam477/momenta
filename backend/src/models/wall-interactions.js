const mongoose = require("mongoose");

const wallInteractionSchema = new mongoose.Schema(
  {
    wallId:    { type: mongoose.Schema.Types.ObjectId, ref: "Wall", required: true },
    userEmail: { type: String, required: true, lowercase: true, trim: true },
  },
  { timestamps: true }
);

wallInteractionSchema.index({ wallId: 1, userEmail: 1 }, { unique: true });
wallInteractionSchema.index({ userEmail: 1, updatedAt: -1 });

module.exports = mongoose.model("WallInteraction", wallInteractionSchema);
