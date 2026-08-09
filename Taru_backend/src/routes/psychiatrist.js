const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { register, login, getAllPsychiatrists, getMe } = require('../controllers/psychiatristController');
const { protect } = require('../middleware/auth');

router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('qualification').notEmpty().withMessage('Qualification is required')
], register);

router.post('/login', [
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').exists().withMessage('Password is required')
], login);

router.get('/me', protect('psychiatrist'), getMe);

module.exports = router;
