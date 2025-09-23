// src/controllers/authController.js
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Otp = require("../models/otp");
require("dotenv").config();
const nodemailer = require("nodemailer");
const InstructorProfile = require("../models/InstructorProfile");
const PendingRegistration = require("../models/pendingRegistration");
const { OAuth2Client } = require('google-auth-library'); // Google login
const fetch = require('node-fetch'); // Facebook login if needed
const axios = require("axios");

// --------------------- ERROR HANDLER ---------------------
const handleError = (res, err, defaultMsg) => {
  console.error("=== BACKEND ERROR ===");
  console.error("Error name:", err.name);
  console.error("Error message:", err.message);
  console.error("Error code:", err.code);

  let errorMessage = err.message || defaultMsg;
  let statusCode = 500;

  if (err.name === "ValidationError") {
    statusCode = 400;
    errorMessage = err.message;
  } else if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    errorMessage = `${field} already exists.`;
  } else if (err.name === "MongoNetworkError" || err.name === "MongoServerSelectionError") {
    statusCode = 500;
    errorMessage = "Database connection error. Please try again later.";
  }

  console.error("Sending error to frontend:", errorMessage);
  return res.status(statusCode).json({
    message: errorMessage,
    errorType: err.name,
    errorCode: err.code
  });
};

// --------------------- EMAIL SETUP FOR OTP ---------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

transporter.verify(function (error, success) {
  if (error) {
    console.log("Nodemailer connection error:", error);
  } else {
    console.log("Nodemailer is ready to send emails");
  }
});

