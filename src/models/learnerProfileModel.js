// models/learnerProfileModel.js
const mongoose = require("mongoose");

const learnerProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // ---------------- Personal Details ----------------
  personalDetails: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    gender: { type: String, enum: ["Male", "Female", "Other"]},
    mobile: { type: String, required: true },
    dateOfBirth: { type: Date },
    addressLine1: { type: String },
    addressLine2: { type: String },
    postalCode: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
  },

  // ---------------- License Information ----------------
  licenseInfo: {
    hasLicense: { type: Boolean, default: true },
    licenseType: { type: String },
    licenseNumber: { type: String },
    issueDate: { type: Date },
    expiryDate: { type: Date },
  },

  // ---------------- Payment Methods ----------------
  paymentMethods: [
    {
      cardNumber: { type: String, required: true },
      cardExpiryDate: { type: Date, required: true },
      cardHolderName: { type: String, required: true },
      cvv: { type: String, required: true }, 
      cardType: { type: String, enum: ["Visa", "MasterCard", "Amex", "Other"], required: true },
      saveCardInfo: { type: Boolean, default: false },
      defaultCard: { type: Boolean, default: false },
    },
  ],

  // ---------------- Emergency Contacts ----------------
  emergencyContacts: [
    {
      emergencyName: { type: String, required: true },
      emergencyRelationship: { type: String, required: true },
      emergencyPhone: { type: String, required: true },
      emergencyEmail: { type: String, required: true },
    },
  ],

}, { timestamps: true });

module.exports = mongoose.model("LearnerProfile", learnerProfileSchema);
