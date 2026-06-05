const User = require("../models/users");
const VerificationToken = require("../models/verification-tokens");
const crypto = require("crypto");
const { getUserProfilesCache, setUserProfileCache, invalidateUserProfileCache } = require('../utils/redis-cache');

class UserRepository {
  async getAllUsers() {
    return User.find().select("-password").lean();
  }

  async getUserByEmail(email) {
    return User.findOne({ email: email.toLowerCase() });
  }

  async getUserForLogin(email) {
    return User.findOne({ email: email.toLowerCase() });
  }

  async getUserById(userId) {
    return User.findById(userId);
  }

  async getUserNamesByEmails(emails) {
    const { results: cached, misses } = await getUserProfilesCache(emails);
    if (misses.length === 0) return cached;

    const emailArray = misses.map((e) => e.trim().toLowerCase());
    const users = await User.find({ email: { $in: emailArray } })
      .select("email firstname lastname profilePictureUrl")
      .lean();

    const dbResults = users.reduce((map, user) => {
      const profile = {
        email: user.email,
        fullName: [user.firstname, user.lastname].filter(Boolean).join(" ").trim() || user.email,
        profilePicture: user.profilePictureUrl || null,
      };
      map[user.email] = profile;
      setUserProfileCache(user.email, profile); // fire-and-forget
      return map;
    }, {});

    return { ...cached, ...dbResults };
  }

  async searchUsersByName(nameRegex) {
    const users = await User.find({
      $or: [{ email: nameRegex }, { firstname: nameRegex }, { lastname: nameRegex }],
    })
      .select("email firstname lastname profilePictureUrl")
      .lean();
    return users.map((u) => ({
      email: u.email,
      name: [u.firstname, u.lastname].filter(Boolean).join(" ").trim(),
      profilePictureUrl: u.profilePictureUrl,
    }));
  }

  async createUser(email, password, fname, lname) {
    const user = new User({
      email,
      password,
      firstname: fname,
      lastname: lname || "",
      status: "pending_verification",
    });
    await user.save();
    return user;
  }

  async updateUser(userId, updates) {
    const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select("-password");
    if (user?.email) invalidateUserProfileCache(user.email); // fire-and-forget
    return user;
  }

  async deleteUser(userId) {
    return User.findByIdAndDelete(userId);
  }

  async updateProfilePicture(userId, profilePictureUrl) {
    const user = await User.findByIdAndUpdate(userId, { profilePictureUrl }, { new: true }).select("-password");
    if (user?.email) invalidateUserProfileCache(user.email); // fire-and-forget
    return user;
  }

  async removeProfilePicture(userId) {
    const user = await User.findByIdAndUpdate(userId, { profilePictureUrl: null }, { new: true }).select("-password");
    if (user?.email) invalidateUserProfileCache(user.email); // fire-and-forget
    return user;
  }

  async updateLastLogin(userId) {
    return User.findByIdAndUpdate(userId, { lastLoginAt: new Date() });
  }

  // ── Verification tokens ───────────────────────────────────────────────────

  async createVerificationToken(userId, type) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
    await VerificationToken.deleteMany({ userId, type });
    await VerificationToken.create({ userId, token, type, expiresAt });
    return token;
  }

  async findVerificationToken(token, type) {
    return VerificationToken.findOne({ token, type, expiresAt: { $gt: new Date() } });
  }

  async deleteVerificationToken(token) {
    return VerificationToken.deleteOne({ token });
  }

  async activateUser(userId) {
    return User.findByIdAndUpdate(userId, { status: "active" }, { new: true });
  }
}

module.exports = new UserRepository();
