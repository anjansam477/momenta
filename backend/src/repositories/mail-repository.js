const MailJob = require("../models/mail-jobs");

class MailRepository {
  async createJob(data) {
    return MailJob.create(data);
  }

  async getJobsByWallId(wallId) {
    return MailJob.find({ wallId }).lean();
  }

  async getSchedulesByWallIdAndType(wallId, type) {
    return MailJob.findOne({ wallId, type, status: "pending" }).lean();
  }

  async getJobById(jobId) {
    return MailJob.findById(jobId).lean();
  }

  async updateJobStatus(jobId, status, extra = {}) {
    return MailJob.findByIdAndUpdate(jobId, { status, ...extra }, { new: true });
  }

  async cancelByWallId(wallId) {
    return MailJob.updateMany({ wallId, status: "pending" }, { $set: { status: "cancelled" } });
  }

  async removeRecipient(wallId, recipient) {
    return MailJob.updateOne(
      { wallId, status: "pending" },
      { $pull: { "recipients.primary": recipient, "recipients.cc": recipient } }
    );
  }

  async markSent(jobId) {
    return MailJob.findByIdAndUpdate(jobId, { status: "sent", sentAt: new Date() }, { new: true });
  }

  async markFailed(jobId, error) {
    return MailJob.findByIdAndUpdate(
      jobId,
      { $set: { status: "failed", error }, $inc: { retryCount: 1 } },
      { new: true }
    );
  }

  async getPendingScheduledAfter(date) {
    return MailJob.find({ type: "SCHEDULE", status: "pending", scheduledAt: { $gt: date } }).lean();
  }

  async markPastDuePendingAsFailed(date) {
    return MailJob.updateMany(
      { type: "SCHEDULE", status: "pending", scheduledAt: { $lte: date } },
      { $set: { status: "failed" } }
    );
  }
}

module.exports = new MailRepository();
