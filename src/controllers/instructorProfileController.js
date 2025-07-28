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


module.exports = { getInstructorProfile };