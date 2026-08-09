const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const psychiatristSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  role: {
    type: String,
    default: 'psychiatrist'
  },
  profileImage: {
    type: String
  },
  qualification: {
    type: String,
    required: true
  },
  specialization: [{
    type: String
  }],
  experience: {
    type: Number
  },
  bio: {
    type: String
  },
  languages: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

psychiatristSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

psychiatristSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Psychiatrist', psychiatristSchema);
