const mongoose = require("mongoose");

const wallMemberSchema = new mongoose.Schema(
  {
    wallId:    { type: mongoose.Schema.Types.ObjectId, ref: "Wall", required: true },
    userEmail: { type: String, required: true, lowercase: true, trim: true },
    role:      { type: String, enum: ["owner", "maintainer", "poster", "viewer", "recipient"], required: true },
    domain:    { type: String, default: null }, // set if access granted by domain, null if by email
    addedBy:   { type: String, default: null },
  },
  { timestamps: true }
);

wallMemberSchema.index({ wallId: 1, userEmail: 1, role: 1 }, { unique: true });
wallMemberSchema.index({ userEmail: 1, role: 1 });
wallMemberSchema.index({ wallId: 1, role: 1 });
wallMemberSchema.index({ wallId: 1, domain: 1 });

module.exports = mongoose.model("WallMember", wallMemberSchema);
