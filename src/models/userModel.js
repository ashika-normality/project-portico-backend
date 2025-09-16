// src/models/userModel.js (Example using Mongoose)
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  role: { type: String, enum: ['instructor', 'learner'], required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  nickName: { type: String },
  dob: {
    type: Date,
    required: function () { return this.role === 'instructor'; }
  },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  address: {
    line1: {
      type: String,
      required: function () { return this.role === 'instructor'; }
    },
    city: {
      type: String,
      required: function () { return this.role === 'instructor'; }
    },
    line2: String,
    state: String,
    country: String,
    postcode: String,
  },
  profilePhotoUrl: String,
  createdAt: { type: Date, default: Date.now },
});

userSchema.index({ "address.location": "2dsphere" });

module.exports = mongoose.model('User', userSchema);