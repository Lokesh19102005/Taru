const events = require("./events");
const rooms = require("./rooms");

// Anonymous names pool for random assignment
const FIRST_NAMES = [
  "Aarav", "Aditi", "Arjun", "Ananya", "Dev", "Diya", "Ishaan", "Kavya",
  "Mihir", "Meera", "Neha", "Nikhil", "Priya", "Rahul", "Riya", "Rohan",
  "Sakshi", "Siddharth", "Tanvi", "Varun", "Veer", "Zara", "Kiran", "Aisha",
  "Arnav", "Divya", "Harsh", "Isha", "Jay", "Kiara", "Laksh", "Mira",
  "Neel", "Pooja", "Raj", "Simran", "Tara", "Vivek", "Yash", "Anika",
];

const LAST_INITIALS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function randomAnonName() {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_INITIALS[Math.floor(Math.random() * LAST_INITIALS.length)];
  return `${first} ${last}.`;
}

// In-memory chat queue (separate from game queues)
const chatQueue = [];

// Map socketId -> { roomId, partnerName }
const chatSessions = new Map();

function handleChatJoinQueue(io, socket) {
  try {
    // Guard: already in a chat session
    if (chatSessions.has(socket.id)) {
      socket.emit(events.ERROR, { message: "Already in a chat" });
      return;
    }

    // Guard: already in queue
    if (chatQueue.includes(socket.id)) {
      socket.emit(events.ROOM_STATE, { status: "waiting" });
      return;
    }

    // If someone is waiting, pair them
    if (chatQueue.length > 0) {
      const waitingSocketId = chatQueue.shift();
      const waitingSocket = io.sockets.sockets.get(waitingSocketId);

      if (!waitingSocket) {
        // Waiting socket disconnected, try again
        return handleChatJoinQueue(io, socket);
      }

      // Create a room using existing room infrastructure
      const room = rooms.createRoom("chat");
      rooms.addPlayer(room.id, waitingSocketId);
      rooms.addPlayer(room.id, socket.id);

      waitingSocket.join(room.id);
      socket.join(room.id);
      room.status = "active";

      // Generate anonymous names for each partner
      const nameForWaiting = randomAnonName();
      const nameForCurrent = randomAnonName();

      // Store sessions
      chatSessions.set(waitingSocketId, {
        roomId: room.id,
        partnerName: nameForCurrent,
      });
      chatSessions.set(socket.id, {
        roomId: room.id,
        partnerName: nameForWaiting,
      });

      // Notify both — each sees the OTHER person's anonymous name
      waitingSocket.emit(events.CHAT_MATCHED, {
        roomId: room.id,
        partnerName: nameForCurrent,
      });
      socket.emit(events.CHAT_MATCHED, {
        roomId: room.id,
        partnerName: nameForWaiting,
      });

      return;
    }

    // No one waiting — push into queue
    chatQueue.push(socket.id);
    socket.emit(events.ROOM_STATE, { status: "waiting" });
  } catch (err) {
    console.error("chat handleChatJoinQueue error:", err);
    socket.emit(events.ERROR, { message: "Failed to join chat queue" });
  }
}

function handleChatLeaveQueue(io, socket) {
  try {
    const idx = chatQueue.indexOf(socket.id);
    if (idx !== -1) {
      chatQueue.splice(idx, 1);
    }
    socket.emit(events.ROOM_STATE, { status: "left" });
  } catch (err) {
    console.error("chat handleChatLeaveQueue error:", err);
    socket.emit(events.ERROR, { message: "Failed to leave chat queue" });
  }
}

function handleChatMessage(io, socket, payload) {
  try {
    const session = chatSessions.get(socket.id);
    if (!session) {
      socket.emit(events.ERROR, { message: "Not in a chat session" });
      return;
    }

    const { roomId } = session;
    const { text } = payload || {};

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return;
    }

    // Broadcast message to the OTHER person in the room only
    socket.to(roomId).emit(events.CHAT_RECEIVE_MESSAGE, {
      roomId,
      text: text.trim(),
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error("chat handleChatMessage error:", err);
    socket.emit(events.ERROR, { message: "Failed to send message" });
  }
}

function handleChatStop(io, socket) {
  try {
    const session = chatSessions.get(socket.id);
    if (!session) return;

    const { roomId } = session;
    const room = rooms.getRoomById(roomId);

    if (room) {
      // Find the partner
      const partnerId = room.players.find((id) => id !== socket.id);
      if (partnerId) {
        const partnerSocket = io.sockets.sockets.get(partnerId);
        if (partnerSocket) {
          partnerSocket.emit(events.CHAT_PARTNER_LEFT, { roomId });
          partnerSocket.leave(roomId);
        }
        chatSessions.delete(partnerId);
      }

      room.status = "finished";
      socket.leave(roomId);
      rooms.deleteRoom(roomId);
    }

    chatSessions.delete(socket.id);
  } catch (err) {
    console.error("chat handleChatStop error:", err);
  }
}

function handleChatDisconnect(io, socket) {
  try {
    // Remove from queue if present
    const idx = chatQueue.indexOf(socket.id);
    if (idx !== -1) {
      chatQueue.splice(idx, 1);
    }

    // If in a chat session, notify partner
    const session = chatSessions.get(socket.id);
    if (session) {
      const { roomId } = session;
      const room = rooms.getRoomById(roomId);

      if (room) {
        const partnerId = room.players.find((id) => id !== socket.id);
        if (partnerId) {
          const partnerSocket = io.sockets.sockets.get(partnerId);
          if (partnerSocket) {
            partnerSocket.emit(events.CHAT_PARTNER_LEFT, { roomId });
            partnerSocket.leave(roomId);
          }
          chatSessions.delete(partnerId);
        }

        room.status = "finished";
        rooms.deleteRoom(roomId);
      }

      chatSessions.delete(socket.id);
    }
  } catch (err) {
    console.error("chat handleChatDisconnect error:", err);
  }
}

function attachHandlers(io, socket) {
  socket.on(events.CHAT_JOIN_QUEUE, () => handleChatJoinQueue(io, socket));
  socket.on(events.CHAT_LEAVE_QUEUE, () => handleChatLeaveQueue(io, socket));
  socket.on(events.CHAT_MESSAGE, (payload) =>
    handleChatMessage(io, socket, payload),
  );
  socket.on(events.CHAT_STOPPED, () => handleChatStop(io, socket));
}

module.exports = {
  attachHandlers,
  handleChatDisconnect,
  // exported for tests / introspection:
  _chatQueue: chatQueue,
  _chatSessions: chatSessions,
};
