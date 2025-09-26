const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv").config();
const User = require("../models/userModel");
const LearnerProfile = require("../models/learnerProfileModel");

// --------------------- GET LEARNER PROFILE ---------------------
const getLearnerProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("User ID from token:", userId);

    const profile = await LearnerProfile.findOne({ user: userId }).populate({
      path: "user",
      select: "-refreshTokens -__v",
    });

    if (!profile) {
      return res.status(404).json({ message: "Learner profile not found" });
    }

    res.status(200).json(profile);
  } catch (error) {
    console.error("Error fetching learner profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// --------------------- SET DEFAULT CARD ---------------------
const setDefaultCard = async (req, res) => {
  try {
    const userId = req.user.id;
    const cardId = req.params.cardId; // Use the _id of the card stored in MongoDB

    const profile = await LearnerProfile.findOne({ user: userId });
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    let cardFound = false;

    profile.paymentMethods = profile.paymentMethods.map((card) => {
      if (card._id.toString() === cardId) {
        cardFound = true;
        return { ...card.toObject(), defaultCard: true }; // set selected card as default
      } else {
        return { ...card.toObject(), defaultCard: false }; // reset all other cards
      }
    });

    if (!cardFound) {
      return res.status(404).json({ message: "Card not found" });
    }

    await profile.save();

    res.status(200).json({
      message: "Default card updated successfully",
      paymentMethods: profile.paymentMethods,
    });
  } catch (err) {
    console.error("Error updating default card:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// --------------------- SAVE/UPDATE LEARNER PROFILE ---------------------
const saveLearnerProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = req.body;

    if (!data || typeof data !== "object") {
      return res.status(400).json({ message: "Valid JSON data is required" });
    }

    console.log("User ID from token:", userId);
    console.log("Received data for save:", data);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // ------------------ Email uniqueness check ------------------
    if (data.personalDetails?.email) {
      const existingUser = await User.findOne({
        email: data.personalDetails.email,
        _id: { $ne: userId },
      });
      if (existingUser) {
        return res.status(400).json({ message: "Email is already used by another account" });
      }
    }

    const parseDate = (dateStr) => (dateStr ? new Date(dateStr) : undefined);

    // ------------------ Fix Payment Methods ------------------
    let paymentMethods = (data.paymentMethods || []).map((card) => {
      let cardExpiryDate = card.cardExpiryDate
        ? new Date(card.cardExpiryDate)
        : card.CardExpiryDate
          ? new Date(card.CardExpiryDate)
          : undefined;

      return {
        cardNumber: card.cardNumber,
        cardHolderName: card.cardHolderName,
        cardType: card.cardType || determineCardType(card.cardNumber),
        cardExpiryDate,
        cvv: card.cvv,
        saveCardInfo: card.saveCardInfo || card.saveCard || false,
        defaultCard: card.defaultCard || false,
      };
    });

    // Ensure only one default card
    const defaultIndex = paymentMethods.findIndex((c) => c.defaultCard);
    if (defaultIndex !== -1) {
      paymentMethods = paymentMethods.map((card, idx) => ({
        ...card,
        defaultCard: idx === defaultIndex,
      }));
    }

    // ------------------ Fix Emergency Contacts ------------------
    const emergencyContacts = [];
    if (data.emergencyContacts && data.emergencyContacts.length > 0) {
      data.emergencyContacts.forEach((ec) => {
        if (ec.emergencyName) {
          emergencyContacts.push({
            emergencyName: ec.emergencyName,
            emergencyRelationship: ec.emergencyRelationship || "",
            emergencyPhone: ec.emergencyPhone || "",
            emergencyEmail: ec.emergencyEmail || "",
          });
        }
      });
    }

    // ------------------ Prepare LearnerProfile Data ------------------
    const profileData = {
      user: userId,
      personalDetails: {
        firstName: data.personalDetails?.firstName || "",
        lastName: data.personalDetails?.lastName || "",
        email: data.personalDetails?.email || "",
        gender: data.personalDetails?.gender || undefined, // <-- optional now
        mobile: data.personalDetails?.mobile || "",
        dateOfBirth: parseDate(data.personalDetails?.dateOfBirth),
        addressLine1: data.personalDetails?.addressLine1 || "",
        addressLine2: data.personalDetails?.addressLine2 || "",
        city: data.personalDetails?.city || "",
        state: data.personalDetails?.state || "",
        country: data.personalDetails?.country || "",
        postalCode: data.personalDetails?.postalCode || "",
      },
      licenseInfo: {
        hasLicense: data.licenseInfo?.hasLicense || false,
        licenseType: data.licenseInfo?.licenseType || "",
        licenseNumber: data.licenseInfo?.licenseNumber || "",
        issueDate: parseDate(data.licenseInfo?.issueDate),
        expiryDate: parseDate(data.licenseInfo?.expiryDate),
      },
      paymentMethods,
      emergencyContacts,
    };

    console.log("Final LearnerProfile payload:", profileData);

    // ------------------ Update User model fields ------------------
    const userUpdates = {};
    if (data.personalDetails?.firstName) userUpdates.firstName = data.personalDetails.firstName;
    if (data.personalDetails?.lastName) userUpdates.lastName = data.personalDetails.lastName;
    if (data.personalDetails?.mobile) userUpdates.mobile = data.personalDetails.mobile;
    if (data.personalDetails?.email) userUpdates.email = data.personalDetails.email;

    if (
      data.personalDetails?.addressLine1 ||
      data.personalDetails?.addressLine2 ||
      data.personalDetails?.city ||
      data.personalDetails?.state ||
      data.personalDetails?.postalCode ||
      data.personalDetails?.country
    ) {
      userUpdates.address = {
        line1: data.personalDetails?.addressLine1 || user.address?.line1 || "",
        line2: data.personalDetails?.addressLine2 || user.address?.line2 || "",
        city: data.personalDetails?.city || user.address?.city || "",
        state: data.personalDetails?.state || user.address?.state || "",
        country: data.personalDetails?.country || user.address?.country || "",
        postcode: data.personalDetails?.postalCode || user.address?.postcode || "",
      };
    }

    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(userId, { $set: userUpdates }, { new: true });
    }

    // ------------------ Upsert LearnerProfile ------------------
    const options = {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    };

    const updatedProfile = await LearnerProfile.findOneAndUpdate(
      { user: userId },
      { $set: profileData },
      options
    );

    console.log("Profile saved successfully:", updatedProfile);

    res.status(200).json({
      message: "Learner profile saved successfully",
      profile: updatedProfile,
    });
  } catch (error) {
    console.error("Error saving learner profile:", error);

    // Send detailed validation errors if they exist
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.errors,
      });
    }

    res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};


// Helper functions
function determineCardType(number) {
  if (!number) return "Other";
  if (number.startsWith("4")) return "Visa";
  if (number.startsWith("5")) return "MasterCard";
  return "Other";
}

function parseCardExpiry(expiryStr) {
  if (!expiryStr) return undefined;
  const [month, year] = expiryStr.split("/");
  return new Date(2000 + parseInt(year), parseInt(month) - 1, 1);
}


module.exports = { getLearnerProfile, saveLearnerProfile, setDefaultCard };
