const events = require("../../events");
const rooms = require("../../rooms");
const {
  validatePlacement,
  resolveShot,
  markHit,
  isFleetFullySunk,
  hasCellBeenShot,
  findShipContainingCell,
  isShipFullySunk,
} = require("./logic");

function getOpponentSocketId(room, socketId) {
  return room.players.find((id) => id !== socketId) || null;
}

function normalizeFleetForStorage(ships) {
  return ships.map((ship) => ({
    cells: ship.cells.map((cell) => ({
      row: Number(cell.row),
      col: Number(cell.col),
      hit: Boolean(cell.hit),
    })),
  }));
}

function startGameForRoom(io, room) {
  if (!room || !room.id || room.gameState) return;

  room.gameState = {
    phase: "placing",
    boards: {},
    currentTurnSocketId: null,
  };

  for (const playerSocketId of room.players) {
    room.gameState.boards[playerSocketId] = {
      ships: null,
      shotsReceived: [],
      shotsFired: [],
    };
  }

  room.status = "active";

  io.to(room.id).emit(events.SEA_BATTLE_GAME_STARTED, {
    roomId: room.id,
    phase: "placing",
  });
}

function handlePlaceFleet(io, socket, payload) {
  try {
    const roomId = payload && payload.roomId;
    const ships = payload && payload.ships;

    const room = rooms.getRoomById(roomId);

    if (!room || room.gameType !== "sea_battle") {
      socket.emit(events.ERROR, { message: "Unknown Sea Battle room" });
      return;
    }

    if (room.status !== "active") {
      socket.emit(events.ERROR, { message: "Sea Battle room is not active" });
      return;
    }

    if (!room.players.includes(socket.id)) {
      socket.emit(events.ERROR, { message: "You are not in this room" });
      return;
    }

    if (!room.gameState || room.gameState.phase !== "placing") {
      socket.emit(events.ERROR, { message: "Fleet placement is closed" });
      return;
    }

    const board = room.gameState.boards[socket.id];
    if (!board) {
      socket.emit(events.ERROR, { message: "Board not found" });
      return;
    }

    if (board.ships) {
      socket.emit(events.ERROR, { message: "You already placed your fleet" });
      return;
    }

    const validation = validatePlacement(ships);

    if (!validation.valid) {
      socket.emit(events.ERROR, {
        message: validation.reason || "Invalid fleet placement",
      });
      return;
    }

    board.ships = normalizeFleetForStorage(ships);

    socket.emit(events.FLEET_PLACED, {
      roomId: room.id,
      status: "placed",
    });

    const opponentSocketId = getOpponentSocketId(room, socket.id);
    if (opponentSocketId) {
      const opponentSocket = io.sockets.sockets.get(opponentSocketId);
      if (opponentSocket) {
        opponentSocket.emit(events.OPPONENT_READY, { roomId: room.id });
      }
    }

    const bothPlayersReady = room.players.every(
      (playerId) =>
        room.gameState.boards[playerId] &&
        room.gameState.boards[playerId].ships,
    );

    if (bothPlayersReady) {
      room.gameState.phase = "battle";
      const startingPlayerIndex = Math.floor(
        Math.random() * room.players.length,
      );
      room.gameState.currentTurnSocketId = room.players[startingPlayerIndex];

      io.to(room.id).emit(events.BATTLE_STARTED, {
        roomId: room.id,
        currentTurnSocketId: room.gameState.currentTurnSocketId,
      });
    }
  } catch (error) {
    console.error("Sea Battle place fleet error", error);
    socket.emit(events.ERROR, { message: "Failed to place fleet" });
  }
}

