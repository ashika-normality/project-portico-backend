const express = require("express");
const dotenv = require("dotenv").config();
const dbConnect = require("./config/dbConnect");
const authRoutes = require("./routes/authRoutes");
const otpRoutes = require("./routes/otpRoutes");
const cors = require('cors');
dbConnect();

const app = express();
// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000', // Frontend default port
  credentials: true
}));

// Routes
// Auth routes: /api/auth/register-learner, /api/auth/register-instructor, /api/auth/login
app.use("/api/auth", authRoutes);
app.use("/api/otp", otpRoutes);

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
  console.log(`server is running at port ${PORT}`);
});