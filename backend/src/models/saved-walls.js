const mongoose = require("mongoose");

const savedWallSchema = new mongoose.Schema(
  {
    wallId:    { type: mongoose.Schema.Types.ObjectId, ref: "Wall", required: true },
    userEmail: { type: String, required: true, lowercase: true, trim: true },
    type:      { type: String, enum: ["saved", "favourite"], required: true },
  },
  { timestamps: true }
);

savedWallSchema.index({ wallId: 1, userEmail: 1, type: 1 }, { unique: true });
savedWallSchema.index({ userEmail: 1, type: 1 });

module.exports = mongoose.model("SavedWall", savedWallSchema);
