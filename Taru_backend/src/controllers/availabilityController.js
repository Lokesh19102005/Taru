const Availability = require('../models/Availability');

// PUT /api/availability/:date — psychiatrist sets/updates their availability for a date
exports.setAvailability = async (req, res) => {
  try {
    const { slots } = req.body;
    const psychiatristId = req.user._id;
    const date = new Date(req.params.date);

    if (!slots || !Array.isArray(slots)) {
      return res.status(400).json({ success: false, message: 'Slots array is required' });
    }

    // Check if availability already exists for this psychiatrist+date
    const existing = await Availability.findOne({ psychiatristId, date });

    if (existing) {
      // Preserve already-booked slots — don't let psychiatrist remove them
      const bookedSlots = existing.slots.filter(s => s.isBooked);
      
      // Build new slots array: include all new selections + force-include booked ones
      const newSlots = slots.map(s => {
        const wasBooked = bookedSlots.find(
          b => b.startTime === s.startTime && b.endTime === s.endTime
        );
        return {
          startTime: s.startTime,
          endTime: s.endTime,
          isBooked: wasBooked ? true : false
        };
      });

      // Also add any booked slots that the psychiatrist didn't include in the new selection
      for (const booked of bookedSlots) {
        const alreadyIncluded = newSlots.find(
          s => s.startTime === booked.startTime && s.endTime === booked.endTime
        );
        if (!alreadyIncluded) {
          newSlots.push({
            startTime: booked.startTime,
            endTime: booked.endTime,
            isBooked: true
          });
        }
      }

      // Sort by startTime
      newSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

      existing.slots = newSlots;
      await existing.save();

      return res.status(200).json({ success: true, data: existing });
    } else {
      // Create new availability document
      const availability = await Availability.create({
        psychiatristId,
        date,
        slots: slots.map(s => ({
          startTime: s.startTime,
          endTime: s.endTime,
          isBooked: false
        }))
      });

      return res.status(201).json({ success: true, data: availability });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// GET /api/availability/me/:date — psychiatrist sees their own availability (all slots)
exports.getMyAvailability = async (req, res) => {
  try {
    const psychiatristId = req.user._id;
    const date = new Date(req.params.date);

    const availability = await Availability.findOne({ psychiatristId, date });

    if (!availability) {
      return res.status(200).json({ success: true, data: null });
    }

    res.status(200).json({ success: true, data: availability });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// GET /api/availability/:psychiatristId/:date — student sees available (unbooked) slots
exports.getAvailability = async (req, res) => {
  try {
    const { psychiatristId, date } = req.params;

    const availability = await Availability.findOne({
      psychiatristId,
      date: new Date(date)
    });

    if (!availability) {
      return res.status(200).json({ success: true, data: null });
    }

    // Filter to only unbooked slots for the student
    const filtered = {
      ...availability.toObject(),
      slots: availability.slots.filter(s => !s.isBooked)
    };

    res.status(200).json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
