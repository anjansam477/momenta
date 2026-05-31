const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { saltRounds } = require("../config/security-config");

const userSchema = new mongoose.Schema(
  {
    firstname: { type: String, required: true, minlength: 1, maxlength: 50, trim: true },
    lastname:  { type: String, default: "", maxlength: 50, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true },
    status:    { type: String, enum: ["pending_verification", "active", "suspended"], default: "pending_verification" },
    profilePictureUrl: { type: String, default: null },
    bio:       { type: String, maxlength: 300, default: "" },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// email unique index defined inline above

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, saltRounds);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);
