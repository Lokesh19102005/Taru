const Concern = require('../models/Concern');
const ConcernComment = require('../models/ConcernComment');

// POST /api/concern — Create a new concern
const createConcern = async (req, res) => {
  try {
    const { type, description } = req.body;

    if (!type || !description) {
      return res.status(400).json({ success: false, message: 'Type and description are required' });
    }

    const validTypes = ['college_admin', 'faculty', 'student_peer', 'hostel', 'safety', 'financial', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid concern type' });
    }

    if (description.length > 2000) {
      return res.status(400).json({ success: false, message: 'Description must be 2000 characters or less' });
    }

    const concern = await Concern.create({
      user: req.user._id,
      username: req.user.username,
      college: req.user.college,
      type,
      description,
    });

    // Return with userVote for consistency
    const result = concern.toObject();
    result.userVote = null;

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('createConcern error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/concern — Get all concerns for user's college (newest first)
const getConcerns = async (req, res) => {
  try {
    const concerns = await Concern.find({ college: req.user.college })
      .sort({ createdAt: -1 })
      .lean();

    const userId = req.user._id.toString();

    // Add userVote field to each concern
    const result = concerns.map(c => {
      let userVote = null;
      if (c.upvotes.some(id => id.toString() === userId)) {
        userVote = 'up';
      } else if (c.downvotes.some(id => id.toString() === userId)) {
        userVote = 'down';
      }
      // Remove raw arrays from response to save bandwidth
      const { upvotes, downvotes, ...rest } = c;
      return { ...rest, userVote };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('getConcerns error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/concern/:id/vote — Toggle upvote/downvote
const voteConcern = async (req, res) => {
  try {
    const { vote } = req.body;
    if (!vote || !['up', 'down'].includes(vote)) {
      return res.status(400).json({ success: false, message: 'Vote must be "up" or "down"' });
    }

    const concern = await Concern.findById(req.params.id);
    if (!concern) {
      return res.status(404).json({ success: false, message: 'Concern not found' });
    }

    const userId = req.user._id.toString();
    const hasUpvoted = concern.upvotes.some(id => id.toString() === userId);
    const hasDownvoted = concern.downvotes.some(id => id.toString() === userId);

    if (vote === 'up') {
      if (hasUpvoted) {
        // Toggle off: remove upvote
        concern.upvotes = concern.upvotes.filter(id => id.toString() !== userId);
      } else {
        // Add upvote, remove downvote if exists
        if (hasDownvoted) {
          concern.downvotes = concern.downvotes.filter(id => id.toString() !== userId);
        }
        concern.upvotes.push(req.user._id);
      }
    } else {
      if (hasDownvoted) {
        // Toggle off: remove downvote
        concern.downvotes = concern.downvotes.filter(id => id.toString() !== userId);
      } else {
        // Add downvote, remove upvote if exists
        if (hasUpvoted) {
          concern.upvotes = concern.upvotes.filter(id => id.toString() !== userId);
        }
        concern.downvotes.push(req.user._id);
      }
    }

    // Update denormalized counts
    concern.upvoteCount = concern.upvotes.length;
    concern.downvoteCount = concern.downvotes.length;

    await concern.save();

    // Determine new userVote
    let userVote = null;
    if (concern.upvotes.some(id => id.toString() === userId)) userVote = 'up';
    else if (concern.downvotes.some(id => id.toString() === userId)) userVote = 'down';

    res.json({
      success: true,
      data: {
        upvoteCount: concern.upvoteCount,
        downvoteCount: concern.downvoteCount,
        userVote,
      },
    });
  } catch (error) {
    console.error('voteConcern error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/concern/:id/comments — Get comments for a concern
const getComments = async (req, res) => {
  try {
    const comments = await ConcernComment.find({ concern: req.params.id })
      .sort({ createdAt: 1 })
      .lean();

    res.json({ success: true, data: comments });
  } catch (error) {
    console.error('getComments error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/concern/:id/comment — Add a comment
const addComment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    if (text.length > 1000) {
      return res.status(400).json({ success: false, message: 'Comment must be 1000 characters or less' });
    }

    const concern = await Concern.findById(req.params.id);
    if (!concern) {
      return res.status(404).json({ success: false, message: 'Concern not found' });
    }

    const comment = await ConcernComment.create({
      concern: req.params.id,
      user: req.user._id,
      username: req.user.username,
      text: text.trim(),
    });

    // Increment denormalized comment count
    concern.commentCount = (concern.commentCount || 0) + 1;
    await concern.save();

    res.status(201).json({ success: true, data: comment.toObject() });
  } catch (error) {
    console.error('addComment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/concern/institution — Read-only view for institutions
const getConcernsForInstitution = async (req, res) => {
  try {
    const collegeName = req.user.collegeName;
    const concerns = await Concern.find({ college: collegeName })
      .sort({ createdAt: -1 })
      .lean();

    // Strip out the raw vote arrays to save bandwidth
    const result = concerns.map(c => {
      const { upvotes, downvotes, ...rest } = c;
      return rest;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('getConcernsForInstitution error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createConcern,
  getConcerns,
  voteConcern,
  getComments,
  addComment,
  getConcernsForInstitution,
};
