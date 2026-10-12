const mongoose = require('mongoose');

const concernCommentSchema = new mongoose.Schema({
  concern: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Concern',
    required: true,
    index: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
    maxlength: 1000,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('ConcernComment', concernCommentSchema);
