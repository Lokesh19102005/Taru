const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  psychiatristId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Psychiatrist',
    required: true
  },
  availabilityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Availability',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['requested', 'confirmed', 'completed', 'cancelled', 'no_show'],
    default: 'requested'
  },
  reason: {
    type: String
  },
  meetingLink: {
    type: String
  },
  notes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Appointment', appointmentSchema);
