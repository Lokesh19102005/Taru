const { Server } = require("socket.io");
const events = require("./events");
const matchmaking = require("./matchmaking");
const memoryGame = require("./games/memory");
const connectFourGame = require("./games/connect-four");

function initRealtime(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
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
    });

    memoryGame.attachHandlers(io, socket);
    connectFourGame.attachHandlers(io, socket);

    // game-specific modules will attach here later (e.g. require('./games/memory').attach(io, socket))
  });

  return io;
}

module.exports = { initRealtime };
