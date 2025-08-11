const express = require("express");
const { getInstructorProfile, saveInstructorProfile } = require("../controllers/instructorProfileController");
const verifyToken = require("../middlewares/authMiddleware");
const router = express.Router();

router.get('/me',verifyToken, getInstructorProfile);
router.post('/save-profile', verifyToken, saveInstructorProfile);

module.exports = router;