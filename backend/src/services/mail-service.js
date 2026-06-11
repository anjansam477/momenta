const nodemailer = require("nodemailer");
const cron = require("node-cron");
const mailRepository = require("../repositories/mail-repository");
const { emailTemplates } = require("../templates/email-templates");
const Response = require("../utils/error-handler");
const logger = require("../utils/logger");
const auth = require("../middleware/auth");
const { SERVICE_BASE_URL } = require("../../environment-config");

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
    const { primary, cc, subject, htmlContent, wallId, scheduledDate, type, template, templateData } = emailDetails;

    if (!type) throw new Error(Response.generateMessage(Response.errorMessage.PARAMS_REQUIRED, "Type is"));
    if (!primary?.length) {
      throw new Error(Response.generateMessage(Response.errorMessage.PARAMS_REQUIRED, "Email is"));
    }

    if (type === "SCHEDULE") {
      if (!subject || !template) {
        throw new Error(Response.generateMessage(Response.errorMessage.PARAMS_REQUIRED, "Subject and template are"));
      }

      // One job per wall. Replace any existing pending schedule for this wall so a
      // re-schedule doesn't leave orphan jobs/timers firing duplicate emails.
      const existing = await mailRepository.getSchedulesByWallIdAndType(wallId, "SCHEDULE");
      if (existing) {
        this._clearTimer(wallId);
        await mailRepository.cancelByWallId(wallId);
      }

      const job = await mailRepository.createJob({
        type,
        wallId,
        recipients: { primary, cc: cc || [] },
        scheduledAt: new Date(scheduledDate),
        status: "pending",
        subject,
        template,
        templateData: templateData || {},
      });

      const delay = Math.max(new Date(scheduledDate).getTime() - Date.now(), 0);
      const timerId = setTimeout(() => this._deliverScheduledJob(job._id), delay);
      scheduledTimers.set(String(wallId), { timerId, jobId: job._id });
      return job;
    }

    // Immediate send (ACCESS, etc.) — one email to everyone, body already rendered.
    if (!subject || !htmlContent) {
      throw new Error(Response.generateMessage(Response.errorMessage.PARAMS_REQUIRED, "Subject and content are"));
    }
    const job = await mailRepository.createJob({
      type,
      wallId: wallId || null,
      recipients: { primary, cc: cc || [] },
      scheduledAt: null,
      status: "pending",
      subject,
      htmlContent,
    });
    try {
      await sendMail({ to: primary, cc, subject, html: htmlContent });
      await mailRepository.markSent(job._id);
    } catch (err) {
      logger.error({ err: err.message, jobId: job._id }, "Mail delivery failed");
      await mailRepository.markFailed(job._id, err.message);
    }
    return job;
  }

  /**
   * Deliver a scheduled job, reading the freshest copy from the DB so it reflects
   * any recipient removals / cancellation since the timer was set. Each recipient
   * gets their own rendered email (and unique view token), so this is fully
   * restart-safe — nothing depends on an in-process closure.
   */
  async _deliverScheduledJob(jobId) {
    try {
      const job = await mailRepository.getJobById(jobId);
      if (!job || job.status !== "pending") return;

      const recipients = job.recipients?.primary || [];
      if (!recipients.length) {
        await mailRepository.cancelByWallId(job.wallId);
        return;
      }

      for (const recipient of recipients) {
        let html = job.htmlContent;
        if (job.template) {
          const token = auth.generateTokenForReceiver(recipient, job.wallId);
          html = emailTemplates[job.template]({
            ...(job.templateData || {}),
            token,
            serviceBaseUrl: SERVICE_BASE_URL,
          });
        }
        await sendMail({ to: recipient, cc: job.recipients?.cc || [], subject: job.subject, html });
      }
      await mailRepository.markSent(jobId);
    } catch (err) {
      logger.error({ err: err.message, jobId }, "Scheduled mail delivery failed");
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
    await mailRepository.removeRecipient(wallId, recipient);
    // The job is rendered per-recipient at fire time from the DB, so dropping a
    // recipient needs no timer reset. If none remain, cancel the whole schedule.
    const job = await mailRepository.getSchedulesByWallIdAndType(wallId, "SCHEDULE");
    if (!job?.recipients?.primary?.length) {
      this._clearTimer(wallId);
      await mailRepository.cancelByWallId(wallId);
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
        const timerId = setTimeout(() => this._deliverScheduledJob(job._id), delay);
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
