const mongoose = require('mongoose');

// Every numeric score uses the same direction: 0 = best, 4 = worst.
const scoreField = { type: Number, min: 0, max: 4, default: null };

const DailyCheckInSchema = new mongoose.Schema({
  // null for guest check-ins
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  date: { type: Date, required: true },

  // Step 1: "Very Happy" (0) | "Happy" (1) | "Neutral" (2) | "Stressed" (3) | "Sad" (4)
  mood: {
    label: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 4 }
  },

  // Steps 2–4: prebuilt category key / option label, or the student's own
  // words when they picked "Others". null = skipped.
  category: { type: String, default: null },
  rootCause: { type: String, default: null },
  specificIssue: { type: String, default: null },

  // Steps 5–7: null = skipped
  energy: scoreField,
  stress: scoreField,
  motivation: scoreField,

  // Step 8
  feedback: { type: String, default: '' },

  // mood + energy + stress + motivation (skipped counts as 0), 0–16, lower is better
  totalScore: { type: Number },
}, { timestamps: true });

DailyCheckInSchema.pre('validate', function(next) {
  this.totalScore = (this.mood?.score ?? 0) +
    (this.energy ?? 0) +
    (this.stress ?? 0) +
    (this.motivation ?? 0);
  next();
});

DailyCheckInSchema.index({ userId: 1, date: -1 });
DailyCheckInSchema.index({ category: 1 });
DailyCheckInSchema.index({ rootCause: 1 });

module.exports = mongoose.model('DailyCheckIn', DailyCheckInSchema);
