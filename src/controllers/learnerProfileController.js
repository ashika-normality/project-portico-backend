const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv").config();
const User = require("../models/userModel");
const LearnerProfile = require("../models/learnerProfileModel");

// --------------------- GET LEARNER PROFILE ---------------------
const getLearnerProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("User ID from token:", userId);

    const profile = await LearnerProfile.findOne({ user: userId })
      .populate({
        path: "user",
        select: "-refreshTokens -__v", 
      });

    if (!profile) {
      return res.status(404).json({ message: "Learner profile not found" });
    }

    res.status(200).json(profile);
  } catch (error) {
    console.error("Error fetching learner profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// --------------------- SAVE/UPDATE LEARNER PROFILE ---------------------
const saveLearnerProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = req.body;

    if (!data || typeof data !== "object") {
      return res.status(400).json({ message: "Valid JSON data is required" });
    }

    console.log("User ID from token:", userId);
    console.log("Received data for save:", data);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Helper to parse date strings
    const parseDate = (dateStr) => (dateStr ? new Date(dateStr) : undefined);

    // ------------------ Prepare LearnerProfile Data ------------------
    const profileData = {
      user: userId,
      personalDetails: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        gender: data.gender,
        mobile: data.mobile,
        dob: parseDate(data.dob),
        address: {
          line1: data.address1,
          line2: data.address2,
          city: data.city,
          state: data.state,
          country: data.country,
          postcode: data.postcode,
        },
      },
      licenseInfo: {
        hasLicense: data.hasLicense !== undefined ? data.hasLicense : true,
        licenseType: data.licenseType,
        licenseNumber: data.licenseNumber,
        issueDate: parseDate(data.licenseIssueDate),
        expiryDate: parseDate(data.licenseExpiryDate),
      },
      paymentMethods: data.paymentMethods || [], // array of card objects
      emergencyContact: data.emergencyContact || {}, // object: name, relationship, phone, email
    };

    // ------------------ Update User model fields ------------------
    const userUpdates = {};
    if (data.firstName) userUpdates.firstName = data.firstName;
    if (data.lastName) userUpdates.lastName = data.lastName;
    if (data.mobile) userUpdates.mobile = data.mobile;
    if (data.email) userUpdates.email = data.email; // only if allowed

    // Update user address if any address fields provided
    if (
      data.address1 ||
      data.address2 ||
      data.city ||
      data.state ||
      data.postcode ||
      data.country
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

    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(userId, { $set: userUpdates }, { new: true });
    }

    // ------------------ Upsert LearnerProfile ------------------
    const options = { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true };
    const updatedProfile = await LearnerProfile.findOneAndUpdate(
      { user: userId },
      { $set: profileData },
      options
    );

    res.status(200).json({
      message: "Learner profile saved successfully",
      profile: updatedProfile,
    });
  } catch (error) {
    console.error("Error saving learner profile:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = { getLearnerProfile, saveLearnerProfile };
