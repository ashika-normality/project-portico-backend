const express = require("express");
const { sendOtp, verifyOtp, resendOtp } = require("../controllers/authController");
const router = express.Router();

// OTP routes
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);

module.exports = router;