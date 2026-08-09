const express = require('express');
const router = express.Router();
const { setAvailability, getMyAvailability, getAvailability } = require('../controllers/availabilityController');
const { protect } = require('../middleware/auth');

router.put('/:date', protect('psychiatrist'), setAvailability);
router.get('/me/:date', protect('psychiatrist'), getMyAvailability);
router.get('/:psychiatristId/:date', protect('user'), getAvailability);

module.exports = router;
