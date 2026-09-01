const Meeting = require('../models/Meeting');
const Appointment = require('../models/Appointment');
const DailyCheckIn = require('../models/DailyCheckIn');
const crypto = require('crypto');

function buildDateTime(appointmentDate, timeString) {
  const d = new Date(appointmentDate);
  const [hours, minutes] = timeString.split(':').map(Number);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function isWithinJoinWindow(appointment) {
  const startDateTime = buildDateTime(appointment.date, appointment.startTime);
  const endDateTime = buildDateTime(appointment.date, appointment.endTime);
  const joinWindowStart = new Date(startDateTime.getTime() - 5 * 60 * 1000);
  const joinWindowEnd = new Date(endDateTime.getTime() + 10 * 60 * 1000);
  const now = new Date();
  return now >= joinWindowStart && now <= joinWindowEnd;
}

function verifyParticipant(appointment, userId, userRole) {
  if (userRole === 'user') {
    return appointment.studentId._id.toString() === userId.toString();
  }
  if (userRole === 'psychiatrist') {
    return appointment.psychiatristId._id.toString() === userId.toString();
  }
  return false;
}

exports.joinAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId)
      .populate('psychiatristId', 'name qualification')
      .populate('studentId', 'username email');
      
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    
    if (appointment.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'Appointment is not confirmed' });
    }
    
    if (!verifyParticipant(appointment, req.user._id, req.userRole)) {
      return res.status(403).json({ success: false, message: 'Not authorized for this appointment' });
    }
    
    // Time-window check removed — allow joining confirmed appointments anytime
    
    let meeting = await Meeting.findOne({ appointmentId: appointment._id });
    if (!meeting) {
      meeting = await Meeting.create({
        appointmentId: appointment._id,
        meetingId: 'm_' + crypto.randomBytes(16).toString('hex'),
        status: 'scheduled'
      });
    }
    
    res.status(200).json({
      success: true,
      meetingId: meeting.meetingId,
      appointment: {
        _id: appointment._id,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        psychiatristName: appointment.psychiatristId.name,
        studentName: appointment.studentId.username
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.verifyMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    
    const appointment = await Appointment.findById(meeting.appointmentId)
      .populate('psychiatristId', 'name qualification')
      .populate('studentId', 'username email');
      
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    
    if (!verifyParticipant(appointment, req.user._id, req.userRole)) {
      return res.status(403).json({ success: false, message: 'Not authorized for this appointment' });
    }
    
    if (appointment.status !== 'confirmed' && meeting.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Appointment is not confirmed' });
    }
    
    // Time-window check removed — allow joining confirmed appointments anytime
    
    const participantName = req.userRole === 'user' ? appointment.studentId.username : appointment.psychiatristId.name;
    const otherRole = req.userRole === 'user' ? 'psychiatrist' : 'user';
    const otherName = req.userRole === 'user' ? appointment.psychiatristId.name : appointment.studentId.username;
    
    res.status(200).json({
      success: true,
      meeting: {
        meetingId: meeting.meetingId,
        status: meeting.status,
        startedAt: meeting.startedAt,
        endedAt: meeting.endedAt
      },
      appointment: {
        _id: appointment._id,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        // Include studentId so psychiatrist can fetch mood history
        studentId: appointment.studentId._id
      },
      participant: {
        role: req.userRole,
        name: participantName
      },
      otherParticipant: {
        role: otherRole,
        name: otherName
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateMeetingLifecycle = async (req, res) => {
  try {
    const { action } = req.body;
    if (action !== 'start' && action !== 'end') {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }
    
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    
    const appointment = await Appointment.findById(meeting.appointmentId)
      .populate('psychiatristId')
      .populate('studentId');
      
    if (!verifyParticipant(appointment, req.user._id, req.userRole)) {
      return res.status(403).json({ success: false, message: 'Not authorized for this appointment' });
    }
    
    if (action === 'start' && meeting.status === 'scheduled') {
      meeting.status = 'active';
      meeting.startedAt = new Date();
    } else if (action === 'end' && meeting.status === 'active') {
      meeting.status = 'ended';
      meeting.endedAt = new Date();
      meeting.duration = Math.round((meeting.endedAt - meeting.startedAt) / 1000);
    }
    
    await meeting.save();
    res.status(200).json({ success: true, meeting });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getTurnCredentials = async (req, res) => {
  try {
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    if (process.env.TURN_URL) {
      // TURN_URL may contain multiple comma-separated URLs
      const urls = process.env.TURN_URL.split(',').map(u => u.trim());
      const username = process.env.TURN_USERNAME || '';
      const credential = process.env.TURN_CREDENTIAL || '';

      for (const url of urls) {
        if (url.startsWith('stun:')) {
          // STUN servers don't need credentials
          iceServers.push({ urls: url });
        } else if (url.startsWith('turn:') || url.startsWith('turns:')) {
          // TURN/TURNS servers need credentials
          iceServers.push({ urls: url, username, credential });
        }
      }
    }

    res.status(200).json({ success: true, iceServers });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get student's mood history for a meeting (psychiatrist only)
exports.getStudentMoodHistory = async (req, res) => {
  try {
    const { meetingId } = req.params;
    
    // Only psychiatrists can access this
    if (req.userRole !== 'psychiatrist') {
      return res.status(403).json({ success: false, message: 'Only psychiatrists can view student mood history' });
    }
    
    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    
    const appointment = await Appointment.findById(meeting.appointmentId)
      .populate('psychiatristId', 'name')
      .populate('studentId', 'username');
    
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    
    // Verify the psychiatrist is part of this appointment
    if (appointment.psychiatristId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized for this appointment' });
    }
    
    const studentId = appointment.studentId._id;
    
    // Fetch past 14 days of check-ins
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    fourteenDaysAgo.setHours(0, 0, 0, 0);
    
    const checkins = await DailyCheckIn.find({
      userId: studentId,
      date: { $gte: fourteenDaysAgo }
    }).sort({ date: -1 });
    
    res.status(200).json({
      success: true,
      studentName: appointment.studentId.username,
      count: checkins.length,
      data: checkins
    });
  } catch (err) {
    console.error('getStudentMoodHistory error:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
