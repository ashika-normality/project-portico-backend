const express = require("express");
const dotenv = require("dotenv").config();
const dbConnect = require("./config/dbConnect");
const authRoutes = require("./routes/authRoutes");
const otpRoutes = require("./routes/otpRoutes");
const instructorProfileRoutes = require("./routes/instructorProfileRoutes");
const cors = require('cors');
dbConnect();

const app = express();
// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'https://project-portico-frontend.vercel.app', 'https://xc3kh9zh-3000.inc1.devtunnels.ms'], // Frontend default port
  credentials: true
}));
app.use('/uploads', express.static('uploads'));

// Routes
// Auth routes: /api/auth/register-learner, /api/auth/register-instructor, /api/auth/login
app.use("/api/auth", authRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/instructor-profile", instructorProfileRoutes);

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
app.listen(PORT, () => {
  console.log(`server is running at port ${PORT} API is at http://localhost:${PORT}/api`);
});