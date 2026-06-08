const nodemailer = require("nodemailer");
const cron = require("node-cron");
const mailRepository = require("../repositories/mail-repository");
const { emailTemplates } = require("../templates/email-templates");
const Response = require("../utils/error-handler");
const logger = require("../utils/logger");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_APP_USER,
    pass: process.env.EMAIL_APP_PASS,
  },
});

// In-process map for SCHEDULE type: wallId → { timerId, jobId }
const scheduledTimers = new Map();

async function sendMail({ to, cc, subject, html }) {
  const mailOptions = {
    from: `Momenta <${process.env.EMAIL_APP_USER}>`,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    html,
  };
  if (cc?.length) mailOptions.cc = Array.isArray(cc) ? cc.join(", ") : cc;
  return transporter.sendMail(mailOptions);
}

class MailService {
  // ── Transactional emails ──────────────────────────────────────────────────

  async sendVerificationEmail(user, token) {
    const verifyUrl = `${process.env.SERVICE_BASE_URL}/api/users/account/verify?token=${token}`;
    const html = emailTemplates.verifyEmail({ name: user.firstname, verifyUrl });
    await sendMail({ to: user.email, subject: "Verify your Momenta account", html });
    await mailRepository.createJob({ type: "REGISTER", recipients: { primary: [user.email] }, status: "sent", sentAt: new Date() });
  }

  async sendPasswordResetEmail(user, token) {
    const resetUrl = `${process.env.UI_BASE_URL}/reset-password?token=${token}`;
    const html = emailTemplates.resetPassword({ name: user.firstname, resetUrl });
    await sendMail({ to: user.email, subject: "Reset your Momenta password", html });
    await mailRepository.createJob({ type: "PASSWORD", recipients: { primary: [user.email] }, status: "sent", sentAt: new Date() });
  }

  // ── Scheduled wall delivery ───────────────────────────────────────────────

  async scheduleEmail(emailDetails) {
    const { primary, cc, subject, htmlContent, wallId, scheduledDate, type } = emailDetails;

    if (!type) throw new Error(Response.generateMessage(Response.errorMessage.PARAMS_REQUIRED, "Type is"));
    if (!primary?.length || !subject || !htmlContent) {
      throw new Error(Response.generateMessage(Response.errorMessage.PARAMS_REQUIRED, "All parameters are"));
    }

    if (type === "SCHEDULE") {
      // Cancel existing scheduled job for this wall
      const existing = await mailRepository.getSchedulesByWallIdAndType(wallId, "SCHEDULE");
      if (existing) {
        this._clearTimer(wallId);
        await mailRepository.cancelByWallId(wallId);
      }

      const delay = Math.max(new Date(scheduledDate).getTime() - Date.now(), 0);
      const job = await mailRepository.createJob({
        type,
        wallId,
        recipients: { primary, cc: cc || [] },
        scheduledAt: new Date(scheduledDate),
        status: "pending",
      });

      const timerId = setTimeout(() => this._deliverJob(job._id, { to: primary, cc, subject, html: htmlContent }), delay);
      scheduledTimers.set(String(wallId), { timerId, jobId: job._id });
      return job;
    }

    // Immediate send (ACCESS, etc.)
    const job = await mailRepository.createJob({
      type,
      wallId: wallId || null,
      recipients: { primary, cc: cc || [] },
      scheduledAt: null,
      status: "pending",
    });
    await this._deliverJob(job._id, { to: primary, cc, subject, html: htmlContent });
    return job;
  }

  async _deliverJob(jobId, mailOpts) {
    try {
      await sendMail(mailOpts);
      await mailRepository.markSent(jobId);
    } catch (err) {
      logger.error({ err: err.message, jobId }, "Mail delivery failed");
      await mailRepository.markFailed(jobId, err.message);
    } finally {
      scheduledTimers.forEach((v, k) => { if (String(v.jobId) === String(jobId)) scheduledTimers.delete(k); });
    }
  }

  _clearTimer(wallId) {
    const entry = scheduledTimers.get(String(wallId));
    if (entry) { clearTimeout(entry.timerId); scheduledTimers.delete(String(wallId)); }
  }

  async getScheduledByWallId(wallId) {
    const job = await mailRepository.getSchedulesByWallIdAndType(wallId, "SCHEDULE");
    if (!job) return null;
    return { recipients: job.recipients, scheduledAt: job.scheduledAt };
  }

  async removeRecipient(wallId, recipient) {
    this._clearTimer(wallId);
    await mailRepository.removeRecipient(wallId, recipient);
    // Re-schedule if still has recipients
    const job = await mailRepository.getSchedulesByWallIdAndType(wallId, "SCHEDULE");
    if (job?.recipients?.primary?.length) {
      const delay = Math.max(new Date(job.scheduledAt).getTime() - Date.now(), 0);
      const timerId = setTimeout(
        () => this._deliverJob(job._id, { to: job.recipients.primary, cc: job.recipients.cc, subject: job.subject || "Your Momenta moment has arrived!", html: job.htmlContent || "" }),
        delay
      );
      scheduledTimers.set(String(wallId), { timerId, jobId: job._id });
    }
  }

  async cancelMail(wallId) {
    const job = await mailRepository.getSchedulesByWallIdAndType(wallId, "SCHEDULE");
    if (!job) throw new Error(Response.generateMessage(Response.errorMessage.INVALID_REQUEST, "scheduled mail"));
    if (new Date(job.scheduledAt) <= new Date()) throw new Error(Response.errorMessage.SOMETHING_WENT_WRONG);
    this._clearTimer(wallId);
    await mailRepository.cancelByWallId(wallId);
    return true;
  }

  async _sendDirect({ to, subject, html }) {
    return sendMail({ to, subject, html });
  }

  async sendContactMail(sender, name, message) {
    if (!sender?.trim() || !name?.trim() || !message?.trim()) {
      throw new Error(Response.generateMessage(Response.errorMessage.PARAMS_REQUIRED, "Sender, name, and message are"));
    }
    return sendMail({
      to: process.env.EMAIL_CONTACT_US,
      subject: "Enquiry or Issue",
      html: `<p><b>From:</b> ${name} (${sender})</p><p>${message}</p>`,
    });
  }

  // ── Startup: resume any pending scheduled jobs ────────────────────────────
  async resumePendingJobs() {
    try {
      const now = new Date();
      const pending = await mailRepository.getPendingScheduledAfter(now);
      for (const job of pending) {
        const delay = Math.max(new Date(job.scheduledAt).getTime() - Date.now(), 0);
        const timerId = setTimeout(
          () => this._deliverJob(job._id, { to: job.recipients.primary, cc: job.recipients.cc, subject: job.subject || "Your Momenta moment has arrived!", html: job.htmlContent || "" }),
          delay
        );
        scheduledTimers.set(String(job.wallId), { timerId, jobId: job._id });
        logger.info({ wallId: job.wallId, scheduledAt: job.scheduledAt }, "Resumed pending mail job");
      }
      // mark past-due pending jobs as failed
      await mailRepository.markPastDuePendingAsFailed(now);
      logger.info(`Mail scheduler ready — ${pending.length} job(s) resumed`);
    } catch (err) {
      logger.warn({ err: err.message }, "Could not resume pending mail jobs");
    }
  }

  // Clear all in-process scheduled delivery timers (used on graceful shutdown).
  // Jobs stay "pending" in the DB and are resumed on next startup.
  clearAllTimers() {
    scheduledTimers.forEach((entry) => clearTimeout(entry.timerId));
    scheduledTimers.clear();
  }
}

module.exports = new MailService();
