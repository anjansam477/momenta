const postRepository = require("../repositories/post-repository");
const analyticsRepository = require('../repositories/analytics-repository');
const wallRepository = require("../repositories/wall-repository");
const Response = require("../utils/error-handler");
const { publishNotification } = require("./notification-event-service");
const { NOTIFICATION_TYPES } = require("../domain/notifications/notification-rules");

class PostService {
  async createPost(postData, wall) {
    const requiresApproval = wall?.postConfig?.requireApproval;
    const status = requiresApproval ? "pending_approval" : "active";
    const post = await postRepository.addPost({ ...postData, status });
    analyticsRepository.incrementPost(postData.wallId).catch(() => {});
    if (!requiresApproval) {
      await publishNotification(NOTIFICATION_TYPES.POST_ADDED, {
        wallId: postData.wallId,
        email: postData.authorEmail,
      }).catch(() => {});
    }
    return post;
  }

  async getPendingPosts(wallId) {
    return postRepository.getPendingPosts(wallId);
  }

  async approvePost(postId, wallId, reviewerEmail) {
    const post = await postRepository.approvePost(postId);
    await publishNotification(NOTIFICATION_TYPES.POST_ADDED, {
      wallId,
      email: reviewerEmail,
    }).catch(() => {});
    return post;
  }

  async rejectPost(postId) {
    return postRepository.rejectPost(postId);
  }

  async updatePost(postId, updates, userEmail) {
    return postRepository.updatePostById(postId, updates);
  }

  async deletePost(postId, wallId, userEmail) {
    const post = await postRepository.deletePost(postId);
    await publishNotification(NOTIFICATION_TYPES.POST_DELETED, {
      wallId,
      email: userEmail,
      postId,
    }).catch(() => {});
    return post;
  }

  async reportPost(postId, wallId, userEmail, reason) {
    const REPORT_THRESHOLD = 3;
    reason = reason || "other";
    const report = await postRepository.reportPost(postId, userEmail, reason);
    const openCount = await postRepository.getOpenReportCount(postId);

    if (openCount >= REPORT_THRESHOLD) {
      // Fire threshold notification only once — when count exactly hits threshold
      if (openCount === REPORT_THRESHOLD) {
        await publishNotification(NOTIFICATION_TYPES.POST_REPORT_THRESHOLD, {
          wallId,
          postId,
          email: userEmail,
          metadata: { reportCount: openCount },
        }).catch(() => {});
      }
    } else {
      await publishNotification(NOTIFICATION_TYPES.POST_REPORTED, {
        wallId,
        postId,
        email: userEmail,
      }).catch(() => {});
    }
    return report;
  }

  async unreportPost(postId, wallId, userEmail) {
    const report = await postRepository.unreportPost(postId, userEmail);
    await publishNotification(NOTIFICATION_TYPES.POST_UNREPORTED, {
      wallId,
      postId,
      email: userEmail,
    }).catch(() => {});
    return report;
  }

  async getPosts(wallId, page, pageSize) {
    return postRepository.getPostsByWallId(wallId, page, pageSize);
  }

  async getPost(postId) {
    return postRepository.getPostById(postId);
  }

  async pinPost(postId, wallId, pinned) {
    const MAX_PINS = 3;
    if (pinned) {
      const count = await postRepository.getPinnedCount(wallId);
      if (count >= MAX_PINS) {
        throw new Error(`You can pin at most ${MAX_PINS} posts per wall.`);
      }
    }
    return postRepository.pinPost(postId, pinned);
  }

  async getPostsByEmail(authorEmail, wallId) {
    return postRepository.getPostsByEmail(authorEmail, wallId);
  }
}

module.exports = new PostService();
