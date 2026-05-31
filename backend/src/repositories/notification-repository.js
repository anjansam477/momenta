const Notification = require("../models/notifications");

class NotificationRepository {
  async addNotifications(notifications) {
    return Notification.insertMany(notifications, { ordered: false });
  }

  async findNotificationsByEmail(userEmail) {
    return Notification.find({
      "recipients.userEmail": userEmail,
      "recipients.status": { $ne: "archived" },
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
  }

  async findNotificationById(id) {
    return Notification.findById(id);
  }

  async updateNotificationStatus(notificationId, userEmail, status) {
    return Notification.updateOne(
      { _id: notificationId, "recipients.userEmail": userEmail },
      { $set: { "recipients.$.status": status } }
    );
  }

  async findandDeleteNotification(query) {
    return Notification.findOneAndDelete(query);
  }
}

module.exports = new NotificationRepository();
