const WallInteraction = require("../models/wall-interactions");
const counterCache = require("../utils/counter-cache");

class InteractionRepository {
  async addInteraction(wallId, userEmail) {
    try {
      await WallInteraction.findOneAndUpdate(
        { wallId, userEmail },
        { $set: { updatedAt: new Date() } },
        { upsert: true }
      );
      await counterCache.addInteractionMember(wallId, userEmail).catch(() => {});
    } catch (err) {
      if (err.code !== 11000) throw err;
    }
  }

  async checkInteraction(wallId, userEmail) {
    const cached = await counterCache.hasInteracted(wallId, userEmail).catch(() => null);
    if (cached !== null) return cached;
    const exists = await WallInteraction.findOne({ wallId, userEmail }).lean();
    return !!exists;
  }

  async getInteractionsByEmail(userEmail, limit) {
    return WallInteraction.find({ userEmail })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select("wallId updatedAt")
      .lean();
  }

  async getCountForWall(wallId) {
    const cached = await counterCache.getInteractionCount(wallId).catch(() => null);
    if (cached !== null) return cached;
    const count = await WallInteraction.countDocuments({ wallId });
    await counterCache.setInteractionCount(wallId, count).catch(() => {});
    return count;
  }
}

module.exports = new InteractionRepository();
