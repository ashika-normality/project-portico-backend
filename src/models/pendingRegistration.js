const mongoose = require('mongoose');

const pendingRegistrationSchema = new mongoose.Schema({
  identifier: String, // email or phone
  registrationData: Object,
  createdAt: { type: Date, default: Date.now, expires: 600 } // auto-delete after 10 min
});

module.exports = mongoose.model('PendingRegistration', pendingRegistrationSchema); 