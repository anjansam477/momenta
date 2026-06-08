const wallService = require("../services/wall-service");
const analyticsRepository = require('../repositories/analytics-repository');
const reactionsRepository = require("../repositories/reactions-repository");
const authMiddleware = require("../middleware/auth");
const Response = require("../utils/error-handler");
const asyncHandler = require("express-async-handler");

exports.createWall = asyncHandler(async (req, res) => {
  const { title, description, type, openDate, closeDate, theme, anyoneCanView, anyoneCanPost, postConfig } = req.body;
  const wall = await wallService.createWall({
    title,
    description,
    type,
    openDate,
    closeDate,
    theme: theme || {},
    anyoneCanView: anyoneCanView || false,
    anyoneCanPost: anyoneCanPost || false,
    postConfig: postConfig || {},
    ownerEmail: req.email,
  });
  return Response.respondOk(res, wall);
});

exports.updateWall = asyncHandler(async (req, res) => {
  const { wallId } = req.params;
  const updateData = req.body;
  const wall = await wallService.updateWall(wallId, updateData, req.email);
  const hasMemberUpdate = ["maintainerEmails", "viewAccess", "postAccess", "receivers"].some(
    (k) => Object.prototype.hasOwnProperty.call(updateData, k)
  );
  if (hasMemberUpdate) await wallService.setAccess(wallId, updateData, req.email);
  return Response.respondOk(res, wall);
});

exports.deleteWall = asyncHandler(async (req, res) => {
  const { wallId } = req.params;
  await wallService.deleteWall(wallId, req.email);
  return Response.respondOk(res, {
    message: Response.generateMessage(Response.successMessage.DELETE_DOCUMENT, "wall"),
  });
});

exports.getWall = asyncHandler(async (req, res) => {
  const { wallId } = req.params;
  const result = await wallService.getWall(wallId, req.email);
  return Response.respondOk(res, result);
});

exports.getWalls = asyncHandler(async (req, res) => {
  const { emailId, savedEmailId, accessEmailId, recipientEmailId, archivedEmail, page = 1, pageSize, saveType } = req.query;
  const pg = Number(page);
  const ps = Number(pageSize || 10);
  let result;

  if (emailId) result = await wallService.getWallsByAdmin(emailId, pg, ps);
  else if (savedEmailId) result = await wallService.getSavedWalls(savedEmailId, saveType, pg, ps);
  else if (accessEmailId) result = await wallService.getWallsByAccess(accessEmailId, pg, ps);
  else if (recipientEmailId) result = await wallService.getWallsByRecipient(recipientEmailId, pg, ps);
  else if (archivedEmail) result = await wallService.getArchivedWalls(archivedEmail, pg, ps);
  else result = [];

  return Response.respondOk(res, result);
});

exports.getRecentWalls = asyncHandler(async (req, res) => {
  const { emailId } = req.params;
  const walls = await wallService.getRecentWalls(emailId);
  return Response.respondOk(res, walls);
});

exports.saveWall = asyncHandler(async (req, res) => {
  const { wallId, emailId } = req.params;
  const { saveType } = req.query;
  await wallService.saveWall(wallId, emailId, saveType || "saved");
  return Response.respondOk(res, { message: "Wall saved" });
});

exports.removeWall = asyncHandler(async (req, res) => {
  const { wallId, emailId } = req.params;
  const { saveType } = req.query;
  await wallService.unsaveWall(wallId, emailId, saveType || "saved");
  return Response.respondOk(res, {
    message: Response.generateMessage(Response.successMessage.DELETE_DOCUMENT, "saved wall"),
  });
});

exports.viewReceiverWall = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const decoded = authMiddleware.getEmailAndWallIdFromToken(token);
  if (!decoded) return Response.respondError(res, new Error(Response.errorMessage.INVALID_TOKEN));
  const result = await wallService.getWall(decoded.wallId, decoded.email);
  return Response.respondOk(res, result);
});

exports.getWallAnalytics = asyncHandler(async (req, res) => {
  const { wallId } = req.params;
  const { days, from, to } = req.query;
  const filter = { days: parseInt(days) || 30, from, to };
  const [daily, totals, previousTotals] = await Promise.all([
    analyticsRepository.getAnalytics(wallId, filter),
    analyticsRepository.getTotals(wallId),
    analyticsRepository.getPreviousTotals(wallId, filter)
  ]);
  return Response.respondOk(res, { daily, totals, previousTotals });
});

exports.generateInviteLink = asyncHandler(async (req, res) => {
  const { wallId } = req.params;
  const { email, wallTitle } = req.body;
  if (!email) return Response.respondError(res, new Error('Email is required'));
  const token = authMiddleware.generateTokenForReceiver(email, wallId);
  const inviteUrl = `${process.env.UI_BASE_URL}/moment/${wallId}?token=${token}`;
  const inviterName = req.user?.firstname ? `${req.user.firstname} ${req.user.lastname || ''}`.trim() : 'Someone';
  try {
    const mailService = require('../services/mail-service');
    const { emailTemplates } = require('../templates/email-templates');
    const html = emailTemplates.inviteLink({ inviterName, wallTitle: wallTitle || 'a special moment', inviteUrl });
    await mailService._sendDirect({ to: email, subject: `${inviterName} invited you to "${wallTitle || 'a Momenta moment'}"`, html });
  } catch (_) { /* non-blocking — still return token */ }
  return Response.respondOk(res, { token });
});

exports.acceptInvite = asyncHandler(async (req, res) => {
  const { wallId } = req.params;
  const { token } = req.body;
  if (!token) return Response.respondError(res, new Error('Token is required'));
  const decoded = authMiddleware.getEmailAndWallIdFromToken(token);
  if (!decoded || decoded.wallId !== wallId) return Response.respondError(res, new Error('Invalid invite token'));
  const { email } = decoded;
  await wallService.addViewerByInvite(wallId, email);
  return Response.respondOk(res, { message: 'Access granted' });
});
