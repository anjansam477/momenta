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

  async getAnalytics(wallId, { days, from, to } = {}) {
    let startDate;
    if (from) {
      startDate = new Date(from);
      startDate.setUTCHours(0, 0, 0, 0);
    } else {
      startDate = new Date();
      startDate.setUTCDate(startDate.getUTCDate() - (days || 30));
      startDate.setUTCHours(0, 0, 0, 0);
    }
    const endDate = to ? new Date(to) : new Date();
    endDate.setUTCHours(0, 0, 0, 0);

    const query = { wallId, date: { $gte: startDate, $lte: endDate } };
    const records = await WallAnalytics.find(query).sort({ date: 1 });

    // Build a map keyed by YYYY-MM-DD for fast lookup
    const recordMap = new Map(
      records.map(r => [r.date.toISOString().slice(0, 10), r])
    );

    // Fill every day in the range so the chart always has a continuous series
    const filled = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const key = cursor.toISOString().slice(0, 10);
      const rec = recordMap.get(key);
      filled.push({
        date: key,
        views: rec ? rec.views : 0,
        postCount: rec ? rec.postCount : 0,
        reactionCount: rec ? rec.reactionCount : 0,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return filled;
  }

  async getTotals(wallId) {
    const result = await WallAnalytics.aggregate([
      { $match: { wallId: require('mongoose').Types.ObjectId.createFromHexString(wallId.toString()) } },
      { $group: { _id: null, totalViews: { $sum: '$views' }, totalPosts: { $sum: '$postCount' }, totalReactions: { $sum: '$reactionCount' } } }
    ]);
    return result[0] || { totalViews: 0, totalPosts: 0, totalReactions: 0 };
  }

  async getPreviousTotals(wallId, { days, from, to } = {}) {
    let startDate, endDate;
    if (from && to) {
      const len = new Date(to) - new Date(from);
      endDate = new Date(from);
      startDate = new Date(endDate - len);
    } else {
      endDate = new Date();
      endDate.setUTCDate(endDate.getUTCDate() - (days || 30));
      endDate.setUTCHours(0, 0, 0, 0);
      startDate = new Date(endDate);
      startDate.setUTCDate(startDate.getUTCDate() - (days || 30));
    }
    const result = await WallAnalytics.aggregate([
      { $match: { wallId: require('mongoose').Types.ObjectId.createFromHexString(wallId.toString()), date: { $gte: startDate, $lt: endDate } } },
      { $group: { _id: null, totalViews: { $sum: '$views' }, totalPosts: { $sum: '$postCount' }, totalReactions: { $sum: '$reactionCount' } } }
    ]);
    return result[0] || { totalViews: 0, totalPosts: 0, totalReactions: 0 };
  }
}

module.exports = new AnalyticsRepository();
