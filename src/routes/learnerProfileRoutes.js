// routes/learnerProfileRoutes.js
const express = require("express");
const { getLearnerProfile, saveLearnerProfile } = require("../controllers/learnerProfileController");
const verifyToken = require("../middlewares/authMiddleware");

const router = express.Router();

// Get current learner profile
router.get("/me", verifyToken, getLearnerProfile);

// Save or update learner profile
router.post("/save-profile", verifyToken, saveLearnerProfile);

module.exports = router;
