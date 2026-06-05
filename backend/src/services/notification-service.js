const NotificationRepository = require("../repositories/notification-repository");
const { client: redisClient } = require("../utils/redis");
const logger = require("../utils/logger");

const FALLBACK_QUEUE_KEY = "ntf:fallback:queue";
const FALLBACK_QUEUE_TTL = 60 * 60 * 24; // 24h max lifetime for undelivered notifications

const notificationStatusMap = new Map([
  ["unread", ["read", "archived"]],
  ["read", ["unread", "archived"]]
]);

class NotificationService {

  constructor() {
    this.io = null;
    this.startPeriodicSave();
  }

  initialize(io) {
    this.io = io;
  }

  generateTempId() {
    return "temp_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
  }

  // Emit to user's personal room — Redis adapter fans out across all instances
  _emitToUser(email, event, payload) {
    if (this.io) {
      this.io.to(`user:${email}`).emit(event, payload);
    }
  }

  async createNotification(notification) {
    if (!notification || !Array.isArray(notification.sendToEmails)) {
      return null;
    }

    notification.sendToEmails = notification.sendToEmails.filter(
      (userDetail, index, self) =>
        userDetail.userEmail !== notification.email &&
        index === self.findIndex((ud) => ud.userEmail === userDetail.userEmail)
    );

    if (notification.sendToEmails.length === 0) return null;

    let savedNotification = notification;
    try {
      const saved = await NotificationRepository.addNotifications([notification]);
      savedNotification = saved?.[0] || notification;
    } catch (error) {
      // MongoDB down — push to Redis list so it survives restarts and is visible
      // to all instances (not siloed in one process's memory)
      savedNotification = { ...notification, _id: this.generateTempId() };
      try {
        await redisClient.lpush(FALLBACK_QUEUE_KEY, JSON.stringify(savedNotification));
        await redisClient.expire(FALLBACK_QUEUE_KEY, FALLBACK_QUEUE_TTL);
      } catch (redisErr) {
        logger.error({ err: redisErr.message }, "Both MongoDB and Redis fallback failed for notification");
      }
      logger.warn({ err: error.message }, "Notification queued in Redis fallback");
    }

    for (const userDetail of savedNotification.sendToEmails) {
      this._emitToUser(userDetail.userEmail, "newNotification", {
        _id: savedNotification._id,
        wallId: savedNotification.wallId,
        wallName: savedNotification.wallName,
        postId: savedNotification.postId,
        email: savedNotification.email,
        status: userDetail.status,
        timestamp: savedNotification.timestamp,
        type: savedNotification.type,
        metadata: savedNotification.metadata || {},
        notificationIds: [savedNotification._id],
      });
    }

    return savedNotification;
  }


  async addNotifications(notifications) {
    if (notifications.length > 0) {
      return await NotificationRepository.addNotifications(notifications)
    }
  }

  async getNotificationsByEmail(userEmail) {
    const normalizedEmail = typeof userEmail === "string" ? userEmail.trim().toLowerCase() : "";
    const notificationsList = await NotificationRepository.findNotificationsByEmail(normalizedEmail);

    // Drain Redis fallback queue — flush pending items to MongoDB and include them
    try {
      const pending = await redisClient.lrange(FALLBACK_QUEUE_KEY, 0, -1);
      if (pending.length > 0) {
        const parsed = pending.map((s) => JSON.parse(s));
        const relevant = parsed.filter((n) =>
          n.sendToEmails?.some(
            (ud) => ud.userEmail === normalizedEmail && ud.status !== "archived"
          )
        );
        if (relevant.length > 0) notificationsList.push(...relevant);

        // Attempt to persist and clear the queue now that DB may be back
        await NotificationRepository.addNotifications(
          parsed.map(({ _id, ...n }) => n)
        ).then(() => redisClient.del(FALLBACK_QUEUE_KEY)).catch(() => {});
      }
    } catch {
      // Redis also down — return what MongoDB gave us
    }

    return notificationsList;
  }

