const express = require("express");
const router = express.Router();
const mailController = require("../controllers/mail-controller");
const { verifyToken } = require("../middleware/auth");
const { authorizeApproval } = require("../middleware/post-validations");
const { scheduleMailLimiter } = require("../middleware/rate-limiter");

// authorizeApproval = caller must be owner/maintainer of req.params.wallId. Reused
// here so only wall managers can change/cancel a wall's scheduled delivery (was an
// IDOR — any logged-in user could cancel any wall's schedule by guessing wallId).
router.post("/send-mail",                         verifyToken, scheduleMailLimiter, mailController.scheduleEmail);
router.get("/scheduled/:wallId",                  verifyToken, mailController.getScheduleDeliveryEmailsByWallId);
router.post("/send-contact-email",                mailController.sendContactEmail);
router.delete("/remove/:wallId/:recipient",       verifyToken, authorizeApproval, mailController.removeRecipient);
router.delete("/cancel/:wallId",                  verifyToken, authorizeApproval, mailController.cancelMailScheduled);
module.exports = router;
