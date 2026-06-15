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

  /**
   * Atomically claim one due scheduled job (pending → sending). The atomic
   * findOneAndUpdate guarantees that, even with multiple API instances polling,
   * exactly one wins each job — no double-sends. Returns null when nothing is due.
   */
  async claimDueJob(now) {
    return MailJob.findOneAndUpdate(
      { type: "SCHEDULE", status: "pending", scheduledAt: { $lte: now } },
      { $set: { status: "sending" } },
      { new: true, sort: { scheduledAt: 1 } }
    ).lean();
  }

  /** Return a job to the pending queue (used when a delivery attempt fails but retries remain). */
  async requeueJob(jobId) {
    return MailJob.findByIdAndUpdate(
      jobId,
      { $set: { status: "pending" }, $inc: { retryCount: 1 } },
      { new: true }
    );
  }
}

module.exports = new MailRepository();
