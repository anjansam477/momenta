const Reaction = require("../models/reactions");
const Post = require("../models/posts");
const counterCache = require("../utils/counter-cache");
const Response = require("../utils/error-handler");

class ReactionRepository {
  async create(userEmail, postId, reactionType) {
    const post = await Post.findById(postId);
    if (!post) throw new Error(Response.generateMessage(Response.errorMessage.INVALID_REQUEST, "post"));

    try {
      const reaction = await Reaction.create({ userEmail, postId, type: reactionType });
      // Counter is bumped only on a genuine insert, so it can't double-count.
      await counterCache.incrReaction(postId, reactionType).catch(() => {});
      return reaction;
    } catch (err) {
      // Unique index (postId,userEmail,type): a concurrent/duplicate reaction.
      // Treat as idempotent — return the existing one without re-counting.
      if (err && err.code === 11000) {
        return Reaction.findOne({ userEmail, postId, type: reactionType });
      }
      throw err;
    }
  }

  async delete(userEmail, postId, reactionType) {
    const reaction = await Reaction.findOneAndDelete({ userEmail, postId, type: reactionType });
    if (!reaction) throw new Error(Response.generateMessage(Response.errorMessage.INVALID_REQUEST, "reaction"));
    await counterCache.decrReaction(postId, reactionType).catch(() => {});
    return reaction;
  }

  async findReaction(userEmail, postId, reactionType) {
    return Reaction.findOne({ userEmail, postId, type: reactionType });
  }
}

module.exports = new ReactionRepository();
