// src/controllers/authController.js (add this function)
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Otp = require("../models/Otp");
require("dotenv").config();
const InstructorProfile = require("../models/InstructorProfile");
const PendingRegistration = require("../models/pendingRegistration");
const fs = require('fs');
const path = require('path');

// Register a new learner (student)
const registerLearner = async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, address } = req.body;
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered.' });
    }
    // Create new learner user
    const newUser = new User({
      firstName,
      lastName,
      email,
      mobile,
      address,
      role: 'learner',
    });
    await newUser.save();
    res.status(201).json({ message: `Learner account for ${email} created successfully!` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong during learner registration.' });
  }
};

// Register a new instructor
const registerInstructor = async (req, res) => {
  try {
    const { firstName, lastName, givenName, nickName, email, mobile, address, drivingLicenseNumber, instructorLicenseNumber, wwccNumber, drivingSchoolName, website, bio } = req.body;    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered.' });
    }
    // Create new instructor user
    const newUser = new User({
      firstName,
      lastName,
      givenName,
      nickName,
      email,
      mobile,
      address,
      role: 'instructor',
    });
    await newUser.save();
    // Handle file upload
    const profilePhotoUrl = req.file ? `/uploads/${req.file.filename}` : null;
    // Create instructor profile
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
    res.status(201).json({ message: `Instructor account for ${email} created successfully!` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong during instructor registration.' });
  }
};

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '3d' }
  );
  const refreshToken = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '20d' }
  );
  return { accessToken, refreshToken };
};

// Login (stub, since no password in User model)
const login = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: `User with email ${email} not found` });
    }
    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);
    // Save refresh token to user
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(refreshToken);
    await user.save();
    res.status(200).json({ accessToken, refreshToken, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Something went wrong during login.` });
  }
};

//Login

const sendOtp = async(req, res) => {
  try {
    const { identifier } = req.body; // email or phone
    // Check if user exists by email or mobile
    const user = await User.findOne({ $or: [ { email: identifier }, { mobile: identifier } ] });
    if (!user) {
      return res.status(404).json({ message: 'User not found for this identifier.' });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

    // Save OTP to database
    const otpEntry = new Otp({ identifier, otp, expiresAt });
    await otpEntry.save();

    // Here you would send the OTP via email or SMS (not implemented in this example)
    res.status(200).json({ message: `OTP ${otpEntry} sent to ${identifier}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send OTP.' });
  }
}

const verifyOtp = async(req, res) => {
  try{
    const { identifier, otp } = req.body; // email or phone and OTP
    const otpEntry = await Otp.findOne({ identifier, otp });

    if (!otpEntry) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    if (otpEntry.expiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP has expired.' });
    }

    // OTP is valid, delete it from the database
    await Otp.deleteOne({ _id: otpEntry._id });

    // Find user by email or mobile
    let user = await User.findOne({ $or: [ { email: identifier }, { mobile: identifier } ] });
    if (!user) {
      return res.status(404).json({ message: 'User not found for this identifier.' });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);
    // Save refresh token to user
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.status(200).json({ message: 'OTP verified successfully.', accessToken, refreshToken });

  }
  catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to verify OTP.' });
  }
}

const resendOtp = async (req, res) => {
  try {
    const { identifier } = req.body;

    // Check if user exists in either User (login) or PendingRegistration (signup)
    const [user, pendingUser] = await Promise.all([
      User.findOne({ $or: [{ email: identifier }, { mobile: identifier }] }),
      PendingRegistration.findOne({ $or: [{identifier: identifier}, { email: identifier }, { mobile: identifier }] })
    ]);

    if (!user && !pendingUser) {
      return res.status(404).json({ message: 'User not found for this identifier.' });
    }

    // Delete any existing OTP for this identifier
    await Otp.deleteMany({ identifier });

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save new OTP
    const otpEntry = new Otp({ identifier, otp, expiresAt });
    await otpEntry.save();

    // Send OTP via email/SMS (mock response)
    res.status(200).json({ 
      message: `OTP resent to ${identifier}`,
      otp: otp // (Remove this in production! Only for testing.)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to resend OTP.' });
  }
};

// Refresh token endpoint
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required.' });
    }
    // Verify refresh token
    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid refresh token.' });
    }
    // Find user and check if refresh token is still valid
    const user = await User.findById(payload.id);
    if (!user || !user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ message: 'Refresh token not recognized.' });
    }
    // Generate new access token
    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '3d' }
    );
    res.status(200).json({ accessToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to refresh token.' });
  }
};

// Initiate instructor registration: store data, send OTP, save file
const registerInstructorInitiate = async (req, res) => {
  try {
    const { firstName, lastName, givenName, nickName, email, mobile, address, drivingLicenseNumber, instructorLicenseNumber, wwccNumber, drivingSchoolName, website, bio } = req.body;
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered.' });
    }
    // Remove any previous pending registration for this identifier
    await PendingRegistration.deleteMany({ identifier: email });
    // Save file if present
    let fileName = null;
    if (req.file) {
      fileName = req.file.filename;
    }
    // Save registration data to pending collection
    const pending = new PendingRegistration({
      identifier: email,
      registrationData: {
        firstName, lastName, givenName, nickName, email, mobile, address, drivingLicenseNumber, instructorLicenseNumber, wwccNumber, drivingSchoolName, website, bio
      },
      fileName
    });
    await pending.save();
    // Generate and save OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    const otpEntry = new Otp({ identifier: email, otp, expiresAt });
    await otpEntry.save();
    // Here you would send the OTP via email or SMS (not implemented)
    res.status(200).json({ message: `OTP sent to ${email}. Please verify to complete registration.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to initiate registration.' });
  }
};

// Verify OTP and complete instructor registration
const registerInstructorVerify = async (req, res) => {
  try {
    const { email, otp } = req.body;
    // Check OTP
    const otpEntry = await Otp.findOne({ identifier: email, otp });
    if (!otpEntry) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }
    if (otpEntry.expiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP has expired.' });
    }
    // Find pending registration
    const pending = await PendingRegistration.findOne({ identifier: email });
    if (!pending) {
      return res.status(400).json({ message: 'No pending registration found.' });
    }
    const data = pending.registrationData;
    // Create user
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
    // Move file if present
    let profilePhotoUrl = null;
    if (pending.fileName) {
      profilePhotoUrl = `/uploads/${pending.fileName}`;
    }
    // Create instructor profile
    const instructorProfile = new InstructorProfile({
      user: newUser._id,
      drivingLicenseNumber: data.drivingLicenseNumber,
      instructorLicenseNumber: data.instructorLicenseNumber,
      wwccNumber: data.wwccNumber,
      drivingSchoolName: data.drivingSchoolName,
      website: data.website,
      bio: data.bio,
      profilePhotoUrl,
      address: data.address,
    });
    await instructorProfile.save();
    // Clean up
    await Otp.deleteMany({ identifier: email });
    await PendingRegistration.deleteOne({ identifier: email });
    res.status(201).json({ message: `Instructor account for ${email} created successfully!` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to complete registration.' });
  }
};

module.exports = {
  registerLearner,
  registerInstructor,
  login,
  sendOtp,
  verifyOtp,
  resendOtp,
  refreshToken,
  registerInstructorInitiate,
  registerInstructorVerify
};

