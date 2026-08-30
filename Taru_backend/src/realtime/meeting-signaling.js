const jwt = require('jsonwebtoken');
const events = require('./events');
const Meeting = require('../models/Meeting');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Psychiatrist = require('../models/Psychiatrist');

const modelMap = { user: User, psychiatrist: Psychiatrist };
const meetingParticipants = new Map(); // meetingId -> [{ socketId, userId, role, name }]

function attachHandlers(io, socket) {
  socket.on(events.MEETING_JOIN, async (payload) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return socket.emit(events.MEETING_ERROR, { message: 'No token provided' });
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const Model = modelMap[decoded.role];
      if (!Model) return socket.emit(events.MEETING_ERROR, { message: 'Invalid role' });
      
      const user = await Model.findById(decoded.id);
      if (!user) return socket.emit(events.MEETING_ERROR, { message: 'User not found' });
      
      const { meetingId } = payload;
      if (!meetingId) return socket.emit(events.MEETING_ERROR, { message: 'No meetingId provided' });
      
      const meeting = await Meeting.findOne({ meetingId });
      if (!meeting) return socket.emit(events.MEETING_ERROR, { message: 'Meeting not found' });
      
      const appointment = await Appointment.findById(meeting.appointmentId)
        .populate('studentId')
        .populate('psychiatristId');
        
      let isParticipant = false;
      let name = '';
      if (decoded.role === 'user' && appointment.studentId._id.toString() === user._id.toString()) {
        isParticipant = true;
        name = appointment.studentId.username;
      } else if (decoded.role === 'psychiatrist' && appointment.psychiatristId._id.toString() === user._id.toString()) {
        isParticipant = true;
        name = appointment.psychiatristId.name;
      }
      
      if (!isParticipant) {
        return socket.emit(events.MEETING_ERROR, { message: 'Not authorized for this meeting' });
      }
      
      if (appointment.status !== 'confirmed' && meeting.status !== 'active') {
        return socket.emit(events.MEETING_ERROR, { message: 'Appointment is not confirmed' });
      }
      
      const room = 'meeting:' + meetingId;
      
      // Get existing participants BEFORE this user joins
      let participants = meetingParticipants.get(meetingId) || [];
      // Remove stale entries for the same user (reconnect case)
      participants = participants.filter(p => p.userId.toString() !== user._id.toString());
      
      const participantInfo = {
        socketId: socket.id,
        userId: user._id,
        role: decoded.role,
        name
      };

      // 1) Notify existing participants that someone new is joining (BEFORE socket joins room)
      socket.to(room).emit(events.MEETING_PARTICIPANT_JOINED, {
        role: participantInfo.role,
        name: participantInfo.name,
        isInitiator: true // existing user should create the offer
      });
      
      // 2) Join the socket.io room
      socket.join(room);
      
      // 3) Tell the NEW joiner about existing participants already in the room
      if (participants.length > 0) {
        const existing = participants[0]; // 1-to-1, at most one other
        socket.emit(events.MEETING_PARTICIPANT_JOINED, {
          role: existing.role,
          name: existing.name,
          isInitiator: false // new joiner waits for the offer
        });
      }
      
      // 4) Update participants list
      participants.push(participantInfo);
      meetingParticipants.set(meetingId, participants);
      
    } catch (err) {
      console.error('meeting:join error:', err);
      socket.emit(events.MEETING_ERROR, { message: 'Authentication failed or server error' });
    }
  });

  socket.on(events.MEETING_OFFER, (payload) => {
    console.log('[Meeting] Relaying offer for meeting:', payload.meetingId);
    socket.to('meeting:' + payload.meetingId).emit(events.MEETING_OFFER, payload);
  });
  
  socket.on(events.MEETING_ANSWER, (payload) => {
    console.log('[Meeting] Relaying answer for meeting:', payload.meetingId);
    socket.to('meeting:' + payload.meetingId).emit(events.MEETING_ANSWER, payload);
  });
  
  socket.on(events.MEETING_ICE_CANDIDATE, (payload) => {
    console.log('[Meeting] Relaying ICE candidate for meeting:', payload.meetingId);
    socket.to('meeting:' + payload.meetingId).emit(events.MEETING_ICE_CANDIDATE, payload);
  });
  
  socket.on(events.MEETING_LEAVE, (payload) => {
    if (payload && payload.meetingId) {
      handleLeave(io, socket, payload.meetingId);
    }
  });
}

function handleLeave(io, socket, meetingId) {
  const room = 'meeting:' + meetingId;
  socket.leave(room);
  
  let participants = meetingParticipants.get(meetingId) || [];
  const participantIndex = participants.findIndex(p => p.socketId === socket.id);
  
  if (participantIndex !== -1) {
    participants.splice(participantIndex, 1);
    
    if (participants.length > 0) {
      meetingParticipants.set(meetingId, participants);
    } else {
      meetingParticipants.delete(meetingId);
    }
    
    io.to(room).emit(events.MEETING_PARTICIPANT_LEFT, { meetingId });
  }
}

function handleMeetingDisconnect(io, socket) {
  for (const [meetingId, participants] of meetingParticipants.entries()) {
    if (participants.some(p => p.socketId === socket.id)) {
      handleLeave(io, socket, meetingId);
    }
  }
}

module.exports = { attachHandlers, handleMeetingDisconnect };
