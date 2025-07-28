const mongoose = require('mongoose');

const instructorProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  drivingLicenseNumber: { type: String, required: true },
  instructorLicenseNumber: { type: String, required: true },
  wwccNumber: { type: String, required: true },
  drivingSchoolName: { type: String },
  website: { type: String },
  bio: { type: String },
  // Address fields (duplicated for convenience, or can be referenced from User)
  address: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    country: String,
    postcode: String,
  },
  profileImage: { type: String }, // Store file URL or path
  drivingLicenseFront: { type: String }, // Store file URL or path
  drivingLicenseBack: { type: String }, // Store file URL or path
  instructorLicenseFront: { type: String }, // Store file URL or path
  instructorLicenseBack: { type: String }, // Store file URL or path
  
  createdAt: { type: Date, default: Date.now }
});

instructorProfileSchema.index({ "address.location": "2dsphere" });

module.exports = mongoose.model('InstructorProfile', instructorProfileSchema);

