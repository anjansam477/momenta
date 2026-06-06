const express = require("express");
const router = express.Router();
const { profilePictureUpload } = require('../config/upload-config');
const user_controller = require("../controllers/user-controller");
const auth = require("../middleware/auth");
const {verifyToken} = require('../middleware/auth');
const { validateUserSignup, validateUserLogin, validateForgotPassword,  validateUpdatePassword, validateUserByEmail, validateUserById, validateUserToken, checkUpdateData } = require("../middleware/user-validations");
const { loginLimiter, signupLimiter, forgotPasswordLimiter, generateTokenLimiter } = require("../middleware/rate-limiter");

router.post("/account/create", signupLimiter, validateUserSignup, user_controller.userSignup);
router.post("/account/login", loginLimiter, validateUserLogin, user_controller.userLogin);
router.post("/account/logout", auth.expireToken);
router.post("/account/password/reset", forgotPasswordLimiter, validateForgotPassword, user_controller.forgotPassword);
router.put("/account/password/update", validateUpdatePassword, user_controller.updatePassword);
router.get("/account/verify", validateUserToken, user_controller.verifyUserEmail);
router.post("/account/verify", generateTokenLimiter, validateUserByEmail, user_controller.generateVerificationToken);

router.get("/", user_controller.getUsers);
router.get("/search/names", verifyToken, user_controller.searchUserNames);
router.get("/name", verifyToken, user_controller.getUserNames);
router.get("/:email", user_controller.getUserByEmail);
router.delete("/:id", verifyToken, validateUserById, user_controller.deleteUser);
router.put("/:userId", verifyToken, validateUserById, checkUpdateData, user_controller.updateUser);

router.get("/profile/:userId", verifyToken, validateUserById, user_controller.removeProfilePicture)
router.put("/profile/picture/:userId", profilePictureUpload, validateUserById, user_controller.uploadProfilePicture);

module.exports = router;