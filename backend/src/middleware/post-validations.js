const asyncHandler = require("express-async-handler");
const Response = require("../utils/error-handler");
const wallRepository = require("../repositories/wall-repository");
const postRepository = require("../repositories/post-repository");
const auth = require("../middleware/auth");

// Resolve caller email from Bearer or View token
function resolveEmail(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.split(" ")[1];
  if (!token) return null;
  if (authHeader.startsWith("View")) {
    return auth.getEmailAndWallIdFromToken(token)?.email || null;
  }
  return auth.getEmailFromToken(token);
}

exports.authorizePost = asyncHandler(async (req, res, next) => {
  const { wallId } = req.params;
  const email = resolveEmail(req);
  if (!email) return Response.respondError(res, new Error("Authorization token is missing."));

  try {
    const wall = await wallRepository.getWallById(wallId);
    const hasAccess = wall.anyoneCanView || wall.anyoneCanPost || await wallRepository.hasAccess(wallId, email);
    if (!hasAccess) throw new Error(Response.generateMessage(Response.errorMessage.NO_ACCESS, "wall"));

    req.wall = wall;
    req.email = email;
    next();
  } catch (err) {
    return Response.respondError(res, err);
  }
});

exports.checkArchive = asyncHandler(async (req, res, next) => {
  const wall = req.wall;
  if (wall?.status === "archived") {
    return Response.respondError(res, new Error(Response.generateMessage(Response.errorMessage.DATA_ARCHIVED, "wall")));
  }
  next();
});

exports.validateWall = asyncHandler(async (req, res, next) => {
  const wall = req.wall;
  try {
    if (!wall) throw new Error(Response.generateMessage(Response.errorMessage.INVALID_REQUEST, "wall"));
    if (wall.status === "archived") throw new Error(Response.generateMessage(Response.errorMessage.DATA_ARCHIVED, "wall"));
    if (wall.status === "locked")   throw new Error("This moment is locked.");
    next();
  } catch (err) {
    return Response.respondError(res, err);
  }
});

exports.authorizePostAction = asyncHandler(async (req, res, next) => {
  const { wallId, postId } = req.params;
  const email = resolveEmail(req);
  if (!email) return Response.respondError(res, new Error("Authorization token is missing."));

  try {
    const wall = await wallRepository.getWallById(wallId);
    const role = await wallRepository.getUserRole(wallId, email);
    const canPost = wall.anyoneCanPost || ["owner", "maintainer", "poster"].includes(role);

    if (!canPost) throw new Error(Response.generateMessage(Response.errorMessage.NO_ACCESS, "post"));

    const post = postId ? await postRepository.getPostById(postId).catch(() => null) : null;
    if (postId && !post) throw new Error(Response.generateMessage(Response.errorMessage.INVALID_REQUEST, "post"));

    req.wall  = wall;
    req.email = email;
    req.role  = role;

    if (req.method === "DELETE" && post) {
      const canDelete = post.authorEmail === email || ["owner", "maintainer"].includes(role);
      if (!canDelete) throw new Error(Response.generateMessage(Response.errorMessage.NO_ACCESS, "post"));
      req.post = post;
    } else if (req.method === "PUT" && post) {
      if (post.authorEmail !== email) throw new Error(Response.generateMessage(Response.errorMessage.NO_ACCESS, "post"));
      req.post = post;
    }

    next();
  } catch (err) {
    return Response.respondError(res, err);
  }
});

exports.authorizeApproval = asyncHandler(async (req, res, next) => {
  const { wallId } = req.params;
  const email = resolveEmail(req);
  if (!email) return Response.respondError(res, new Error("Authorization token is missing."));
  try {
    const role = await wallRepository.getUserRole(wallId, email);
    if (!["owner", "maintainer"].includes(role)) {
      throw new Error(Response.generateMessage(Response.errorMessage.NO_ACCESS, "wall"));
    }
    req.email = email;
    next();
  } catch (err) {
    return Response.respondError(res, err);
  }
});

exports.authorizePinPost = asyncHandler(async (req, res, next) => {
  const { wallId } = req.params;
  const email = resolveEmail(req);
  if (!email) return Response.respondError(res, new Error("Authorization token is missing."));
  try {
    const role = await wallRepository.getUserRole(wallId, email);
    if (!["owner", "maintainer"].includes(role)) {
      throw new Error(Response.generateMessage(Response.errorMessage.NO_ACCESS, "post"));
    }
    req.email = email;
    next();
  } catch (err) {
    return Response.respondError(res, err);
  }
});

exports.authorizeUnreportPost = asyncHandler(async (req, res, next) => {
  const { wallId } = req.params;
  const email = resolveEmail(req);
  if (!email) return Response.respondError(res, new Error("Authorization token is missing."));

  try {
    const role = await wallRepository.getUserRole(wallId, email);
    if (!["owner", "maintainer"].includes(role)) {
      throw new Error(Response.generateMessage(Response.errorMessage.NO_ACCESS, "wall"));
    }
    req.email = email;
    next();
  } catch (err) {
    return Response.respondError(res, err);
  }
});
