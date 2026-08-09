const express = require('express');
const router = express.Router();
const { submitCheckin, getHistory, getToday } = require('../controllers/checkinController');
const { protect, optionalProtect } = require('../middleware/auth');

router.post('/', optionalProtect, submitCheckin);
router.get('/history', protect, getHistory);
router.get('/today', protect, getToday);

module.exports = router;
