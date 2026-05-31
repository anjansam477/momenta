const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const event_controller = require("../controllers/event-controller");


router.get("/:emailId", verifyToken, event_controller.getEventsbyOrganization);

module.exports = router;