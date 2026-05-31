const mongoose = require("mongoose");
const logger = require("../utils/logger");

exports.connectDb = async () => {
  try {
    const connectionString = process.env.CONNECTION_STRING || "mongodb://localhost:27017/momenta";
    await mongoose.connect(connectionString, {
      maxPoolSize: Number(process.env.MONGO_POOL_SIZE || 20),   // concurrent connections
      minPoolSize: 2,                                            // keep-alive floor
      serverSelectionTimeoutMS: 5000,                           // fail fast if Mongo unreachable
      socketTimeoutMS: 45000,                                    // drop stalled queries
    });
    logger.info("MongoDB connected");
  } catch (err) {
    logger.error({ err }, "MongoDB connection failed");
    process.exit(1);
  }
};
