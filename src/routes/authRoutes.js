const express = require("express");
const { registerLearner, registerInstructor, login } = require("../controllers/authController");
const router = express.Router();

// Learner (student) registration
router.post("/register-learner", registerLearner);
// Instructor registration
router.post("/register-instructor", registerInstructor);
// Login (for both roles)
router.post("/login", login);
// Resend OTP


module.exports = router;
