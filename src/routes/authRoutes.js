const express = require("express");
const {
  sendOtp,
  verifyOtp,
  resendOtp,
  login,
  registerLearner,
  registerInstructor,
  verifyToken,
  refreshToken,
  registerInstructorInitiate,
  registerInstructorVerify,
  socialLogin, // added
} = require("../controllers/authController");

const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");

// ------------------ LEARNER REGISTRATION ------------------
router.post("/register-learner", registerLearner);

// ------------------ INSTRUCTOR REGISTRATION ------------------
router.post("/register-instructor", upload.single("photograph"), registerInstructor);

// ------------------ INSTRUCTOR REGISTRATION OTP ------------------
router.post("/register-instructor-initiate", upload.fields([
  { name: "profileImage", maxCount: 1 },
  { name: "drivingLicenseFront", maxCount: 1 },
  { name: "drivingLicenseBack", maxCount: 1 },
  { name: "instructorLicenseFront", maxCount: 1 },
  { name: "instructorLicenseBack", maxCount: 1 },
]), registerInstructorInitiate);

router.post("/register-instructor-verify", registerInstructorVerify);

// ------------------ LOGIN ------------------
router.post("/login", login);

// ------------------ SOCIAL LOGIN ------------------
router.post("/social-login", socialLogin);

// ------------------ TOKEN ENDPOINTS ------------------
router.post("/verify-token", verifyToken);
router.post("/refresh-token", refreshToken);

// ------------------ OTP ROUTES ------------------
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);

module.exports = router;
