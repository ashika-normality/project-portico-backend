// src/controllers/authController.js
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Otp = require("../models/otp");
require("dotenv").config();
const InstructorProfile = require("../models/InstructorProfile");
const PendingRegistration = require("../models/pendingRegistration");

// Centralized error handler
const handleError = (res, err, defaultMsg) => {
  console.error("Registration error:", err.message);

  // Mongoose validation errors or custom schema errors
  if (err.name === "ValidationError" || err.message.includes("must have")) {
    return res.status(400).json({ message: err.message });
  }

  // Duplicate key error (e.g., email uniqueness violation)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ message: `${field} already exists.` });
  }

  res.status(500).json({ message: defaultMsg });
};

// --------------------- Learner Registration ---------------------
const registerLearner = async (req, res) => {
  try {
    const { firstName, lastName, email, mobile } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered." });
    }

    const newUser = new User({
      firstName,
      lastName,
      email,
      mobile,
      role: "learner",
    });

    await newUser.save();

    res.status(201).json({
      message: `Learner account for ${email} created successfully!`,
    });
  } catch (err) {
    handleError(res, err, "Something went wrong during learner registration.");
  }
};

// --------------------- Instructor Registration ---------------------
const registerInstructor = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      givenName,
      nickName,
      email,
      mobile,
      address,
      drivingLicenseNumber,
      instructorLicenseNumber,
      wwccNumber,
      drivingSchoolName,
      website,
      bio,
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered." });
    }

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

// --------------------- Token Generation ---------------------
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

// --------------------- Login ---------------------
const login = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: `User with email ${email} not found` });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.status(200).json({ accessToken, refreshToken, role: user.role });
  } catch (err) {
    handleError(res, err, "Something went wrong during login.");
  }
};

// --------------------- OTP Handling ---------------------
const sendOtp = async (req, res) => {
  try {
    const { identifier } = req.body;
    const user = await User.findOne({
      $or: [{ email: identifier }, { mobile: identifier }],
    });
    if (!user) {
      return res.status(404).json({ message: "User not found for this identifier." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const otpEntry = new Otp({ identifier, otp, expiresAt });
    await otpEntry.save();

    res.status(200).json({
      message: `OTP sent to ${otpEntry.identifier}`,
      data: { identifier: otpEntry.identifier, otp: otpEntry.otp, expiresAt: otpEntry.expiresAt },
    });
  } catch (err) {
    handleError(res, err, "Failed to send OTP.");
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { identifier, otp } = req.body;
    const otpEntry = await Otp.findOne({ identifier, otp });

    if (!otpEntry) return res.status(400).json({ message: "Invalid OTP." });
    if (otpEntry.expiresAt < new Date()) return res.status(400).json({ message: "OTP has expired." });

    await Otp.deleteOne({ _id: otpEntry._id });

    const user = await User.findOne({
      $or: [{ email: identifier }, { mobile: identifier }],
    });
    if (!user) return res.status(404).json({ message: "User not found for this identifier." });

    const { accessToken, refreshToken } = generateTokens(user);
    await user.save();

    res.status(200).json({ message: "OTP verified successfully.", accessToken, refreshToken });
  } catch (err) {
    handleError(res, err, "Failed to verify OTP.");
  }
};

const resendOtp = async (req, res) => {
  try {
    const { identifier } = req.body;

    const [user, pendingUser] = await Promise.all([
      User.findOne({ $or: [{ email: identifier }, { mobile: identifier }] }),
      PendingRegistration.findOne({ $or: [{ identifier }, { email: identifier }, { mobile: identifier }] }),
    ]);

    if (!user && !pendingUser) {
      return res.status(404).json({ message: "User not found for this identifier." });
    }

    await Otp.deleteMany({ identifier });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const otpEntry = new Otp({ identifier, otp, expiresAt });
    await otpEntry.save();

    res.status(200).json({
      message: `OTP sent to ${otpEntry.identifier}`,
      data: { identifier: otpEntry.identifier, otp: otpEntry.otp, expiresAt: otpEntry.expiresAt },
    });
  } catch (err) {
    handleError(res, err, "Failed to resend OTP.");
  }
};

// --------------------- Token Verification ---------------------
const verifyToken = async (req, res) => {
  try {
    const token = req.body.token || req.query.token || req.headers["x-access-token"];
    if (!token) return res.status(403).json({ message: "No token provided." });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.status(401).json({ message: "Unauthorized! Invalid token." });
      req.user = decoded;
      res.status(200).json({ message: "Token is valid.", user: req.user });
    });
  } catch (err) {
    handleError(res, err, "Failed to verify token.");
  }
};

// --------------------- Refresh Token ---------------------
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: "Refresh token required." });

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      console.error("Refresh token verification error:", err.message);
      if (err.name === "TokenExpiredError") return res.status(401).json({ message: "Refresh token expired." });
      return res.status(401).json({ message: "Invalid refresh token." });
    }

    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: "User associated with token not found." });

    const newAccessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    handleError(res, err, "Failed to refresh token due to a server error.");
  }
};

// --------------------- Instructor Registration Initiate ---------------------
const registerInstructorInitiate = async (req, res) => {
  try {
    const {
      firstName, lastName, givenName, nickName, email, mobile,
      addressLine1, addressLine2, city, state, country, postcode,
      drivingLicenseNumber, instructorLicenseNumber, wwccNumber,
      drivingSchoolName, website, bio
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered." });

    const address = { line1: addressLine1, line2: addressLine2, city, state, country, postcode };

    const getFileName = (field) => req.files?.[field]?.[0]?.filename || null;
    const fileUploads = {
      profileImage: getFileName("profileImage"),
      drivingLicenseFront: getFileName("drivingLicenseFront"),
      drivingLicenseBack: getFileName("drivingLicenseBack"),
    };

    const pending = new PendingRegistration({
      identifier: email,
      registrationData: { firstName, lastName, givenName, nickName, email, mobile, address, drivingLicenseNumber, instructorLicenseNumber, wwccNumber, drivingSchoolName, website, bio, ...fileUploads },
    });
    await pending.save();

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const otpEntry = new Otp({ identifier: email, otp, expiresAt });
    await otpEntry.save();

    res.status(200).json({
      message: `OTP sent to ${otpEntry.identifier}`,
      data: { identifier: otpEntry.identifier, otp: otpEntry.otp, expiresAt: otpEntry.expiresAt },
    });
  } catch (err) {
    handleError(res, err, "Failed to initiate registration.");
  }
};

// --------------------- Instructor Registration Verify ---------------------
const registerInstructorVerify = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpEntry = await Otp.findOne({ identifier: email, otp });
    if (!otpEntry || otpEntry.expiresAt < new Date()) return res.status(400).json({ message: "Invalid or expired OTP." });

    const pending = await PendingRegistration.findOne({ identifier: email });
    if (!pending) return res.status(400).json({ message: "No pending registration found." });

    const data = pending.registrationData;

    const newUser = new User({
      firstName: data.firstName,
      lastName: data.lastName,
      givenName: data.givenName,
      nickName: data.nickName,
      email: data.email,
      mobile: data.mobile,
      address: data.address,
      role: "instructor",
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
    });
    await instructorProfile.save();

    await Otp.deleteMany({ identifier: email });
    await PendingRegistration.deleteOne({ identifier: email });

    res.status(201).json({ message: "Registration completed successfully!" });
  } catch (err) {
    handleError(res, err, "Failed to complete registration.");
  }
};

// --------------------- Exports ---------------------
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
};
