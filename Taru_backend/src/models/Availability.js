const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  isBooked: { type: Boolean, default: false }
}, { _id: false });

const availabilitySchema = new mongoose.Schema({
  psychiatristId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Psychiatrist',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  slots: [slotSchema]
}, { timestamps: true });

availabilitySchema.index({ psychiatristId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Availability', availabilitySchema);
