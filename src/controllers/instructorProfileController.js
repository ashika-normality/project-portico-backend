const express = require("express");

const mongoose = require('mongoose');
const dotenv = require("dotenv").config();
const User = require("../models/userModel");
const InstructorProfile = require("../models/InstructorProfile");

const getInstructorProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("User ID from token:", userId);

    const profile = await InstructorProfile.findOne({ user: userId })
      .populate({
        path: 'user',
        select: '-refreshTokens -__v'  // Optional: exclude sensitive/internal fields
      });

    if (!profile) {
      return res.status(404).json({ message: "Instructor profile not found" });
    }

    res.status(200).json(profile);
  } catch (error) {
    console.error("Error fetching instructor profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const saveInstructorProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = req.body;

    // 🔒 Safety check
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ message: "Valid JSON data is required" });
    }

    console.log("User ID from token:", userId);
    console.log("Received data for save:", data);

    // ✅ 1. Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ 2. Helper: Convert date strings to Date objects (if valid)
    const parseDate = (dateStr) => {
      return dateStr ? new Date(dateStr) : undefined;
    };

    // ✅ 3. Prepare InstructorProfile data — match exact schema
    const profileData = {
      user: userId,

      // License Info
      drivingLicenseNumber: data.licenseNumber,
      drivingLicenseExpiry: parseDate(data.drivingLicenseExpiry),
      stateIssued: data.stateIssued,

      cardStockNumber: data.cardStockNumber,

      // Instructor License
      instructorLicenseNumber: data.instructorLicenseNumber,
      instructorLicenseCondition: data.instructorLicenseConditions, // Note: plural in payload
      instructorLicenseExpiry: parseDate(data.instructorLicenseExpiry),
      instructorLicenseStateIssued: data.instructorLicenseStateIssued,

      // WWCC
      wwccNumber: data.wwccNumber,
      wwccExpiry: parseDate(data.wwccExpiry),
      wwccStateIssued: data.wwccStateIssued,
      wwccType: data.wwccType,

      // Business & ABN
      abn: data.abn,
      drivingSchoolName: data.businessName,
      businessType: data.businessType,

      // Experience
      totalExperience: data.totalExperience,
      experienceDate: parseDate(data.experienceDate),

      // Skills
      languages: data.languages,

      // Bio
      bio: data.aboutMe,

      // Address (line1, line2 → line1, line2)
      address: {
        line1: data.address1,
        line2: data.address2,
        city: data.city,
        state: data.state,
        country: data.country,
        postcode: data.postcode,
      },

      // Media (not in payload yet — leave empty)
      profileImage: user.profilePhotoUrl || null,
      drivingLicenseFront: "",
      drivingLicenseBack: "",
      instructorLicenseFront: "",
      instructorLicenseBack: "",
    };

    // 🛠️ 4. Update User model with shared fields
    const userUpdates = {};

    if (data.firstName) userUpdates.firstName = data.firstName;
    if (data.lastName) userUpdates.lastName = data.lastName;
    if (data.nickName) userUpdates.nickName = data.nickName;
    if (data.mobile) userUpdates.mobile = data.mobile;
    if (data.email) userUpdates.email = data.email; // ⚠️ Only allow if email edits are permitted
    if (data.dob) userUpdates.dob = parseDate(data.dob);
    if (data.gender) userUpdates.gender = data.gender; // if you add gender to User schema later

    // Update address in User
    if (
      data.address1 || data.address2 || data.city || data.state ||
      data.postcode || data.country
    ) {
      userUpdates.address = {
        line1: data.address1 || user.address?.line1 || "",
        line2: data.address2 || user.address?.line2 || "",
        city: data.city || user.address?.city || "",
        state: data.state || user.address?.state || "",
        country: data.country || user.address?.country || "",
        postcode: data.postcode || user.address?.postcode || "",
      };
    }

    // Save user updates if any
    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(userId, { $set: userUpdates }, { new: true });
    }

    // 🛠️ 5. Upsert InstructorProfile
    const options = {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true, // Ensure Mongoose schema validation runs
    };

    const updatedProfile = await InstructorProfile.findOneAndUpdate(
      { user: userId },
      { $set: profileData },
      options
    );

    // ✅ 6. Success Response
    res.status(200).json({
      message: "Instructor profile saved successfully",
      profile: updatedProfile,
    });
  } catch (error) {
    console.error("Error saving instructor profile:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};


module.exports = { getInstructorProfile, saveInstructorProfile };