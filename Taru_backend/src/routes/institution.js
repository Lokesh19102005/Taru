const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { register, login, getMe, getAnalytics, getStudents } = require('../controllers/institutionController');
const { protect } = require('../middleware/auth');

router.post('/register', [
  body('collegeName').notEmpty().withMessage('College name is required'),
  body('contactEmail').isEmail().withMessage('Please include a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], register);

router.post('/login', [
  body('collegeName').notEmpty().withMessage('College name is required'),
  body('password').exists().withMessage('Password is required')
], login);

router.get('/me', protect('institution'), getMe);
router.get('/analytics', protect('institution'), getAnalytics);
router.get('/students', protect('institution'), getStudents);

module.exports = router;
