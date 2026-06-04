const wallRepository = require("../repositories/wall-repository");
const analyticsRepository = require('../repositories/analytics-repository');
const postRepository = require("../repositories/post-repository");
const interactionRepository = require("../repositories/interaction-repository");
const Response = require("../utils/error-handler");
const { publishNotification } = require("./notification-event-service");
const { NOTIFICATION_TYPES } = require("../domain/notifications/notification-rules");

class WallService {
  async createWall(wallData) {
    return wallRepository.createWall(wallData);
  }

  async updateWall(wallId, updateData, userEmail) {
    const previous = await wallRepository.getWallById(wallId);
    const wall = await wallRepository.updateWall(wallId, updateData, userEmail);
    await this._publishUpdateNotifications(previous, wall, updateData, userEmail);
    return wall;
  }

  async deleteWall(wallId, userEmail) {
    const wall = await wallRepository.archiveWall(wallId);
    await publishNotification(NOTIFICATION_TYPES.WALL_ARCHIVED, { wallId, email: userEmail }).catch(() => {});
    return wall;
  }

  async getWall(wallId, userEmail) {
    const wall = await wallRepository.getWallById(wallId);
    if (!wall) throw new Error(Response.generateMessage(Response.errorMessage.INVALID_REQUEST, "wall"));

    if (userEmail && wall.status !== "archived") {
      const hasAccess = wall.anyoneCanView || wall.anyoneCanPost || await wallRepository.hasAccess(wallId, userEmail);
      if (!hasAccess) throw new Error(Response.generateMessage(Response.errorMessage.NO_ACCESS, "wall"));
      await wallRepository.recordInteraction(wallId, userEmail);
      analyticsRepository.incrementView(wallId).catch(() => {});
    }

    const wallObj = wall.toObject ? wall.toObject() : wall;
    return this._addCounts([wallObj], userEmail).then((arr) => ({ wallDetails: arr[0] }));
  }

  async getWallsByAdmin(userEmail, page, pageSize) {
    const walls = await wallRepository.getWallsByOwnerOrMaintainer(userEmail, page, pageSize);
    return this._addCounts(walls, userEmail);
  }

  async getWallsByAccess(userEmail, page, pageSize) {
    const walls = await wallRepository.getWallsByAccess(userEmail, page, pageSize);
    return this._addCounts(walls.filter((w) => w.status !== "archived"), userEmail);
  }

  async getWallsByRecipient(userEmail, page, pageSize) {
    const walls = await wallRepository.getWallsByRecipient(userEmail, page, pageSize);
    return this._addCounts(walls.filter((w) => w.status !== "archived"), userEmail);
  }

  async getSavedWalls(userEmail, type, page, pageSize) {
    const saved = await wallRepository.getSavedWalls(userEmail, type, page, pageSize);
    const wallIds = saved.map((s) => s.wallId);
    const walls = await wallRepository.getWallsByIds(wallIds);
    const active = walls.filter((w) => w.status !== "archived");
    const withType = active.map((w) => {
      const saveType = saved.find((s) => s.wallId.toString() === w._id.toString())?.type;
      return { ...w, saveType };
    });
    return this._addCounts(withType, userEmail);
  }

  async getArchivedWalls(userEmail, page, pageSize) {
    const walls = await wallRepository.getArchivedWalls(userEmail, page, pageSize);
    return this._addCounts(walls, userEmail);
  }

  async getRecentWalls(userEmail) {
    const walls = await wallRepository.getRecentWalls(userEmail);
    return this._addCounts(walls, userEmail);
  }

  async saveWall(wallId, userEmail, type) {
    return wallRepository.saveWall(wallId, userEmail, type);
  }

  async unsaveWall(wallId, userEmail, type) {
    return wallRepository.unsaveWall(wallId, userEmail, type);
  }

  async setAccess(wallId, updateData, userEmail) {
    if (updateData.maintainerEmails) {
      await wallRepository.setMembers(wallId, updateData.maintainerEmails, "maintainer", userEmail);
    }
    if (updateData.viewAccess && updateData.viewAccess.emails) {
      await wallRepository.setMembers(wallId, updateData.viewAccess.emails, "viewer", userEmail);
    }
    if (updateData.postAccess && updateData.postAccess.emails) {
      await wallRepository.setMembers(wallId, updateData.postAccess.emails, "poster", userEmail);
    }
    if (updateData.receivers) {
      await wallRepository.setMembers(wallId, updateData.receivers, "recipient", userEmail);
    }
  }

  async _addCounts(walls, userEmail) {
    return Promise.all(
      walls.map(async (w) => {
        const wallId = w._id;
        const [posts, interactions, interacted] = await Promise.all([
          postRepository.getPostCounts(wallId),
          interactionRepository.getCountForWall(wallId),
          interactionRepository.checkInteraction(wallId, userEmail),
        ]);
        return { ...w, posts, interactions, isNew: !interacted };
      })
    );
  }

  async _publishUpdateNotifications(prev, updated, updateData, userEmail) {
    if (!prev || !updated) return;
    if (Object.prototype.hasOwnProperty.call(updateData, "status")) {
      const type =
        updateData.status === "locked"
          ? NOTIFICATION_TYPES.WALL_LOCKED
          : updateData.status === "active"
          ? NOTIFICATION_TYPES.WALL_UNLOCKED
          : NOTIFICATION_TYPES.WALL_ARCHIVED;
      await publishNotification(type, { wallId: updated._id, email: userEmail }).catch(() => {});
      return;
    }
    const visibleKeys = ["title", "description", "openDate", "closeDate"];
    if (visibleKeys.some((k) => Object.prototype.hasOwnProperty.call(updateData, k))) {
      await publishNotification(NOTIFICATION_TYPES.WALL_UPDATED, {
        wallId: updated._id,
        email: userEmail,
        metadata: {
          changedFields: visibleKeys.filter((k) => Object.prototype.hasOwnProperty.call(updateData, k)),
        },
      }).catch(() => {});
    }
  }
}

module.exports = new WallService();
