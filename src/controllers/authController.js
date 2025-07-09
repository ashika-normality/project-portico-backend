// src/controllers/authController.js (add this function)
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Otp = require("../models/Otp");
require("dotenv").config();
const InstructorProfile = require("../models/InstructorProfile");

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
    const { firstName, lastName, email, mobile, address, drivingLicenseNumber, instructorLicenseNumber, wwccNumber, drivingSchoolName, website, bio, photographUrl } = req.body;
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered.' });
    }
    // Create new instructor user
    const newUser = new User({
      firstName,
      lastName,
      email,
      mobile,
      address,
      role: 'instructor',
    });
    await newUser.save();
    // Create instructor profile
    const instructorProfile = new InstructorProfile({
      user: newUser._id,
      drivingLicenseNumber,
      instructorLicenseNumber,
      wwccNumber,
      drivingSchoolName,
      website,
      bio,
      photographUrl,
      address,
    });
    await instructorProfile.save();
    res.status(201).json({ message: `Instructor account for ${email} created successfully!` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong during instructor registration.' });
  }
};

// Login (stub, since no password in User model)
const login = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: `User with email ${email} not found` });
    }
    // Password check would go here if password was stored
    // const isMatch = await bcrypt.compare(password, user.password);
    // if (!isMatch) { ... }
    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.status(200).json({ token, role: user.role });
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

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ message: 'OTP verified successfully.', token });

  }
  catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to verify OTP.' });
  }
}

const resendOtp = async (req, res) => {
  try {
    const { identifier } = req.body;
    // Check if user exists by email or mobile
    const user = await User.findOne({ $or: [ { email: identifier }, { mobile: identifier } ] });
    if (!user) {
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
    // Here you would send the OTP via email or SMS (not implemented)
    res.status(200).json({ message: `OTP: ${otpEntry} resent to ${identifier}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to resend OTP.' });
  }
}

module.exports = {
  registerLearner,
  registerInstructor,
  login,
  sendOtp,
  verifyOtp,
  resendOtp
};

