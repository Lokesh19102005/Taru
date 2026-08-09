const mongoose = require('mongoose');

const DailyCheckInSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  date: { type: Date, required: true },
  mood: {
    label: { type: String, required: true },
    score: { type: Number, required: true }
  },
  energy: { type: Number, required: true },
  stress: { type: Number, required: true },
  sleep: { type: Number, required: true },
  concentration: { type: Number, required: true },
  support: { type: Number, required: true },
  motivation: { type: Number, required: true },
  feedback: { type: String, default: '' },
  totalScore: { type: Number },
}, { timestamps: true });

DailyCheckInSchema.pre('validate', function(next) {
  if (this.mood && typeof this.mood.score === 'number' &&
      typeof this.energy === 'number' &&
      typeof this.stress === 'number' &&
      typeof this.sleep === 'number' &&
      typeof this.concentration === 'number' &&
      typeof this.support === 'number' &&
      typeof this.motivation === 'number') {
    this.totalScore = this.mood.score + this.energy + this.stress + this.sleep + this.concentration + this.support + this.motivation;
  }
  next();
});

DailyCheckInSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('DailyCheckIn', DailyCheckInSchema);
