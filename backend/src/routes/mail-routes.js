const express = require("express");
const router = express.Router();
const mailController = require("../controllers/mail-controller");
const { verifyToken } = require("../middleware/auth");

router.post("/send-mail",                         verifyToken, mailController.scheduleEmail);
router.get("/scheduled/:wallId",                  verifyToken, mailController.getScheduleDeliveryEmailsByWallId);
router.post("/send-contact-email",                mailController.sendContactEmail);
router.delete("/remove/:wallId/:recipient",       verifyToken, mailController.removeRecipient);
router.delete("/cancel/:wallId",                  verifyToken, mailController.cancelMailScheduled);
module.exports = router;
