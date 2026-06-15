const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const {
  validateWallData, validateWallUpdate, validateWallDeletion,
  validateGetWalls, validateSaveParams,
} = require("../middleware/wall-validation");
const { authorizeApproval } = require("../middleware/post-validations");
const wallController = require("../controllers/wall-controller");

// Order matters — specific routes before param routes
router.get("/recents/:emailId",          verifyToken, wallController.getRecentWalls);
router.get("/view-receiver-wall/:token", wallController.viewReceiverWall);
router.get("/",                          verifyToken, validateGetWalls, wallController.getWalls);
router.post("/",                         verifyToken, validateWallData, wallController.createWall);
router.post("/:wallId/invite-link",      verifyToken, wallController.generateInviteLink);
router.post("/:wallId/rotate-view-links", verifyToken, authorizeApproval, wallController.rotateViewLinks);
router.post("/:wallId/accept-invite",    wallController.acceptInvite);
router.get("/:wallId/analytics",         verifyToken, wallController.getWallAnalytics);
router.get("/:wallId",                   verifyToken, wallController.getWall);
router.put("/:wallId",                   verifyToken, validateWallUpdate, wallController.updateWall);
router.delete("/:wallId",               verifyToken, validateWallDeletion, wallController.deleteWall);
router.post("/save/:wallId/:emailId",   verifyToken, validateSaveParams, wallController.saveWall);
router.delete("/save/:wallId/:emailId", verifyToken, validateSaveParams, wallController.removeWall);

module.exports = router;
