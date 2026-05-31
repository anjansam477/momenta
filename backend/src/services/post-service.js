const postRepository = require("../repositories/post-repository");
const wallRepository = require("../repositories/wall-repository");
const Response = require("../utils/error-handler");
const { publishNotification } = require("./notification-event-service");
const { NOTIFICATION_TYPES } = require("../domain/notifications/notification-rules");

class PostService {
  async createPost(postData) {
    const post = await postRepository.addPost(postData);
    await publishNotification(NOTIFICATION_TYPES.POST_ADDED, {
      wallId: postData.wallId,
      email: postData.authorEmail,
    }).catch(() => {});
    return post;
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
    reason = reason || "other";
    const report = await postRepository.reportPost(postId, userEmail, reason);
    await publishNotification(NOTIFICATION_TYPES.POST_REPORTED, {
      wallId,
      postId,
      email: userEmail,
    }).catch(() => {});
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

  async getPostsByEmail(authorEmail, wallId) {
    return postRepository.getPostsByEmail(authorEmail, wallId);
  }
}

module.exports = new PostService();
