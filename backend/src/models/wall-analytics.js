const mongoose = require("mongoose");

const wallAnalyticsSchema = new mongoose.Schema({
  wallId:         { type: mongoose.Schema.Types.ObjectId, ref: "Wall", required: true },
  date:           { type: Date, required: true }, // day bucket (start of day UTC)
  views:          { type: Number, default: 0 },
  uniqueVisitors: { type: Number, default: 0 },
  postCount:      { type: Number, default: 0 },
  reactionCount:  { type: Number, default: 0 },
});

wallAnalyticsSchema.index({ wallId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("WallAnalytics", wallAnalyticsSchema);