  async updateNotificationStatus(notification, userEmail, status) {
    if (!notification || !Array.isArray(notification.notificationIds) || !status) {
      throw new Error("Invalid notification update");
    }

    const fromState = notification.status || "unread";
    if (!this.isValidTransition(fromState, status)) {
      throw new Error("Invalid notification transition");
    }

    for (let id of notification.notificationIds) {
      let notif = this.notifications.find(n => n._id === id);
      if (notif) {
        const userStatus = notif.sendToEmails.find(emailObj => emailObj.userEmail === userEmail);
        if (!userStatus) {
          throw new Error("Notification not found with given email");
        }
        userStatus.status = status;
      }
      else {
        notif = await NotificationRepository.findNotificationById(id);
        if (!notif) {
          throw new Error("Notification not found with given email");
        }

        await NotificationRepository.updateNotificationStatus(id, userEmail, status);
      }
    }
    this.sendNotification(userEmail);
  }

  isValidTransition(fromState, toState) {
    if (fromState === toState) {
      return true;
    }
    return notificationStatusMap.has(fromState) && notificationStatusMap.get(fromState).includes(toState);
  }

  startPeriodicSave() {
    // Periodic save now only needed as a safety net — main fallback is Redis queue
    setInterval(async () => {
      try {
        const pending = await redisClient.lrange(FALLBACK_QUEUE_KEY, 0, -1);
        if (pending.length === 0) return;
        const parsed = pending.map((s) => JSON.parse(s));
        await NotificationRepository.addNotifications(parsed.map(({ _id, ...n }) => n));
        await redisClient.del(FALLBACK_QUEUE_KEY);
        logger.info({ count: parsed.length }, "Flushed Redis notification fallback queue to MongoDB");
      } catch (err) {
        logger.warn({ err: err.message }, "Periodic fallback flush failed — will retry");
      }
    }, 1000 * 60 * 5);
  }

  async sendNotification(userEmail) {
    const normalizedEmail = typeof userEmail === "string" ? userEmail.trim().toLowerCase() : "";
    const notifications = await this.getNotificationsByEmail(normalizedEmail);
    const grouped = await this.groupNotification(notifications, normalizedEmail);
    grouped.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    // Emit to room — works across instances via Redis adapter
    this._emitToUser(normalizedEmail, "initialNotifications", grouped);
  }


  async groupNotification(notifications, userEmail) {
    let groupedNotifications = [];

    notifications.forEach(notification => {
      let key;
      const emailStatus = notification.sendToEmails.find(emailEntry => emailEntry.userEmail === userEmail)?.status;

      switch (notification.type) {
        case 'reactionAdded':
          key = `${emailStatus}-${notification.type}-${notification.wallId}-${notification.postId}`;
          break;
        case 'postAdded':
        case 'postPending':
        case 'accessGranted':
        case 'inviteAccepted':
        case 'momentUpdated':
        case 'momentLocked':
        case 'momentUnlocked':
        case 'momentArchived':
          key = `${emailStatus}-${notification.type}-${notification.wallId}`;
          break;
        case 'postApproved':
        case 'postRejected':
        case 'deletePost':
        case 'postreported':
        case 'postUnreported': key = `${emailStatus}-${notification.type}-${notification._id}`;
                                break;
        default:
          key = `${emailStatus}-${notification.type}-${notification._id}`;
      }

      const existingGroup = groupedNotifications.find(group => group._id === key);

      if (existingGroup) {
        if (!existingGroup.emails.includes(notification.email)) {
          existingGroup.emails.push(notification.email); groupedNotifications
        }

        if (new Date(notification.timestamp) > new Date(existingGroup.timestamp)) {
          existingGroup.timestamp = notification.timestamp;
        }

        existingGroup.notificationIds.push(notification._id);
      } else {
        groupedNotifications.push({
          _id: key,
          wallId: notification.wallId,
          wallName: notification.wallName,
          postId: notification.postId,
          emails: [notification.email],
          timestamp: notification.timestamp,
          status: emailStatus,
          type: notification.type,
          metadata: notification.metadata || {},
          notificationIds: [notification._id]
        });
      }
    });


    return groupedNotifications;
  }



  async findAndDeleteNotification(type, data) {
    const query = { type };
    if (data.wallId) query.wallId = data.wallId;
    if (data.postId)  query.postId  = data.postId;
    if (data.email)   query.email   = data.email;

    const response = await NotificationRepository.findandDeleteNotification(query);

    if (response) {
      const emailsToNotify = (response.sendToEmails || []).map((obj) => obj.userEmail);
      await Promise.all(emailsToNotify.map((email) => this.sendNotification(email)));
    }
  }
}
module.exports = new NotificationService();
