const events = require("../events");
const rooms = require("../rooms");
const { shuffle } = require("../utils");

const DEFAULT_PAIRS = 8;
const FLIP_BACK_DELAY_MS = 1000;

function makeDeck(pairs = DEFAULT_PAIRS) {
  const cards = [];
  let id = 0;
  for (let pairId = 0; pairId < pairs; pairId++) {
    cards.push({ id: id++, pairId, faceUp: false, matched: false });
    cards.push({ id: id++, pairId, faceUp: false, matched: false });
  }
  return shuffle(cards);
}

function sanitizeBoard(cards) {
  // For each card, reveal pairId only if faceUp or matched.
  return cards.map((c) => {
    const out = { id: c.id, faceUp: !!c.faceUp, matched: !!c.matched };
    if (c.faceUp || c.matched) out.pairId = c.pairId;
    return out;
  });
}

function startGameForRoom(io, room, pairs = DEFAULT_PAIRS) {
  if (!room || !room.id) return;
  if (room.gameState) return; // already started

  const deck = makeDeck(pairs);
  const scores = {};
  for (const sid of room.players) scores[sid] = 0;

  const starter = room.players[Math.floor(Math.random() * room.players.length)];

  room.gameState = {
    cards: deck,
    currentTurnSocketId: starter,
    scores,
    flippedThisTurn: [], // card ids
  };

  room.status = "active";

  // Emit GAME_STARTED to all players in the socket.io room
  const payload = {
    roomId: room.id,
    board: sanitizeBoard(room.gameState.cards),
    currentTurnSocketId: room.gameState.currentTurnSocketId,
    scores: room.gameState.scores,
  };

  io.to(room.id).emit(events.GAME_STARTED, payload);
}

function attachHandlers(io, socket) {
  socket.on(events.FLIP_CARD, (payload) => {
    handleFlip(io, socket, payload);
  });
}

function handleFlip(io, socket, payload) {
  try {
    const { roomId, cardId } = payload || {};

    const room = rooms.findRoomBySocket(socket.id);
    if (!room || !roomId || room.id !== roomId || room.status !== "active") {
      socket.emit(events.ERROR, { message: "Invalid or inactive room" });
      return;
    }

    const gs = room.gameState;
    if (!gs) {
      socket.emit(events.ERROR, { message: "Game not initialized" });
      return;
    }

    if (!room.players.includes(socket.id)) {
      socket.emit(events.ERROR, { message: "Not a player in this room" });
      return;
    }

    if (gs.currentTurnSocketId !== socket.id) {
      socket.emit(events.ERROR, { message: "Not your turn" });
      return;
    }

    if (!Number.isInteger(cardId)) {
      socket.emit(events.ERROR, { message: "cardId must be an integer" });
      return;
    }

    const card = gs.cards.find((c) => c.id === cardId);
    if (!card) {
      socket.emit(events.ERROR, { message: "Unknown card" });
      return;
    }

    if (card.matched || card.faceUp) {
      socket.emit(events.ERROR, { message: "Card already matched or face-up" });
      return;
    }

    if (gs.flippedThisTurn.length >= 2) {
      socket.emit(events.ERROR, {
        message: "Turn already has two flips in progress",
      });
      return;
    }

    // Flip the card face-up
    card.faceUp = true;
    gs.flippedThisTurn.push(card.id);

    // Broadcast CARD_FLIPPED (reveal pairId since it's face-up now)
    io.to(room.id).emit(events.CARD_FLIPPED, {
      roomId: room.id,
      cardId: card.id,
      pairId: card.pairId,
    });

    // If this was the second flip, resolve the turn
    if (gs.flippedThisTurn.length === 2) {
      const [idA, idB] = gs.flippedThisTurn;
      const a = gs.cards.find((c) => c.id === idA);
      const b = gs.cards.find((c) => c.id === idB);
      if (!a || !b) {
        socket.emit(events.ERROR, { message: "Invalid flipped cards" });
        gs.flippedThisTurn = [];
        return;
      }

      if (a.pairId === b.pairId) {
        // Match
        a.matched = true;
        b.matched = true;
        const playerId = socket.id;
        gs.scores[playerId] = (gs.scores[playerId] || 0) + 1;
        gs.flippedThisTurn = [];

        // Emit TURN_RESULT: matched true, scores, keep same currentTurn
        io.to(room.id).emit(events.TURN_RESULT, {
          roomId: room.id,
          matched: true,
          scores: gs.scores,
          currentTurnSocketId: gs.currentTurnSocketId,
        });

        // Check game over
        const allMatched = gs.cards.every((c) => c.matched);
        if (allMatched) {
          room.status = "finished";
          let winner = null;
          const players = room.players;
          const s0 = gs.scores[players[0]] || 0;
          const s1 = gs.scores[players[1]] || 0;
          if (s0 > s1) winner = players[0];
          else if (s1 > s0) winner = players[1];
          io.to(room.id).emit(events.GAME_OVER, {
            roomId: room.id,
            scores: gs.scores,
            winnerSocketId: winner,
          });
        }

        return;
      }

      // Not a match: inform clients and flip back after delay
      io.to(room.id).emit(events.TURN_RESULT, {
        roomId: room.id,
        matched: false,
        scores: gs.scores,
        currentTurnSocketId: gs.currentTurnSocketId,
        flipBackAfterMs: FLIP_BACK_DELAY_MS,
      });

      // After delay, flip both back and change turn
      setTimeout(() => {
        // Defensive re-fetch (room could be cleaned up)
        const freshRoom = rooms.getRoomById
          ? rooms.getRoomById(room.id)
          : rooms.findRoomBySocket(socket.id);
        const targetRoom = freshRoom || room;
        if (!targetRoom || !targetRoom.gameState) return;
        const state = targetRoom.gameState;
        const ca = state.cards.find((c) => c.id === idA);
        const cb = state.cards.find((c) => c.id === idB);
        if (ca) ca.faceUp = false;
        if (cb) cb.faceUp = false;

        // Switch current turn to opponent
        const opponent = targetRoom.players.find((id) => id !== socket.id);
        state.currentTurnSocketId = opponent || state.currentTurnSocketId;
        state.flippedThisTurn = [];

        // Emit sanitized room_state so clients update board & turn
        io.to(targetRoom.id).emit(events.ROOM_STATE, {
          roomId: targetRoom.id,
          board: sanitizeBoard(state.cards),
          currentTurnSocketId: state.currentTurnSocketId,
          scores: state.scores,
        });
      }, FLIP_BACK_DELAY_MS);
    }
  } catch (err) {
    console.error("handleFlip error", err);
    socket.emit(events.ERROR, { message: "Failed to process flip" });
  }
}

module.exports = {
  startGameForRoom,
  attachHandlers,
};
