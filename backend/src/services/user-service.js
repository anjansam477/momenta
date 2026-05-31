const userRepository = require("../repositories/user-repository");
const { canAccess } = require("../middleware/access-limiter");
const Response = require("../utils/error-handler");

class UserService {
  async registerUser(email, password, fname, lname) {
    const allowed = await canAccess(email);
    if (!allowed) throw new Error(Response.errorMessage.ACCOUNT_BLOCKED);

    const existing = await userRepository.getUserByEmail(email);
    if (existing) throw new Error(Response.errorMessage.ALREADY_REGISTERED);

    const user = await userRepository.createUser(email, password, fname, lname);
    const token = await userRepository.createVerificationToken(user._id, "email_verify");
    return { user, token };
  }

  async loginUser(email, password) {
    const user = await userRepository.getUserForLogin(email);
    if (!user) throw new Error(Response.errorMessage.REGISTER_ERROR);
    if (user.status === "pending_verification") throw new Error(Response.errorMessage.NOT_VERIFIED);
    if (user.status === "suspended") throw new Error(Response.errorMessage.ACCOUNT_BLOCKED);

    const correct = await user.isPasswordCorrect(password);
    if (!correct) throw new Error(Response.errorMessage.INVALID_CREDENTIALS);

    await userRepository.updateLastLogin(user._id);
    return user;
  }

  async verifyEmail(token) {
    const record = await userRepository.findVerificationToken(token, "email_verify");
    if (!record) throw new Error(Response.errorMessage.INVALID_TOKEN);
    await userRepository.activateUser(record.userId);
    await userRepository.deleteVerificationToken(token);
    return true;
  }

  async forgotPassword(email) {
    const user = await userRepository.getUserByEmail(email);
    if (!user) throw new Error(Response.errorMessage.REGISTER_ERROR);
    const token = await userRepository.createVerificationToken(user._id, "password_reset");
    return { user, token };
  }

  async updatePassword(token, newPassword) {
    const record = await userRepository.findVerificationToken(token, "password_reset");
    if (!record) throw new Error(Response.errorMessage.INVALID_TOKEN);
    const user = await userRepository.getUserById(record.userId);
    if (!user) throw new Error(Response.errorMessage.REGISTER_ERROR);
    user.password = newPassword;
    await user.save();
    await userRepository.deleteVerificationToken(token);
    return true;
  }

  async generateVerificationToken(email) {
    const user = await userRepository.getUserByEmail(email);
    if (!user) throw new Error(Response.errorMessage.REGISTER_ERROR);
    if (user.status === "active") throw new Error("User is already verified");
    const token = await userRepository.createVerificationToken(user._id, "email_verify");
    return { user, token };
  }

  async updateUser(userId, updates) {
    return userRepository.updateUser(userId, updates);
  }

  async uploadProfilePicture(userId, url) {
    return userRepository.updateProfilePicture(userId, url);
  }

  async removeProfilePicture(userId) {
    return userRepository.removeProfilePicture(userId);
  }

  async getUserByEmail(email) {
    return userRepository.getUserByEmail(email);
  }

  async getAllUsers() {
    return userRepository.getAllUsers();
  }

  async getUserNamesByEmails(emails) {
    return userRepository.getUserNamesByEmails(emails);
  }

  async searchUsersByName(query) {
    const regex = new RegExp(query, "i");
    return userRepository.searchUsersByName(regex);
  }
}

module.exports = new UserService();
