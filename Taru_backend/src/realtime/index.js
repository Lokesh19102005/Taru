const { Server } = require("socket.io");
const events = require("./events");
const matchmaking = require("./matchmaking");
const memoryGame = require("./games/memory");
const connectFourGame = require("./games/connect-four");
const beachBallsGame = require("./games/beach-balls");
const seaBattleGame = require("./games/sea-battle");

const chat = require("./chat");
const meetingSignaling = require("./meeting-signaling");
function initRealtime(httpServer) {
  const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim());

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // Optionally check auth here using socket.handshake.auth or query
    // attach handlers for anonymous queue-based matchmaking
    socket.on(events.JOIN_QUEUE, (payload) => {
      const gameType = payload && payload.gameType;
      matchmaking.handleJoinQueue(io, socket, gameType);
    });

    socket.on(events.LEAVE_QUEUE, (payload) => {
      const gameType = payload && payload.gameType;
      matchmaking.handleLeaveQueue(io, socket, gameType);
    });

    socket.on("disconnect", (reason) => {
      matchmaking.handleDisconnect(io, socket);
      chat.handleChatDisconnect(io, socket);
      meetingSignaling.handleMeetingDisconnect(io, socket);
    });

    memoryGame.attachHandlers(io, socket);
    connectFourGame.attachHandlers(io, socket);
    beachBallsGame.attachHandlers(io, socket);
    seaBattleGame.attachHandlers(io, socket);
    chat.attachHandlers(io, socket);
    meetingSignaling.attachHandlers(io, socket);

    // game-specific modules will attach here later (e.g. require('./games/memory').attach(io, socket))
  });

  return io;
}

module.exports = { initRealtime };
