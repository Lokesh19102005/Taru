const mongoose = require('mongoose');

const concernSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  college: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['college_admin', 'faculty', 'student_peer', 'hostel', 'safety', 'financial', 'other'],
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  downvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  upvoteCount: {
    type: Number,
    default: 0,
  },
  downvoteCount: {
    type: Number,
    default: 0,
  },
  commentCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Concern', concernSchema);
