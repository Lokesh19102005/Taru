const Appointment = require('../models/Appointment');
const Availability = require('../models/Availability');

// POST /api/appointment/book — student books a slot
exports.bookAppointment = async (req, res) => {
  try {
    const { psychiatristId, availabilityId, date, startTime, endTime, reason } = req.body;
    const studentId = req.user._id;

    // Find the availability document
    const availability = await Availability.findById(availabilityId);
    if (!availability) {
      return res.status(404).json({ success: false, message: 'Availability not found' });
    }

    // Find the specific slot
    const slot = availability.slots.find(
      s => s.startTime === startTime && s.endTime === endTime
    );

    if (!slot) {
      return res.status(404).json({ success: false, message: 'Slot not found' });
    }

    if (slot.isBooked) {
      return res.status(409).json({ success: false, message: 'This slot is already booked' });
    }

    // Mark slot as booked
    slot.isBooked = true;
    await availability.save();

    // Create appointment
    const appointment = await Appointment.create({
      studentId,
      psychiatristId,
      availabilityId,
      date: new Date(date),
      startTime,
      endTime,
      reason: reason || '',
      status: 'requested'
    });

    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// GET /api/appointment/my — student's appointments
exports.getMyAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ studentId: req.user._id })
      .populate('psychiatristId', 'name qualification profileImage')
      .sort({ date: -1, startTime: -1 });

    res.status(200).json({ success: true, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// GET /api/appointment/psychiatrist — psychiatrist's appointments, optionally filtered by ?date=YYYY-MM-DD
exports.getPsychiatristAppointments = async (req, res) => {
  try {
    const query = { psychiatristId: req.user._id };

    if (req.query.date) {
      const d = new Date(req.query.date);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      query.date = { $gte: d, $lt: nextDay };
    }

    const appointments = await Appointment.find(query)
      .populate('studentId', 'username email')
      .sort({ date: 1, startTime: 1 });

    res.status(200).json({ success: true, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// PUT /api/appointment/:id/status — psychiatrist updates appointment status
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validTransitions = {
      requested: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled', 'no_show']
    };

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Verify this appointment belongs to the logged-in psychiatrist
    if (appointment.psychiatristId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const allowed = validTransitions[appointment.status];
    if (!allowed || !allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${appointment.status} to ${status}`
      });
    }

    // If cancelling, free the slot
    if (status === 'cancelled') {
      const availability = await Availability.findById(appointment.availabilityId);
      if (availability) {
        const slot = availability.slots.find(
          s => s.startTime === appointment.startTime && s.endTime === appointment.endTime
        );
        if (slot) {
          slot.isBooked = false;
          await availability.save();
        }
      }
    }

    appointment.status = status;
    await appointment.save();

    res.status(200).json({ success: true, data: appointment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
