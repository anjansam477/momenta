const postService = require("../services/post-service");
const reactionsRepository = require("../repositories/reactions-repository");
const Response = require("../utils/error-handler");
const asyncHandler = require("express-async-handler");
const { normalizePostCreatePayload, normalizePostUpdatePayload } = require("../domain/posts/post-rules");

exports.createPost = asyncHandler(async (req, res) => {
  const { wallId } = req.params;
  const { content, firstName, lastName, mediaType } = req.body;
  const file = req.file;

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
  const { page = 1, pageSize } = req.query;
  const posts = await postService.getPosts(wallId, Number(page), Number(pageSize || 20));
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
