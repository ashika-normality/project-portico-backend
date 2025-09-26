const express = require("express");
const dotenv = require("dotenv").config();
const dbConnect = require("./config/dbConnect");
const authRoutes = require("./routes/authRoutes");
const otpRoutes = require("./routes/otpRoutes");
const instructorProfileRoutes = require("./routes/instructorProfileRoutes");
const learnerProfileRoutes = require("./routes/learnerProfileRoutes");
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'https://project-portico-frontend.vercel.app', 'https://xc3kh9zh-3000.inc1.devtunnels.ms'],
  credentials: true
}));
app.use('/uploads', express.static('uploads'));

console.log("✅ Importing learner profile routes...");

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/instructor-profile", instructorProfileRoutes);
app.use("/api/learner-profile", learnerProfileRoutes);


// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Basic Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 7002;

// Start server only after database connection is established
const startServer = async () => {
  try {
    console.log("Connecting to database...");
    await dbConnect();
    console.log("Database connected successfully!");

    // TEMPORARY: check all users in the DB
    const User = require("./models/userModel"); // import User model
    const users = await User.find({});
    console.log("Users currently in DB:", users);

    app.listen(PORT, () => {
      console.log(`Server is running at port ${PORT}`);
      console.log(`API is at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
};


startServer();