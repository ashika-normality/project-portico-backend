// routes/learnerProfileRoutes.js
const express = require("express");
const { getLearnerProfile, saveLearnerProfile, setDefaultCard } = require("../controllers/learnerProfileController");
const verifyToken = require("../middlewares/authMiddleware");

const router = express.Router();

// Get current learner profile
router.get("/me", verifyToken, getLearnerProfile);

// Save or update learner profile
router.post("/save-profile", verifyToken, saveLearnerProfile);

// Make a card default / remove default
router.post("/cards/default/:cardId", verifyToken, setDefaultCard);


module.exports = router;
