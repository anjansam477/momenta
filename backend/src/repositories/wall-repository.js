const Wall = require("../models/walls");
const WallMember = require("../models/wall-members");
const WallInteraction = require("../models/wall-interactions");
const SavedWall = require("../models/saved-walls");
const MailJob = require("../models/mail-jobs");
const Response = require("../utils/error-handler");
const {
  getWallCache, setWallCache, invalidateWallCache,
  getRoleCache, setRoleCache, invalidateRoleCache,
  getAccessCache, setAccessCache, invalidateAccessCache,
} = require('../utils/redis-cache');

function generateSlug(title) {
  const base = (title || "wall").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

class WallRepository {
  async createWall(wallData) {
    const slug = generateSlug(wallData.title);
    const wall = new Wall({ ...wallData, slug });
    await wall.save();
    await WallMember.create({ wallId: wall._id, userEmail: wallData.ownerEmail, role: "owner", addedBy: wallData.ownerEmail });
    await WallInteraction.create({ wallId: wall._id, userEmail: wallData.ownerEmail });
    return wall;
  }

  async updateWall(wallId, updateData, userEmail) {
    const wall = await Wall.findByIdAndUpdate(wallId, updateData, { new: true });
    if (!wall) throw new Error(Response.generateMessage(Response.errorMessage.DOCUMENT_NOT_UPDATED, "wall"));
    if (!Object.prototype.hasOwnProperty.call(updateData, "status")) {
      await WallInteraction.findOneAndUpdate({ wallId, userEmail }, { $set: { updatedAt: new Date() } }, { upsert: true });
    }
    await invalidateWallCache(wallId);
    return wall;
  }

  async archiveWall(wallId) {
    await MailJob.updateMany({ wallId, status: "pending" }, { $set: { status: "cancelled" } });
    const wall = await Wall.findByIdAndUpdate(wallId, { status: "archived" }, { new: true });
    if (!wall) throw new Error(Response.generateMessage(Response.errorMessage.INVALID_REQUEST, "wall"));
    await invalidateWallCache(wallId);
    return wall;
  }

  async getWallById(wallId) {
    const cached = await getWallCache(wallId);
    if (cached) return cached;
    const wall = await Wall.findById(wallId);
    if (!wall) throw new Error(Response.generateMessage(Response.errorMessage.INVALID_REQUEST, "wall"));
    await setWallCache(wallId, wall);
    return wall;
  }

  async getWallBySlug(slug) {
    return Wall.findOne({ slug });
  }

  async getUserRole(wallId, userEmail) {
    const cached = await getRoleCache(wallId, userEmail);
    if (cached !== undefined) return cached;
    const member = await WallMember.findOne({ wallId, userEmail }).sort({ role: 1 });
    const role = member ? member.role : null;
    await setRoleCache(wallId, userEmail, role);
    return role;
  }

  async hasAccess(wallId, userEmail) {
    const cached = await getAccessCache(wallId, userEmail);
    if (cached !== undefined) return cached;
    // Query Wall directly (not via getWallById) to avoid polluting wall cache with partial doc
    const wall = await Wall.findById(wallId);
    if (!wall) { await setAccessCache(wallId, userEmail, false); return false; }
    if (wall.anyoneCanView || wall.anyoneCanPost) { await setAccessCache(wallId, userEmail, true); return true; }
    const domain = userEmail.split("@")[1];
    const member = await WallMember.findOne({
      wallId,
      $or: [{ userEmail }, { domain }],
    });
    const result = !!member;
    await setAccessCache(wallId, userEmail, result);
    return result;
  }

  async setMembers(wallId, emails, role, addedBy, domain = null) {
    const ops = emails.map((email) => ({
      updateOne: {
        filter: { wallId, userEmail: email.toLowerCase(), role },
        update: { $set: { addedBy, domain, updatedAt: new Date() } },
        upsert: true,
      },
    }));
    if (ops.length) await WallMember.bulkWrite(ops);
    await invalidateRoleCache(wallId, emails);
    await invalidateAccessCache(wallId, emails);
  }

  async removeMember(wallId, userEmail, role) {
    const result = await WallMember.deleteOne({ wallId, userEmail, role });
    await invalidateRoleCache(wallId, [userEmail]);
    await invalidateAccessCache(wallId, [userEmail]);
    return result;
  }

  async getMembers(wallId) {
    return WallMember.find({ wallId }).lean();
  }

  async getWallsByOwnerOrMaintainer(userEmail, page, pageSize) {
    const skip = (page - 1) * pageSize;
    const memberWallIds = await WallMember.find({ userEmail, role: { $in: ["owner", "maintainer"] } }).distinct("wallId");
    return Wall.find({ _id: { $in: memberWallIds } })
      .sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean();
  }

  async getArchivedWalls(userEmail, page, pageSize) {
    const skip = (page - 1) * pageSize;
    const memberWallIds = await WallMember.find({ userEmail, role: { $in: ["owner", "maintainer"] } }).distinct("wallId");
    return Wall.find({ _id: { $in: memberWallIds }, status: "archived" })
      .sort({ updatedAt: -1 }).skip(skip).limit(pageSize).lean();
  }

  async getWallsByAccess(userEmail, page, pageSize) {
    const skip = (page - 1) * pageSize;
    const domain = userEmail.split("@")[1];
    const memberWallIds = await WallMember.find({
      role: { $in: ["poster", "viewer"] },
      $or: [{ userEmail }, { domain }],
    }).distinct("wallId");
    return Wall.find({ _id: { $in: memberWallIds }, status: { $ne: "archived" } })
      .sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean();
  }

  async getWallsByRecipient(userEmail, page, pageSize) {
    const skip = (page - 1) * pageSize;
    const now = new Date();
    const jobs = await MailJob.find({
      "recipients.primary": userEmail,
      scheduledAt: { $lte: now },
      status: "sent",
    }).select("wallId").skip(skip).limit(pageSize).lean();
    const wallIds = jobs.map((j) => j.wallId);
    return Wall.find({ _id: { $in: wallIds } }).lean();
  }

  async getRecentWalls(userEmail) {
    const domain = userEmail.split("@")[1];
    const memberWallIds = await WallMember.find({
      $or: [{ userEmail }, { domain }],
    }).distinct("wallId");

    const interactions = await WallInteraction.find({ userEmail })
      .sort({ updatedAt: -1 }).limit(24).lean();
    const interactionMap = new Map(interactions.map((i) => [i.wallId.toString(), i.updatedAt]));

    const allWallIds = Array.from(new Set([...memberWallIds.map(String), ...interactions.map((i) => i.wallId.toString())]));
    const walls = await Wall.find({ _id: { $in: allWallIds }, status: { $ne: "archived" } }).lean();

    walls.forEach((w) => {
      w._interactionUpdatedAt = interactionMap.get(w._id.toString()) || w.updatedAt;
    });
    walls.sort((a, b) => new Date(b._interactionUpdatedAt) - new Date(a._interactionUpdatedAt));
    return walls.slice(0, 24);
  }

  async getSavedWalls(userEmail, type, page, pageSize) {
    const skip = (page - 1) * pageSize;
    const query = { userEmail };
    if (type) query.type = type;
    return SavedWall.find(query).select("wallId type").skip(skip).limit(pageSize).lean();
  }

  async getWallsByIds(wallIds) {
    return Wall.find({ _id: { $in: wallIds } }).sort({ createdAt: -1 }).lean();
  }

  async saveWall(wallId, userEmail, type) {
    return SavedWall.findOneAndUpdate(
      { wallId, userEmail, type },
      { $set: { wallId, userEmail, type } },
      { upsert: true, new: true }
    );
  }

  async unsaveWall(wallId, userEmail, type) {
    const result = await SavedWall.findOneAndDelete({ wallId, userEmail, type });
    if (!result) throw new Error("Saved wall not found");
  }

  // Current receiver-link epoch. Returns 0 for a wall minted before this field
  // existed, or null if the wall no longer exists. Reuses the wall cache when warm.
  async getViewTokenVersion(wallId) {
    const cached = await getWallCache(wallId);
    if (cached) return cached.viewTokenVersion || 0;
    const wall = await Wall.findById(wallId).select("viewTokenVersion").lean();
    return wall ? (wall.viewTokenVersion || 0) : null;
  }

  // Invalidate every previously shared receiver link for this wall by bumping its
  // epoch. Returns the new version. Clears the wall cache so verify reads the bump.
  async rotateViewToken(wallId) {
    const wall = await Wall.findByIdAndUpdate(
      wallId,
      { $inc: { viewTokenVersion: 1 } },
      { new: true }
    );
    if (!wall) throw new Error(Response.generateMessage(Response.errorMessage.INVALID_REQUEST, "wall"));
    await invalidateWallCache(wallId);
    return wall.viewTokenVersion;
  }

  async recordInteraction(wallId, userEmail) {
    await WallInteraction.findOneAndUpdate(
      { wallId, userEmail },
      { $set: { updatedAt: new Date() } },
      { upsert: true }
    );
  }
}

module.exports = new WallRepository();