const sendOtpEmail = async (email, otp) => {
  const mailOptions = {
    from: `"Portico OTP" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
  };
  await transporter.sendMail(mailOptions);
};

// --------------------- TOKEN GENERATION ---------------------
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
  const refreshToken = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "5d" }
  );
  return { accessToken, refreshToken };
};

// --------------------- LEARNER REGISTRATION ---------------------
const registerLearner = async (req, res) => {
  try {
    const { firstName, lastName, email, mobile } = req.body;

    if (!firstName || !lastName || !email || !mobile) {
      return res.status(400).json({
        message: "All fields are required: firstName, lastName, email, mobile"
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered." });

    const newUser = new User({
      firstName,
      lastName,
      email,
      mobile,
      role: "learner",
    });

    await newUser.save();

    console.log("=== Learner saved in DB ===", newUser.toObject());
    res.status(201).json({
      message: `Learner account for ${email} created successfully!`,
    });
  } catch (err) {
    handleError(res, err, err.message);
  }
};

// --------------------- INSTRUCTOR REGISTRATION ---------------------
const registerInstructor = async (req, res) => {
  try {
    const {
      firstName, lastName, givenName, nickName, email, mobile,
      address, drivingLicenseNumber, instructorLicenseNumber,
      wwccNumber, drivingSchoolName, website, bio
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered." });

    const newUser = new User({
      firstName,
      lastName,
      givenName,
      nickName,
      email,
      mobile,
      address,
      role: "instructor",
    });

    await newUser.save();

    const profilePhotoUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const instructorProfile = new InstructorProfile({
      user: newUser._id,
      drivingLicenseNumber,
      instructorLicenseNumber,
      wwccNumber,
      drivingSchoolName,
      website,
      bio,
      profilePhotoUrl,
      address,
    });

    await instructorProfile.save();

    res.status(201).json({
      message: `Instructor account for ${email} created successfully!`,
    });
  } catch (err) {
    handleError(res, err, "Something went wrong during instructor registration.");
  }
};

// --------------------- LOGIN ---------------------
const login = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: `User with email ${email} not found` });

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.status(200).json({ accessToken, refreshToken, role: user.role });
  } catch (err) {
    handleError(res, err, "Something went wrong during login.");
  }
};

// --------------------- OTP HANDLING ---------------------
const sendOtp = async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ message: "Email or mobile required." });

    const user = await User.findOne({
      $or: [
        { email: { $regex: `^${identifier}$`, $options: "i" } },
        { mobile: identifier }
      ]
    });

    if (!user) return res.status(404).json({ message: `User with identifier ${identifier} not found.` });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.deleteMany({ identifier });

    const otpEntry = new Otp({ identifier, otp, expiresAt });
    await otpEntry.save();

    await sendOtpEmail(identifier, otp);

    res.status(200).json({ message: `OTP sent to ${identifier}`, requiresOtp: true });
  } catch (err) {
    handleError(res, err, "Failed to send OTP.");
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { identifier, otp } = req.body;
    if (!identifier || !otp) return res.status(400).json({ message: "Identifier and OTP are required." });

    const otpEntry = await Otp.findOne({ identifier }).sort({ createdAt: -1 });
    if (!otpEntry) return res.status(400).json({ message: "Invalid OTP." });
    if (otpEntry.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: otpEntry._id });
      return res.status(400).json({ message: "OTP has expired." });
    }
    if (otpEntry.otp !== otp) return res.status(400).json({ message: "Invalid OTP." });

    await Otp.deleteOne({ _id: otpEntry._id });

    const user = await User.findOne({
      $or: [
        { email: { $regex: `^${identifier}$`, $options: "i" } },
        { mobile: identifier }
      ]
    });
    if (!user) return res.status(404).json({ message: "User not found for this identifier." });

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.status(200).json({ message: "OTP verified successfully.", accessToken, refreshToken });
  } catch (err) {
    handleError(res, err, "Failed to verify OTP.");
  }
};

const resendOtp = async (req, res) => {
  try {
    const { identifier } = req.body;

    const user = await User.findOne({
      $or: [
        { email: { $regex: `^${identifier}$`, $options: "i" } },
        { mobile: identifier }
      ]
    });
    if (!user) return res.status(404).json({ message: "User not found for this identifier." });

    await Otp.deleteMany({ identifier });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const otpEntry = new Otp({ identifier, otp, expiresAt });
    await otpEntry.save();

    await sendOtpEmail(identifier, otp);

    res.status(200).json({ message: `OTP resent to ${identifier}` });
  } catch (err) {
    handleError(res, err, "Failed to resend OTP.");
  }
};

// --------------------- SOCIAL LOGIN ---------------------
const socialLogin = async (req, res) => {
  try {
    const { provider, token } = req.body;
    if (!provider || !token) return res.status(400).json({ message: "Provider and token required." });

    let userData;

    if (provider === "google") {
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      userData = {
        email: payload.email,
        firstName: payload.given_name,
        lastName: payload.family_name,
        profilePhotoUrl: payload.picture || null,
      };
      console.log("=== Google payload ===", payload);
      console.log("=== Profile picture URL ===", payload.picture);
    } else if (provider === "facebook") {
      // Existing Facebook code
    } else {
      return res.status(400).json({ message: "Unsupported provider." });
    }

    // Check if user exists
    let user = await User.findOne({ email: userData.email });

    if (!user) {
      // Create new user with profile photo
      user = new User({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        profilePhotoUrl: userData.profilePhotoUrl, // Make sure this is saved
        role: "learner",
        signupMethod: provider,
      });
      await user.save();
      console.log("=== New social user created with profile photo ===", user.profilePhotoUrl);
    } else {
      console.log("=== Existing user profile photo ===", user.profilePhotoUrl);
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.status(200).json({
      accessToken,
      refreshToken,
      role: user.role,
      profilePhotoUrl: user.profilePhotoUrl || null, // Make sure this is returned
      message: "Login successful.",
    });

  } catch (err) {
    console.error("Social login backend error:", err.message);
    res.status(500).json({ message: "Social login failed." });
  }
};


// --------------------- TOKEN VERIFICATION ---------------------
const verifyToken = async (req, res) => {
  try {
    const token = req.body.token || req.query.token || req.headers["x-access-token"];
    if (!token) return res.status(403).json({ message: "No token provided." });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.status(401).json({ message: "Unauthorized! Invalid token." });
      req.user = decoded;
      console.log("=== Token verified ===", decoded);
      res.status(200).json({ message: "Token is valid.", user: req.user });
    });
  } catch (err) {
    handleError(res, err, "Failed to verify token.");
  }
};


// --------------------- REFRESH TOKEN ---------------------
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: "Refresh token required." });

    let payload;
    try {
      // ✅ Use the same secret as access tokens
      payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      console.error("Refresh token verification error:", err.message);
      if (err.name === "TokenExpiredError") return res.status(401).json({ message: "Refresh token expired." });
      return res.status(401).json({ message: "Invalid refresh token." });
    }

    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: "User associated with token not found." });

    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" } // same as before
    );

    console.log("=== Access token refreshed for user ===", user.email);

    res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    handleError(res, err, "Failed to refresh token due to a server error.");
  }
};



// --------------------- INSTRUCTOR REGISTRATION WITH OTP (STEP 1: INITIATE) ---------------------
const registerInstructorInitiate = async (req, res) => {
  try {
    const {
      firstName, lastName, givenName, nickName, email, mobile,
      addressLine1, addressLine2, city, state, country, postcode,
      drivingLicenseNumber, instructorLicenseNumber, wwccNumber,
      drivingSchoolName, website, bio
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already registered.' });

    const address = { line1: addressLine1, line2: addressLine2, city, state, country, postcode };
    const getFileName = (field) => req.files?.[field]?.[0]?.filename || null;
    const fileUploads = {
      profileImage: getFileName('profileImage'),
      drivingLicenseFront: getFileName('drivingLicenseFront'),
      drivingLicenseBack: getFileName('drivingLicenseBack'),
      instructorLicenseFront: getFileName('instructorLicenseFront'),
      instructorLicenseBack: getFileName('instructorLicenseBack')
    };

    const pending = new PendingRegistration({
      identifier: email,
      registrationData: {
        firstName, lastName, givenName, nickName, email, mobile,
        address,
        drivingLicenseNumber, instructorLicenseNumber, wwccNumber,
        drivingSchoolName, website, bio,
        ...fileUploads
      },
    });
    await pending.save();

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await Otp.create({ identifier: email, otp, expiresAt });

    res.status(200).json({
      message: `OTP sent to ${email}`,
      data: { identifier: email, otp, expiresAt }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to initiate instructor registration.' });
  }
};

// --------------------- INSTRUCTOR REGISTRATION WITH OTP (STEP 2: VERIFY) ---------------------
const registerInstructorVerify = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpEntry = await Otp.findOne({ identifier: email, otp });
    if (!otpEntry || otpEntry.expiresAt < new Date()) return res.status(400).json({ message: 'Invalid or expired OTP.' });

    const pending = await PendingRegistration.findOne({ identifier: email });
    if (!pending) return res.status(400).json({ message: 'No pending registration found.' });

    const data = pending.registrationData;

    const newUser = new User({
      firstName: data.firstName,
      lastName: data.lastName,
      givenName: data.givenName,
      nickName: data.nickName,
      email: data.email,
      mobile: data.mobile,
      address: data.address,
      role: 'instructor',
    });
    await newUser.save();

    const instructorProfile = new InstructorProfile({
      user: newUser._id,
      drivingLicenseNumber: data.drivingLicenseNumber,
      instructorLicenseNumber: data.instructorLicenseNumber,
      wwccNumber: data.wwccNumber,
      drivingSchoolName: data.drivingSchoolName,
      website: data.website,
      bio: data.bio,
      address: data.address,
      profilePhotoUrl: data.profileImage ? `/uploads/${data.profileImage}` : null,
      drivingLicenseFrontUrl: data.drivingLicenseFront ? `/uploads/${data.drivingLicenseFront}` : null,
      drivingLicenseBackUrl: data.drivingLicenseBack ? `/uploads/${data.drivingLicenseBack}` : null,
      instructorLicenseFrontUrl: data.instructorLicenseFront ? `/uploads/${data.instructorLicenseFront}` : null,
      instructorLicenseBackUrl: data.instructorLicenseBack ? `/uploads/${data.instructorLicenseBack}` : null
    });
    await instructorProfile.save();

    await Otp.deleteMany({ identifier: email });
    await PendingRegistration.deleteOne({ identifier: email });

    res.status(201).json({ message: 'Instructor registration completed successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to complete instructor registration.' });
  }
};

// --------------------- EXPORTS ---------------------
module.exports = {
  registerLearner,
  registerInstructor,
  login,
  sendOtp,
  verifyOtp,
  resendOtp,
  verifyToken,
  refreshToken,
  registerInstructorInitiate,
  registerInstructorVerify,
  socialLogin,
};
