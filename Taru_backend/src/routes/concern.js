const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createConcern,
  getConcerns,
  voteConcern,
  getComments,
  addComment,
} = require('../controllers/concernController');

router.post('/', protect('user'), createConcern);
router.get('/', protect('user'), getConcerns);
router.post('/:id/vote', protect('user'), voteConcern);
router.get('/:id/comments', protect('user'), getComments);
router.post('/:id/comment', protect('user'), addComment);

module.exports = router;
