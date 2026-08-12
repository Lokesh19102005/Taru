const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

function generateUsername() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    id += chars[bytes[i] % chars.length];
  }
  return `taru_${id}`;
}

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  college: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: String,
    default: ''
  },
  degree: {
    type: String,
    default: ''
  },
  batch: {
    type: String,
    default: ''
  },
  age: {
    type: Number,
    default: null
  },
  gender: {
    type: String,
    default: ''
  },
  checkinStreak: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

userSchema.pre('validate', async function(next) {
  if (this.isNew && !this.username) {
    let unique = false;
    while (!unique) {
      const candidate = generateUsername();
      const existing = await mongoose.model('User').findOne({ username: candidate });
      if (!existing) {
        this.username = candidate;
        unique = true;
      }
    }
  }
  next();
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
