// src/models/userModel.js (Example using Mongoose)
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  role: { type: String, enum: ['instructor', 'learner'], required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  nickName: { type: String}, // Optional field for instructors
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  address: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    country: String,
    postcode: String,
  },
  profilePhotoUrl: String,
  createdAt: { type: Date, default: Date.now },
});

userSchema.index({ "address.location": "2dsphere" });

module.exports = mongoose.model('User', userSchema);