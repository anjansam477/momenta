const WallAnalytics = require('../models/wall-analytics');

function todayUTC() {
  const d = new Date();
  d.setUTCHours(0,0,0,0);
  return d;
}

class AnalyticsRepository {
  async incrementView(wallId) {
    const date = todayUTC();
    await WallAnalytics.findOneAndUpdate(
      { wallId, date },
      { $inc: { views: 1 } },
      { upsert: true }
    );
  }

  async incrementPost(wallId) {
    const date = todayUTC();
    await WallAnalytics.findOneAndUpdate(
      { wallId, date },
      { $inc: { postCount: 1 } },
      { upsert: true }
    );
  }

  async incrementReaction(wallId) {
    const date = todayUTC();
    await WallAnalytics.findOneAndUpdate(
      { wallId, date },
      { $inc: { reactionCount: 1 } },
      { upsert: true }
    );
  }

  async getAnalytics(wallId, days = 30) {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    since.setUTCHours(0,0,0,0);
    return WallAnalytics.find({ wallId, date: { $gte: since } }).sort({ date: 1 });
  }

  async getTotals(wallId) {
    const result = await WallAnalytics.aggregate([
      { $match: { wallId: require('mongoose').Types.ObjectId.createFromHexString(wallId.toString()) } },
      { $group: { _id: null, totalViews: { $sum: '$views' }, totalPosts: { $sum: '$postCount' }, totalReactions: { $sum: '$reactionCount' } } }
    ]);
    return result[0] || { totalViews: 0, totalPosts: 0, totalReactions: 0 };
  }
}

module.exports = new AnalyticsRepository();
