const Post = require("../models/posts");
const Reaction = require("../models/reactions");
const PostReport = require("../models/post-reports");
const WallInteraction = require("../models/wall-interactions");
const counterCache = require("../utils/counter-cache");
const Response = require("../utils/error-handler");

class PostRepository {
  async addPost(postData) {
    const post = new Post(postData);
    await post.save();
    await WallInteraction.findOneAndUpdate(
      { wallId: postData.wallId, userEmail: postData.authorEmail },
      { $set: { updatedAt: new Date() } },
      { upsert: true }
    );
    await counterCache.incrPostCount(postData.wallId).catch(() => {});
    return { ...post.toObject(), reactions: {} };
  }

  async getPostById(postId) {
    const post = await Post.findById(postId);
    if (!post) throw new Error(Response.generateMessage(Response.errorMessage.INVALID_REQUEST, "post"));
    const reactions = await Reaction.find({ postId: post._id }).lean();
    const reports = await PostReport.countDocuments({ postId: post._id, status: "open" });
    return { ...post.toObject(), reactions: this._groupReactions(reactions), openReportCount: reports };
  }

  async updatePostById(postId, updates) {
    const post = await Post.findByIdAndUpdate(
      postId,
      { ...updates, isEdited: true, editedAt: new Date() },
      { new: true }
    );
    if (!post) throw new Error(Response.generateMessage(Response.errorMessage.INVALID_REQUEST, "post"));
    const reactions = await Reaction.find({ postId: post._id }).lean();
    return { ...post.toObject(), reactions: this._groupReactions(reactions) };
  }

  async getPostsByWallId(wallId, page, pageSize) {
    const query = { wallId, status: "active" };
    const postsQuery = Post.find(query).sort({ pinned: -1, createdAt: 1 }).lean();
    if (page !== null) postsQuery.skip((page - 1) * pageSize).limit(pageSize);
    const posts = await postsQuery.exec();
    if (!posts.length) return [];

    const postIds = posts.map((p) => p._id);
    const allReactions = await Reaction.find({ postId: { $in: postIds } }).lean();
    const reactionsByPost = allReactions.reduce((acc, r) => {
      const pid = r.postId.toString();
      if (!acc[pid]) acc[pid] = {};
      if (!acc[pid][r.type]) acc[pid][r.type] = [];
      acc[pid][r.type].push(r.userEmail);
      return acc;
    }, {});

    return posts.map((p) => ({ ...p, reactions: reactionsByPost[p._id.toString()] || {} }));
  }

  async deletePost(postId) {
    const post = await Post.findByIdAndUpdate(postId, { status: "deleted" }, { new: true });
    if (!post) throw new Error(Response.generateMessage(Response.errorMessage.INVALID_REQUEST, "post"));
    await counterCache.decrPostCount(post.wallId).catch(() => {});
    return post;
  }

  async getPostsByEmail(authorEmail, wallId) {
    return Post.find({ authorEmail, wallId, status: { $ne: "deleted" } }).lean();
  }

  async getPostCounts(wallId) {
    const cached = await counterCache.getPostCount(wallId).catch(() => null);
    if (cached !== null) {
      return { nonArchivedCount: cached, nonArchivedNonReportedCount: cached };
    }
    const [result] = await Post.aggregate([
      { $match: { wallId, status: "active" } },
      {
        $facet: {
          total: [{ $count: "count" }],
          reported: [
            {
              $lookup: {
                from: "postreports",
                localField: "_id",
                foreignField: "postId",
                as: "reports",
              },
            },
            { $match: { "reports.status": { $ne: "open" } } },
            { $count: "count" },
          ],
        },
      },
    ]);
    const total = result?.total[0]?.count || 0;
    const unreported = result?.reported[0]?.count || total;
    await counterCache.setPostCount(wallId, total).catch(() => {});
    return { nonArchivedCount: total, nonArchivedNonReportedCount: unreported };
  }

  async reportPost(postId, reportedBy, reason = "other") {
    return PostReport.findOneAndUpdate(
      { postId, reportedBy },
      { $set: { reason, status: "open" } },
      { upsert: true, new: true }
    );
  }

  async unreportPost(postId, reportedBy) {
    return PostReport.findOneAndUpdate(
      { postId, reportedBy },
      { $set: { status: "dismissed" } },
      { new: true }
    );
  }

  async getOpenReportCount(postId) {
    return PostReport.countDocuments({ postId, status: "open" });
  }

  _groupReactions(reactions) {
    return reactions.reduce((acc, r) => {
      if (!acc[r.type]) acc[r.type] = [];
      acc[r.type].push(r.userEmail);
      return acc;
    }, {});
  }
}

module.exports = new PostRepository();
