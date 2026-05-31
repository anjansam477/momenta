const userService = require("../services/user-service");
const authMiddleware = require("../middleware/auth");
const mailService = require("../services/mail-service");
const Response = require("../utils/error-handler");
const asyncHandler = require("express-async-handler");

exports.userSignup = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  const { user, token } = await userService.registerUser(email, password, firstName, lastName);
  await mailService.sendVerificationEmail(user, token).catch(() => {});
  return Response.respondOk(res, { message: Response.successMessage.REGISTER_SUCCESS });
});

exports.userLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await userService.loginUser(email, password);
  const token = authMiddleware.generateToken(user.email);
  return Response.respondOk(res, {
    token,
    email: user.email,
    firstName: user.firstname,
    lastName: user.lastname,
    profilePictureUrl: user.profilePictureUrl,
  });
});

exports.verifyUserEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  await userService.verifyEmail(token);
  return Response.respondOk(res, { message: Response.successMessage.VERIFY_EMAIL });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { user, token } = await userService.forgotPassword(email);
  await mailService.sendPasswordResetEmail(user, token).catch(() => {});
  return Response.respondOk(res, { message: Response.successMessage.RESET_PASSWORD_MAIL_SENT });
});

exports.updatePassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  await userService.updatePassword(token, password);
  return Response.respondOk(res, { message: Response.successMessage.RESET_PASSWORD });
});

exports.generateVerificationToken = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { user, token } = await userService.generateVerificationToken(email);
  await mailService.sendVerificationEmail(user, token).catch(() => {});
  return Response.respondOk(res, {
    message: Response.generateMessage(Response.successMessage.SEND_VERIFICATION_MAIL, "Verification"),
  });
});

exports.getUsers = asyncHandler(async (req, res) => {
  const users = await userService.getAllUsers();
  return Response.respondOk(res, users);
});

exports.getUserByEmail = asyncHandler(async (req, res) => {
  const user = await userService.getUserByEmail(req.params.email);
  if (!user) return Response.respondError(res, new Error(Response.errorMessage.REGISTER_ERROR));
  const safeUser = user.toObject ? user.toObject() : Object.assign({}, user);
  delete safeUser.password;
  return Response.respondOk(res, safeUser);
});

exports.getUserNames = asyncHandler(async (req, res) => {
  const emails = Array.isArray(req.query.emails)
    ? req.query.emails
    : req.query.emails
    ? req.query.emails.split(",").map((e) => e.trim())
    : [];
  const names = await userService.getUserNamesByEmails(emails.filter(Boolean));
  return Response.respondOk(res, names);
});

exports.searchUserNames = asyncHandler(async (req, res) => {
  const results = await userService.searchUsersByName(req.query.q || "");
  return Response.respondOk(res, results);
});

exports.updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.userId, req.body);
  return Response.respondOk(res, user);
});

exports.uploadProfilePicture = asyncHandler(async (req, res) => {
  if (!req.file)
    return Response.respondError(
      res,
      new Error(Response.generateMessage(Response.errorMessage.PARAMS_REQUIRED, "file"))
    );
  const url = req.file.path || req.file.filename;
  const user = await userService.uploadProfilePicture(req.params.userId, url);
  return Response.respondOk(res, user);
});

exports.removeProfilePicture = asyncHandler(async (req, res) => {
  const user = await userService.removeProfilePicture(req.params.userId);
  return Response.respondOk(res, user);
});

exports.deleteUser = asyncHandler(async (req, res) => {
  await userService.updateUser(req.params.id, { status: "suspended" });
  return Response.respondOk(res, {
    message: Response.generateMessage(Response.successMessage.DELETE_DOCUMENT, "user"),
  });
});
