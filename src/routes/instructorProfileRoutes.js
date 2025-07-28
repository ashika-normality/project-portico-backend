const express = require("express");
const { getInstructorProfile } = require("../controllers/instructorProfileController");
const verifyToken = require("../middlewares/authMiddleware");
const router = express.Router();

router.get('/me',verifyToken, getInstructorProfile);

module.exports = router;