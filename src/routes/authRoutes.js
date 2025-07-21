const express = require("express");
const { registerLearner, registerInstructor, login, refreshToken } = require("../controllers/authController");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");
const authController = require("../controllers/authController");

// Learner (student) registration
router.post("/register-learner", registerLearner);
// Instructor registration
router.post("/register-instructor", upload.single('photograph'), registerInstructor);
// Instructor registration with OTP (step 1: initiate)
router.post("/register-instructor-initiate", upload.single('photograph'), authController.registerInstructorInitiate);
// Instructor registration with OTP (step 2: verify)
router.post("/register-instructor-verify", authController.registerInstructorVerify);
// Login (for both roles)
router.post("/login", login);
// Refresh token endpoint
router.post("/refresh-token", refreshToken);
// Resend OTP


module.exports = router;
