const mongoose = require('mongoose');
const crypto = require('crypto');

const meetingSchema = new mongoose.Schema({
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true,
    unique: true
  },
  meetingId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'ended'],
    default: 'scheduled'
  },
  startedAt: {
    type: Date
  },
  endedAt: {
    type: Date
  },
  duration: {
    type: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

meetingSchema.statics.generateMeetingId = function() {
  return 'm_' + crypto.randomBytes(16).toString('hex');
};

module.exports = mongoose.model('Meeting', meetingSchema);
