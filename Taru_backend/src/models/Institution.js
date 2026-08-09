const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const institutionSchema = new mongoose.Schema({
  collegeName: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  contactEmail: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'institution'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

institutionSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

institutionSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Institution', institutionSchema);
