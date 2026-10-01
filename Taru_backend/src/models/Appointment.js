const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  psychiatristId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Psychiatrist",
    required: true,
  },
  availabilityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Availability",
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["requested", "confirmed", "completed", "cancelled", "no_show"],
    default: "requested",
  },
  reason: {
    type: String,
  },
  notes: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  aiSummary: {
    consentGiven: {
      type: Boolean,
      default: false,
    },
    consentedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: [
        "not_requested",
        "pending",
        "available",
        "not_available",
        "failed",
      ],
      default: "not_requested",
    },
    feelings: {
      type: String,
      default: "",
    },
    mainConcern: {
      type: String,
      default: "",
    },
    context: {
      type: String,
      default: "",
    },
    generatedAt: {
      type: String,
      default: "",
    },
    disclaimer: {
      type: String,
      default: "AI-generated conversation summary - not a clinical diagnosis.",
    },
  },
});

module.exports = mongoose.model("Appointment", appointmentSchema);
