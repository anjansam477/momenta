const mailService = require("../services/mail-service");
const wallRepository = require("../repositories/wall-repository");
const userRepository = require("../repositories/user-repository");
const { mailLimiter } = require("../middleware/rate-limiter");
const Response = require("../utils/error-handler");
const { emailTemplates } = require("../templates/email-templates");
const { UI_BASE_URL, SERVICE_BASE_URL } = require("../../environment-config");

exports.scheduleEmail = async (req, res) => {
  const { primary, cc, wallId, scheduledDate, type, token: bodyToken, userEmail } = req.body;
  const resolvedWallId = wallId;

  try {
    if (!primary?.length) {
      throw new Error(Response.generateMessage(Response.errorMessage.PARAMS_REQUIRED, "Email is"));
    }

    let subject, htmlContent;

    switch (type) {
      case "SCHEDULE":
      case "ACCESS": {
        if (!resolvedWallId) throw new Error(Response.generateMessage(Response.errorMessage.PARAMS_REQUIRED, "Wall ID is"));
        const wall = await wallRepository.getWallById(resolvedWallId);
        if (!wall) throw new Error(Response.generateMessage(Response.errorMessage.INVALID_REQUEST, "wall"));
        const user = await userRepository.getUserByEmail(wall.ownerEmail);
        const ownerName = user ? `${user.firstname} ${user.lastname}`.trim() : "Someone";

        if (type === "SCHEDULE") {
          // One job holds every recipient. Each recipient's email (with its own
          // unique view token) is rendered at delivery time from the template +
          // data persisted on the job, so it survives restarts and re-schedules.
          const job = await mailService.scheduleEmail({
            primary, cc: cc || [], subject: wall.title,
            wallId: resolvedWallId, scheduledDate, userEmail, type,
            template: "scheduledDelivery",
            templateData: { creatorName: ownerName, wallName: wall.title },
          });
          return Response.respondOk(res, job);
        } else {
          subject = `Access for ${wall.title}`;
          htmlContent = emailTemplates.accessControl({ wallId: resolvedWallId, creatorName: ownerName, wallName: wall.title, serviceBaseUrl: SERVICE_BASE_URL });
        }
        break;
      }
      default:
        throw new Error("Invalid email type.");
    }

    const result = await mailService.scheduleEmail({
      primary, cc: cc || [], subject, htmlContent,
      wallId: resolvedWallId, scheduledDate, userEmail, type,
    });

    return Response.respondOk(res, result);
  } catch (err) {
    return Response.respondError(res, err);
  }
};

exports.getScheduleDeliveryEmailsByWallId = async (req, res) => {
  const wallId = req.params.wallId;
  try {
    const result = await mailService.getScheduledByWallId(wallId);
    return Response.respondOk(res, result);
  } catch (err) {
    return Response.respondError(res, err);
  }
};

exports.removeRecipient = async (req, res) => {
  const { wallId, recipient } = req.params;
  try {
    await mailService.removeRecipient(wallId, recipient);
    return Response.respondOk(res, { message: Response.generateMessage(Response.successMessage.DELETE_DOCUMENT, "recipient") });
  } catch (err) {
    return Response.respondError(res, err);
  }
};

exports.cancelMailScheduled = async (req, res) => {
  const { wallId } = req.params;
  try {
    await mailService.cancelMail(wallId);
    return Response.respondOk(res, { message: Response.generateMessage(Response.successMessage.DELETE_DOCUMENT, "scheduled mail") });
  } catch (err) {
    return Response.respondError(res, err);
  }
};

exports.sendContactEmail = [
  mailLimiter,
  async (req, res) => {
    const { email, name, message } = req.body;
    try {
      await mailService.sendContactMail(email, name, message);
      return Response.respondOk(res, { message: Response.generateMessage(Response.successMessage.MAIL_SCHEDULED, "Email") });
    } catch (err) {
      return Response.respondError(res, err);
    }
  },
];
