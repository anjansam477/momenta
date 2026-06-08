const asyncHandler = require("express-async-handler");
const Response = require("../utils/error-handler");
const wallRepository = require("../repositories/wall-repository");
const User = require("../models/users");
const auth = require("../middleware/auth");

exports.validateWallData = asyncHandler(async (req, res, next) => {
  const { title, description, type } = req.body;

  try {
    if (!title || !description || !type) {
      throw new Error(Response.generateMessage(Response.errorMessage.PARAMS_REQUIRED, "title, description, and type are"));
    }
    if (typeof title !== "string" || title.length < 1 || title.length > 80) {
      throw new Error(Response.generateLengthError(Response.errorMessage.LENGTH_NOT_ALLOWED, "1-80", "wall title"));
    }
    if (typeof type !== "string" || type.length < 1 || type.length > 50) {
      throw new Error(Response.generateLengthError(Response.errorMessage.LENGTH_NOT_ALLOWED, "1-50", "wall type"));
    }
    if (typeof description !== "string" || description.length > 500) {
      throw new Error(Response.generateLengthError(Response.errorMessage.LENGTH_NOT_ALLOWED, "0-500", "wall description"));
    }
    next();
  } catch (err) {
    return Response.respondError(res, err);
  }
});

exports.validateWallUpdate = asyncHandler(async (req, res, next) => {
  const { wallId } = req.params;
  const updateData = req.body;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return Response.respondError(res, new Error("Authorization token is missing."));

  let userEmail;
  try {
    userEmail = auth.getEmailFromToken(token);
  } catch {
    return Response.respondError(res, new Error("Invalid or expired token."));
  }

  try {
    const wall = await wallRepository.getWallById(wallId);
    if (wall.status === "archived") {
      throw new Error(Response.generateMessage(Response.errorMessage.DATA_ARCHIVED, "wall"));
    }

    const role = await wallRepository.getUserRole(wallId, userEmail);
    if (!["owner", "maintainer"].includes(role)) {
      throw new Error(Response.errorMessage.USER_UNAUTHORIZED);
    }

    if (updateData.status !== undefined) {
      if (!["active", "locked"].includes(updateData.status)) {
        throw new Error("Invalid status. Use 'active' or 'locked'.");
      }
    }

    if (updateData.title !== undefined) {
      if (typeof updateData.title !== "string" || updateData.title.trim() === "" || updateData.title.length > 80) {
        throw new Error(Response.generateLengthError(Response.errorMessage.LENGTH_NOT_ALLOWED, "1-80", "wall title"));
      }
    }
    if (updateData.description !== undefined) {
      if (typeof updateData.description !== "string" || updateData.description.length > 500) {
        throw new Error(Response.generateLengthError(Response.errorMessage.LENGTH_NOT_ALLOWED, "0-500", "wall description"));
      }
    }

    req.wall = wall;
    req.email = userEmail;
    next();
  } catch (err) {
    return Response.respondError(res, err);
  }
});

exports.validateWallDeletion = asyncHandler(async (req, res, next) => {
  const { wallId } = req.params;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return Response.respondError(res, new Error("Authorization token is missing."));

  let userEmail;
  try {
    userEmail = auth.getEmailFromToken(token);
  } catch {
    return Response.respondError(res, new Error("Invalid or expired token."));
  }

  try {
    const wall = await wallRepository.getWallById(wallId);
    const role = await wallRepository.getUserRole(wallId, userEmail);
    if (!["owner", "maintainer"].includes(role)) {
      throw new Error(Response.errorMessage.USER_UNAUTHORIZED);
    }
    req.wall = wall;
    req.email = userEmail;
    next();
  } catch (err) {
    return Response.respondError(res, err);
  }
});

exports.validateGetWalls = asyncHandler(async (req, res, next) => {
  const { emailId, recipientEmailId, savedEmailId, accessEmailId, archivedEmail } = req.query;
  const emailParams = [emailId, recipientEmailId, savedEmailId, accessEmailId, archivedEmail].filter(Boolean);

  try {
    if (emailParams.length > 1) throw new Error(Response.errorMessage.MULTIPLE_EMAILS_PROVIDED);
    if (emailParams.length === 0) throw new Error(Response.errorMessage.NO_EMAIL_PROVIDED);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailParams[0])) throw new Error("Invalid email format.");
    next();
  } catch (err) {
    return Response.respondError(res, err);
  }
});

exports.validateSaveParams = asyncHandler(async (req, res, next) => {
  const { wallId, emailId } = req.params;
  const { saveType: type } = req.query;

  try {
    if (!wallId || !emailId || !type) {
      throw new Error(Response.generateMessage(Response.errorMessage.PARAMS_REQUIRED, "Wall ID, Email, and Type are"));
    }
    if (!["saved", "favourite"].includes(type)) {
      throw new Error("Invalid save type. Use 'saved' or 'favourite'.");
    }
    const wall = await wallRepository.getWallById(wallId);
    const user = await User.findOne({ email: emailId.toLowerCase() }).lean();
    if (!user) throw new Error(Response.generateMessage(Response.errorMessage.INVALID_REQUEST, "user"));
    req.wall = wall;
    req.saveType = type;
    next();
  } catch (err) {
    return Response.respondError(res, err);
  }
});
