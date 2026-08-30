const express = require('express');
const router = express.Router();
const { joinAppointment, verifyMeeting, updateMeetingLifecycle, getTurnCredentials } = require('../controllers/meetingController');
const { protect } = require('../middleware/auth');

router.post('/appointments/:appointmentId/join', protect('user', 'psychiatrist'), joinAppointment);
router.get('/meetings/:meetingId/verify', protect('user', 'psychiatrist'), verifyMeeting);
router.post('/meetings/:meetingId/lifecycle', protect('user', 'psychiatrist'), updateMeetingLifecycle);
router.get('/turn-credentials', protect('user', 'psychiatrist'), getTurnCredentials);

module.exports = router;
