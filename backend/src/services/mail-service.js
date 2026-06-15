const nodemailer = require("nodemailer");
const cron = require("node-cron");
const mailRepository = require("../repositories/mail-repository");
const wallRepository = require("../repositories/wall-repository");
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

// Cron handle for the durable scheduled-delivery poller (one per process).
let schedulerTask = null;

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
      // re-schedule doesn't leave orphan jobs firing duplicate emails.
      const existing = await mailRepository.getSchedulesByWallIdAndType(wallId, "SCHEDULE");
      if (existing) await mailRepository.cancelByWallId(wallId);

      // Just persist the job. The durable poller (startScheduler) claims and
      // delivers it when due — no in-process timer, so it works across multiple
      // instances and survives restarts.
      return mailRepository.createJob({
        type,
        wallId,
        recipients: { primary, cc: cc || [] },
        scheduledAt: new Date(scheduledDate),
        status: "pending",
        subject,
        template,
        templateData: templateData || {},
      });
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

  // ── Durable scheduled-delivery poller ─────────────────────────────────────

  /**
   * Start the minute-by-minute poller. Each tick claims every due job atomically
   * (pending → sending) and delivers it. The atomic claim means multiple API
   * instances can run this safely — only one delivers each job — and a restart
   * simply resumes from the DB. Runs once immediately, then on a cron schedule.
   */
  startScheduler() {
    if (schedulerTask) return;
    this._processDueJobs().catch((err) => logger.warn({ err: err.message }, "Initial mail sweep failed"));
    schedulerTask = cron.schedule("* * * * *", () => {
      this._processDueJobs().catch((err) => logger.warn({ err: err.message }, "Mail sweep failed"));
    });
    logger.info("Scheduled-mail poller started");
  }

  stopScheduler() {
    if (schedulerTask) { schedulerTask.stop(); schedulerTask = null; }
  }

  /** Claim and deliver every currently-due scheduled job. */
  async _processDueJobs() {
    const now = new Date();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const job = await mailRepository.claimDueJob(now);
      if (!job) break;
      await this._deliverClaimedJob(job);
    }
  }

  /**
   * Deliver a job that has already been atomically claimed (status "sending").
   * Each recipient gets their own rendered email + unique view token, so delivery
   * is fully restart-safe. On failure the job is requeued until maxRetries.
   */
  async _deliverClaimedJob(job) {
    try {
      const recipients = job.recipients?.primary || [];
      if (!recipients.length) {
        await mailRepository.cancelByWallId(job.wallId);
        return;
      }

      // Mint links at the wall's current epoch so a later rotation revokes them.
      // Fail open to 0 on a lookup error — a DB hiccup must not drop the email.
      const viewTokenVersion = job.template
        ? (await wallRepository.getViewTokenVersion(job.wallId).catch(() => 0)) || 0
        : 0;
      for (const recipient of recipients) {
        let html = job.htmlContent;
        if (job.template) {
          const token = auth.generateTokenForReceiver(recipient, job.wallId, viewTokenVersion);
          html = emailTemplates[job.template]({
            ...(job.templateData || {}),
            token,
            serviceBaseUrl: SERVICE_BASE_URL,
          });
        }
        await sendMail({ to: recipient, cc: job.recipients?.cc || [], subject: job.subject, html });
      }
      await mailRepository.markSent(job._id);
    } catch (err) {
      logger.error({ err: err.message, jobId: job._id }, "Scheduled mail delivery failed");
      if ((job.retryCount || 0) + 1 < (job.maxRetries || 3)) {
        await mailRepository.requeueJob(job._id);
      } else {
        await mailRepository.markFailed(job._id, err.message);
      }
    }
  }

  async getScheduledByWallId(wallId) {
    const job = await mailRepository.getSchedulesByWallIdAndType(wallId, "SCHEDULE");
    if (!job) return null;
    return { recipients: job.recipients, scheduledAt: job.scheduledAt };
  }

  async removeRecipient(wallId, recipient) {
    await mailRepository.removeRecipient(wallId, recipient);
    // The job is rendered per-recipient at delivery time from the DB, so dropping
    // a recipient needs no extra work. If none remain, cancel the whole schedule.
    const job = await mailRepository.getSchedulesByWallIdAndType(wallId, "SCHEDULE");
    if (!job?.recipients?.primary?.length) {
      await mailRepository.cancelByWallId(wallId);
    }
  }

  async cancelMail(wallId) {
    const job = await mailRepository.getSchedulesByWallIdAndType(wallId, "SCHEDULE");
    if (!job) throw new Error(Response.generateMessage(Response.errorMessage.INVALID_REQUEST, "scheduled mail"));
    if (new Date(job.scheduledAt) <= new Date()) throw new Error(Response.errorMessage.SOMETHING_WENT_WRONG);
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
}

module.exports = new MailService();
