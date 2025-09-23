const express = require("express");
const { sendOtp, verifyOtp, resendOtp } = require("../controllers/authController");
const router = express.Router();

// --------------------- OTP ROUTES ---------------------
// Send OTP to email or mobile
router.post("/send-otp", sendOtp);

// Verify OTP entered by user
router.post("/verify-otp", verifyOtp);

// Resend OTP if user requests
router.post("/resend-otp", resendOtp);

module.exports = router;
