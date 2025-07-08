// src/controllers/authController.js (add this function)
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
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

module.exports = {
  registerLearner,
  registerInstructor,
  login,
};

