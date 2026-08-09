const express = require('express');
const router = express.Router();
const { bookAppointment, getMyAppointments, getPsychiatristAppointments, updateAppointmentStatus } = require('../controllers/appointmentController');
const { protect } = require('../middleware/auth');

router.post('/book', protect('user'), bookAppointment);
router.get('/my', protect('user'), getMyAppointments);
router.get('/psychiatrist', protect('psychiatrist'), getPsychiatristAppointments);
router.put('/:id/status', protect('psychiatrist'), updateAppointmentStatus);

module.exports = router;
