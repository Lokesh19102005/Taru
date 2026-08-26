const events = require("../events");
const rooms = require("../rooms");

const ROWS = 6;
const COLUMNS = 7;

function createEmptyGrid() {
  // row 0 is the bottom row; pieces land there first.
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLUMNS }, () => null),
  );
}

function startGameForRoom(io, room) {
  if (!room || !room.id || room.gameState) return;

  const starter = room.players[Math.floor(Math.random() * room.players.length)];

  room.gameState = {
    grid: createEmptyGrid(),
    currentTurnSocketId: starter,
    moveCount: 0,
  };

  room.status = "active";

  io.to(room.id).emit(events.FOUR_GAME_STARTED, {
    roomId: room.id,
    grid: room.gameState.grid,
    currentTurnSocketId: starter,
  });
}

function attachHandlers(io, socket) {
  socket.on(events.DROP_PIECE, (payload) => {
    handleDropPiece(io, socket, payload);
  });
}

function isValidColumn(column) {
  return Number.isInteger(column) && column >= 0 && column < COLUMNS;
}

function getLandingRow(grid, column) {
  for (let row = 0; row < ROWS; row += 1) {
    if (grid[row][column] === null) {
      return row;
    }
  }

  return -1;
}

function getWinningCells(grid, row, column, playerSocketId) {
  const directions = [
    [0, 1], // horizontal
    [1, 0], // vertical
    [1, 1], // diagonal bottom-left to top-right
    [1, -1], // diagonal bottom-right to top-left
  ];

  for (const [rowDirection, columnDirection] of directions) {
    const cells = [{ row, col: column }];

    collectDirection(
      grid,
      row,
      column,
      rowDirection,
      columnDirection,
      playerSocketId,
      cells,
    );

    collectDirection(
      grid,
      row,
      column,
      -rowDirection,
      -columnDirection,
      playerSocketId,
      cells,
    );

    if (cells.length >= 4) {
      return cells;
    }
  }

  return null;
}

function collectDirection(
  grid,
  startRow,
  startColumn,
  rowDirection,
  columnDirection,
  playerSocketId,
  cells,
) {
  let row = startRow + rowDirection;
  let column = startColumn + columnDirection;

  while (
    row >= 0 &&
    row < ROWS &&
    column >= 0 &&
    column < COLUMNS &&
    grid[row][column] === playerSocketId
  ) {
    cells.push({ row, col: column });
    row += rowDirection;
    column += columnDirection;
  }
}

function handleDropPiece(io, socket, payload) {
  try {
    const { roomId, column } = payload || {};
    const room = rooms.getRoomById(roomId);

    if (!room || room.status !== "active") {
      socket.emit(events.ERROR, { message: "Invalid or inactive room" });
      return;
    }

    if (!room.players.includes(socket.id)) {
      socket.emit(events.ERROR, { message: "You are not in this room" });
      return;
    }

    const gameState = room.gameState;

    if (!gameState) {
      socket.emit(events.ERROR, { message: "Game not initialized" });
      return;
    }

    if (gameState.currentTurnSocketId !== socket.id) {
      socket.emit(events.ERROR, { message: "Not your turn" });
      return;
    }

    if (!isValidColumn(column)) {
      socket.emit(events.ERROR, {
        message: "Column must be an integer from 0 to 6",
      });
      return;
    }

    const row = getLandingRow(gameState.grid, column);

    if (row === -1) {
      socket.emit(events.ERROR, { message: "Column is full" });
      return;
    }

    gameState.grid[row][column] = socket.id;
    gameState.moveCount += 1;

    io.to(room.id).emit(events.PIECE_DROPPED, {
      roomId: room.id,
      column,
      row,
      playerSocketId: socket.id,
    });

    const winningCells = getWinningCells(
      gameState.grid,
      row,
      column,
      socket.id,
    );

    if (winningCells) {
      room.status = "finished";

      io.to(room.id).emit(events.FOUR_GAME_OVER, {
        roomId: room.id,
        winnerSocketId: socket.id,
        winningCells: winningCells.slice(0, 4),
      });

      return;
    }

    if (gameState.moveCount === ROWS * COLUMNS) {
      room.status = "finished";

      io.to(room.id).emit(events.FOUR_GAME_OVER, {
        roomId: room.id,
        winnerSocketId: null,
        winningCells: [],
      });

      return;
    }

    const nextPlayer = room.players.find((playerId) => playerId !== socket.id);

    gameState.currentTurnSocketId = nextPlayer;

    io.to(room.id).emit(events.ROOM_STATE, {
      roomId: room.id,
      grid: gameState.grid,
      currentTurnSocketId: gameState.currentTurnSocketId,
    });
  } catch (error) {
    console.error("handleDropPiece error", error);
    socket.emit(events.ERROR, { message: "Failed to process move" });
  }
}

module.exports = {
  startGameForRoom,
  attachHandlers,
};
