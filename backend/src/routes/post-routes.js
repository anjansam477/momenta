const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const postsController = require("../controllers/post-controller");
const { upload } = require("../config/upload-config");
const { authorizePost, validateWall, checkArchive, authorizePostAction, authorizeUnreportPost, authorizeApproval, authorizePinPost, validatePostContent } = require("../middleware/post-validations");
const { idempotencyCheck } = require("../middleware/idempotency");
const { postWriteLimiter, reactionLimiter } = require("../middleware/rate-limiter");

// Specific routes before param routes
router.get("/:wallId/posts/pending",           verifyToken, authorizeApproval, postsController.getPendingPosts);
router.put("/:wallId/posts/:postId/approve",   verifyToken, authorizeApproval, postsController.approvePost);
router.put("/:wallId/posts/:postId/reject",    verifyToken, authorizeApproval, postsController.rejectPost);
router.get("/:wallId/posts/mail",              verifyToken, authorizePost, checkArchive, postsController.getPostsByEmail);
router.get("/:wallId/posts/:postId",           verifyToken, authorizePost, checkArchive, postsController.getPost);
router.get("/:wallId/posts",                   verifyToken, authorizePost, checkArchive, postsController.getPosts);
router.post("/:wallId/posts",                  verifyToken, postWriteLimiter, idempotencyCheck, authorizePostAction, validateWall, upload.single("file"), validatePostContent, postsController.createPost);
router.put("/:wallId/posts/:postId",           verifyToken, authorizePostAction, validateWall, postsController.updatePost);
router.delete("/:wallId/posts/:postId",        verifyToken, authorizePostAction, postsController.deletePost);
router.put("/:wallId/posts/:postId/pin",        verifyToken, authorizePinPost, postsController.pinPost);
router.put("/:wallId/posts/:postId/report",    verifyToken, authorizePost, validateWall, postsController.reportPost);
router.put("/:wallId/posts/:postId/unreport",  verifyToken, authorizeUnreportPost, validateWall, postsController.unreportPost);
router.post("/:wallId/posts/:postId/react/:reactionType",   verifyToken, reactionLimiter, authorizePost, validateWall, postsController.addReaction);
router.delete("/:wallId/posts/:postId/react/:reactionType", verifyToken, authorizePost, validateWall, postsController.removeReaction);

module.exports = router;
