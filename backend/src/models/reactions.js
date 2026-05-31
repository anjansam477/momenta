const mongoose = require("mongoose");

const reactionSchema = new mongoose.Schema(
  {
    postId:    { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    userEmail: { type: String, required: true, lowercase: true, trim: true },
    type:      { type: String, enum: ["heart", "like", "laugh", "wow", "sad", "celebrate"], required: true },
  },
  { timestamps: true }
);

reactionSchema.index({ postId: 1, userEmail: 1, type: 1 }, { unique: true }); // atomic upsert, no dupe reactions
reactionSchema.index({ postId: 1 });

module.exports = mongoose.model("Reaction", reactionSchema);
