const mongoose = require("mongoose");

const accessControlSchema = new mongoose.Schema(
  {
    whiteList: {
      emails:  { type: [String], default: [] },
      domains: { type: [String], default: [] },
    },
    blackList: {
      emails:  { type: [String], default: [] },
      domains: { type: [String], default: [] },
    },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AccessControl", accessControlSchema);
