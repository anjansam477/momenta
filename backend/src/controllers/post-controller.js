const postService = require("../services/post-service");
const reactionsRepository = require("../repositories/reactions-repository");
const Response = require("../utils/error-handler");
const asyncHandler = require("express-async-handler");
const { normalizePostCreatePayload, normalizePostUpdatePayload } = require("../domain/posts/post-rules");
const { compressImageInPlace } = require("../utils/image-compressor");
const { generateWebpVariants } = require("../utils/image-variants");

exports.createPost = asyncHandler(async (req, res) => {
  const { wallId } = req.params;
  const { content, firstName, lastName, mediaType } = req.body;
  const file = req.file;

  // Post images are uploaded via this route's multer middleware (not the
  // /uploads endpoint), so compress + emit responsive WebP variants here.
  // Best-effort; both no-op for gif/video.
  if (file && file.path) {
    await compressImageInPlace(file.path, file.mimetype);
    await generateWebpVariants(file.path, file.mimetype);
  }

  const normalized = normalizePostCreatePayload({
    content,
    firstName,
    lastName,
    file,
    email: req.email,
  });

  const post = await postService.createPost({
    wallId: wallId,
    authorEmail: req.email,
    authorName: { first: normalized.firstName, last: normalized.lastName },
    content: normalized.content,
    media: file ? { url: file.path || file.filename, type: mediaType || "image" } : undefined,
  }, req.wall);
  return Response.respondOk(res, post);
});

exports.updatePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const current = await postService.getPost(postId);
  const updates = normalizePostUpdatePayload(req.body, req.email, current);
  if (updates.firstName || updates.lastName) {
    updates.authorName = {
      first: updates.firstName || (current.authorName && current.authorName.first),
      last: updates.lastName || (current.authorName && current.authorName.last),
    };
    delete updates.firstName;
    delete updates.lastName;
  }
  const post = await postService.updatePost(postId, updates, req.email);
  return Response.respondOk(res, post);
});

exports.deletePost = asyncHandler(async (req, res) => {
  const { wallId, postId } = req.params;
  const post = await postService.deletePost(postId, wallId, req.email);
  return Response.respondOk(res, post);
});

exports.reportPost = asyncHandler(async (req, res) => {
  const { wallId, postId } = req.params;
  const { reason } = req.body;
  await postService.reportPost(postId, wallId, req.email, reason || "other");
  return Response.respondOk(res, {
    message: Response.generateMessage(Response.successMessage.DOCUMENT_UPDATED, "post"),
  });
});

exports.unreportPost = asyncHandler(async (req, res) => {
  const { wallId, postId } = req.params;
  await postService.unreportPost(postId, wallId, req.email);
  const post = await postService.getPost(postId);
  return Response.respondOk(res, post);
});

exports.addReaction = asyncHandler(async (req, res) => {
  const { postId, reactionType } = req.params;
  await reactionsRepository.create(req.email, postId, reactionType);
  const post = await postService.getPost(postId);
  return Response.respondOk(res, post);
});

exports.removeReaction = asyncHandler(async (req, res) => {
  const { postId, reactionType } = req.params;
  await reactionsRepository.delete(req.email, postId, reactionType);
  const post = await postService.getPost(postId);
  return Response.respondOk(res, post);
});

exports.getPosts = asyncHandler(async (req, res) => {
  const { wallId } = req.params;
  const { page, pageSize, cursor, limit } = req.query;

  // Cursor mode (the wall feed): triggered by `limit` or `cursor`. Returns
  // { posts, nextCursor, hasMore }. Pinned posts ride the first page.
  if (cursor !== undefined || limit !== undefined) {
    const result = await postService.getPostsPage(wallId, {
      cursor: cursor || null,
      limit: Math.min(Number(limit || pageSize || 20) || 20, 50),
    });
    return Response.respondOk(res, result);
  }

  // Legacy offset mode (slideshow / "fetch all") — returns an array.
  const posts = await postService.getPosts(wallId, Number(page || 1), Number(pageSize || 20));
  return Response.respondOk(res, posts);
});

exports.getPostsByEmail = asyncHandler(async (req, res) => {
  const { wallId } = req.params;
  const posts = await postService.getPostsByEmail(req.email, wallId);
  return Response.respondOk(res, posts);
});

exports.getPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const post = await postService.getPost(postId);
  return Response.respondOk(res, post);
});

exports.getPendingPosts = asyncHandler(async (req, res) => {
  const { wallId } = req.params;
  const posts = await postService.getPendingPosts(wallId);
  return Response.respondOk(res, posts);
});

exports.approvePost = asyncHandler(async (req, res) => {
  const { wallId, postId } = req.params;
  const post = await postService.approvePost(postId, wallId, req.email);
  return Response.respondOk(res, post);
});

exports.rejectPost = asyncHandler(async (req, res) => {
  const { wallId, postId } = req.params;
  const post = await postService.rejectPost(postId, wallId, req.email);
  return Response.respondOk(res, post);
});

exports.pinPost = asyncHandler(async (req, res) => {
  const { wallId, postId } = req.params;
  const { pinned } = req.body;
  const post = await postService.pinPost(postId, wallId, !!pinned);
  return Response.respondOk(res, post);
});
