const events = require("./events");
const rooms = require("./rooms");
const gameModules = {
  memory: require("./games/memory"),
  four_in_a_row: require("./games/connect-four"),
  beach_balls: require("./games/beach-balls"),
};

/*
queues: { [gameType]: Array<socketId> }
*/
const queues = {};

function ensureQueue(gameType) {
  if (!queues[gameType]) queues[gameType] = [];
  return queues[gameType];
}

function isInQueue(gameType, socketId) {
  const q = queues[gameType] || [];
  return q.includes(socketId);
}

async function handleJoinQueue(io, socket, gameType) {
  try {
    if (!gameType) {
      socket.emit(events.ERROR, { message: "gameType required" });
      return;
    }

    // Guard: if socket already in a room, send error
    const existingRoom = rooms.findRoomBySocket(socket.id);
    if (existingRoom) {
      socket.emit(events.ERROR, { message: "Already in a game" });
      return;
    }

    const q = ensureQueue(gameType);
    if (isInQueue(gameType, socket.id)) {
      socket.emit(events.ROOM_STATE, { status: "waiting" });
      return;
    }

    // If someone is waiting, pair them.
    if (q.length > 0) {
      const waitingSocketId = q.shift();
      const waitingSocket = io.sockets.sockets.get(waitingSocketId);
      if (!waitingSocket) {
        // waiting socket disappeared, try again (recursive-ish)
        return handleJoinQueue(io, socket, gameType);
      }

      const room = rooms.createRoom(gameType);
      rooms.addPlayer(room.id, waitingSocketId);
      rooms.addPlayer(room.id, socket.id);

      // Have both sockets join the socket.io room
      waitingSocket.join(room.id);
      socket.join(room.id);

      // Mark room active
      room.status = "active";

      // Notify both players (anonymous pairing; just deliver roomId)
      const payload = { roomId: room.id, gameType: room.gameType };
      waitingSocket.emit(events.MATCH_FOUND, payload);
      socket.emit(events.MATCH_FOUND, payload);

      // Initialize game state for this room (Game module will emit GAME_STARTED)
      try {
        gameModules[room.gameType]?.startGameForRoom(io, room);
      } catch (error) {
        console.error(
          "Failed starting game for room",
          room.id,
          room.gameType,
          error,
        );
      }
      return;
    }

    // Otherwise push into queue and ack waiting state
    q.push(socket.id);
    socket.emit(events.ROOM_STATE, { status: "waiting" });
  } catch (err) {
    socket.emit(events.ERROR, { message: "Failed to join queue" });
  }
}

function handleLeaveQueue(io, socket, gameType) {
  try {
    if (!gameType) {
      socket.emit(events.ERROR, { message: "gameType required" });
      return;
    }
    const q = queues[gameType];
    if (!q) return;
    const idx = q.indexOf(socket.id);
    if (idx !== -1) q.splice(idx, 1);
    socket.emit(events.ROOM_STATE, { status: "left" });
  } catch (err) {
    socket.emit(events.ERROR, { message: "Failed to leave queue" });
  }
}

function handleDisconnect(io, socket) {
  try {
    // Remove socket from any queue it may be in
    for (const [gameType, q] of Object.entries(queues)) {
      const idx = q.indexOf(socket.id);
      if (idx !== -1) {
        q.splice(idx, 1);
      }
    }

    // If socket was in a room, notify opponent and mark finished
    const room = rooms.findRoomBySocket(socket.id);
    if (room) {
      room.status = "finished";
      // find opponent
      const opponentId = room.players.find((id) => id !== socket.id);
      if (opponentId) {
        const opponent = io.sockets.sockets.get(opponentId);
        if (opponent) {
          opponent.emit(events.OPPONENT_LEFT, { roomId: room.id });
        }
      }

      const gameModule = gameModules[room.gameType];

      if (gameModule && typeof gameModule.stopGameForRoom === "function") {
        gameModule.stopGameForRoom(room);
      }
      // TODO: schedule room cleanup or immediate deletion if desired
      // rooms.deleteRoom(room.id)
    }
  } catch (err) {
    // nothing to do on disconnect
  }
}

module.exports = {
  handleJoinQueue,
  handleLeaveQueue,
  handleDisconnect,
  // exported for tests / introspection:
  _queues: queues,
};
