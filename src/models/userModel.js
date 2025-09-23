// src/models/userModel.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  role: { type: String, enum: ['instructor', 'learner'], required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'], required: false },
  nickName: { type: String },
  dob: { type: Date, required: false },
  email: { type: String, required: true, unique: true },
  mobile: { 
    type: String, 
    required: function() { return this.signupMethod === 'otp'; } 
  },
  address: {
    line1: { type: String, required: false },
    city: { type: String, required: false },
    line2: String,
    state: String,
    country: String,
    postcode: String,
  },
  profilePhotoUrl: String,
  signupMethod: { type: String, enum: ['google', 'facebook', 'otp'], default: 'otp' }, 
  createdAt: { type: Date, default: Date.now },
});

userSchema.index({ "address.location": "2dsphere" });

module.exports = mongoose.model('User', userSchema);