function handleFireShot(io, socket, payload) {
  try {
    const roomId = payload && payload.roomId;
    const row = payload && payload.row;
    const col = payload && payload.col;

    const room = rooms.getRoomById(roomId);

    if (!room || room.gameType !== "sea_battle") {
      socket.emit(events.ERROR, { message: "Unknown Sea Battle room" });
      return;
    }

    if (room.status !== "active") {
      socket.emit(events.ERROR, { message: "Sea Battle room is not active" });
      return;
    }

    if (!room.players.includes(socket.id)) {
      socket.emit(events.ERROR, { message: "You are not in this room" });
      return;
    }

    if (!room.gameState || room.gameState.phase !== "battle") {
      socket.emit(events.ERROR, { message: "Battle is not active" });
      return;
    }

    if (room.gameState.currentTurnSocketId !== socket.id) {
      socket.emit(events.ERROR, { message: "It is not your turn" });
      return;
    }

    if (!Number.isInteger(row) || !Number.isInteger(col)) {
      socket.emit(events.ERROR, { message: "Row and col must be integers" });
      return;
    }

    if (row < 0 || row > 6 || col < 0 || col > 8) {
      socket.emit(events.ERROR, { message: "Shot is out of bounds" });
      return;
    }

    const attackingBoard = room.gameState.boards[socket.id];
    if (!attackingBoard || !attackingBoard.ships) {
      socket.emit(events.ERROR, {
        message: "You have not placed a fleet yet",
      });
      return;
    }

    if (hasCellBeenShot(attackingBoard.shotsFired, row, col)) {
      socket.emit(events.ERROR, { message: "You already fired at that cell" });
      return;
    }

    const opponentSocketId = getOpponentSocketId(room, socket.id);
    if (!opponentSocketId) {
      socket.emit(events.ERROR, { message: "Opponent not found" });
      return;
    }

    const defenderBoard = room.gameState.boards[opponentSocketId];
    if (!defenderBoard || !defenderBoard.ships) {
      socket.emit(events.ERROR, {
        message: "Opponent has not placed a fleet yet",
      });
      return;
    }

    const result = resolveShot(defenderBoard.ships, row, col);

    attackingBoard.shotsFired.push({ row, col });

    // sunkShipCells stays null unless THIS shot was the one that fully
    // sank a ship — safe to reveal since the ship is already destroyed.
    let sunkShipCells = null;

    if (result === "hit") {
      defenderBoard.ships = markHit(defenderBoard.ships, row, col);
      defenderBoard.shotsReceived.push({ row, col, result: "hit" });

      const hitShip = findShipContainingCell(defenderBoard.ships, row, col);
      if (hitShip && isShipFullySunk(hitShip)) {
        sunkShipCells = hitShip.cells;
      }
    } else {
      defenderBoard.shotsReceived.push({ row, col, result: "miss" });
      room.gameState.currentTurnSocketId = opponentSocketId;
    }

    io.to(room.id).emit(events.SHOT_RESULT, {
      roomId: room.id,
      row,
      col,
      result,
      shooterSocketId: socket.id,
      currentTurnSocketId: room.gameState.currentTurnSocketId,
      sunkShipCells,
    });

    if (isFleetFullySunk(defenderBoard.ships)) {
      room.gameState.phase = "finished";
      room.status = "finished";

      io.to(room.id).emit(events.SEA_BATTLE_GAME_OVER, {
        roomId: room.id,
        winnerSocketId: socket.id,
        fleets: {
          [room.players[0]]: room.gameState.boards[room.players[0]].ships,
          [room.players[1]]: room.gameState.boards[room.players[1]].ships,
        },
      });
    }
  } catch (error) {
    console.error("Sea Battle fire shot error", error);
    socket.emit(events.ERROR, { message: "Failed to process shot" });
  }
}

function attachHandlers(io, socket) {
  socket.on(events.PLACE_FLEET, (payload) => {
    handlePlaceFleet(io, socket, payload);
  });

  socket.on(events.FIRE_SHOT, (payload) => {
    handleFireShot(io, socket, payload);
  });
}

module.exports = {
  startGameForRoom,
  attachHandlers,
};
