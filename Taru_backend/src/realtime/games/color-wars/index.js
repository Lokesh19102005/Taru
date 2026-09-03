const events = require("../../events");
const rooms = require("../../rooms");
const {
  FLOOR_COLS,
  FLOOR_ROWS,
  BASE_ROLLER_RADIUS,
  POWERUP_PICKUP_RADIUS,
  SPEED_BOOST_MULTIPLIER,
  SIZE_BOOST_MULTIPLIER,
  PAINT_BOMB_RADIUS,
  BUFF_DURATION_MS,
  POWERUP_LIFETIME_MS,
  ROUND_DURATION_MS,
  POWERUP_TYPES,
  createInitialGrid,
  movePlayer,
  paintRadius,
  countCellsByOwner,
  isWithinPickupRadius,
  pickRandomFreeCell,
} = require("./logic");

const TICK_MS = 50;

function createPlayerState(socketId, x, y) {
  return {
    socketId,
    x,
    y,
    direction: { dx: 0, dy: 0 },
    speedMultiplier: 1,
    sizeMultiplier: 1,
    speedBoostUntil: 0,
    sizeBoostUntil: 0,
    rollerRadius: BASE_ROLLER_RADIUS,
  };
}

function startGameForRoom(io, room) {
  if (!room || !room.id || room.gameState) return;

  const [playerAId, playerBId] = room.players;

  const state = {
    phase: "active",
    grid: createInitialGrid(),
    players: {
      [playerAId]: createPlayerState(playerAId, 4, 4),
      [playerBId]: createPlayerState(playerBId, FLOOR_COLS - 4, FLOOR_ROWS - 4),
    },
    powerups: [],
    remainingMs: ROUND_DURATION_MS,
    nextPowerupSpawnAt: Date.now() + 4000,
    lastTickAt: Date.now(),
  };

  room.gameState = state;
  room.status = "active";

  io.to(room.id).emit(events.COLOR_WARS_GAME_STARTED, {
    roomId: room.id,
    floorCols: FLOOR_COLS,
    floorRows: FLOOR_ROWS,
    players: {
      [playerAId]: {
        socketId: playerAId,
        x: state.players[playerAId].x,
        y: state.players[playerAId].y,
        rollerRadius: state.players[playerAId].rollerRadius,
      },
      [playerBId]: {
        socketId: playerBId,
        x: state.players[playerBId].x,
        y: state.players[playerBId].y,
        rollerRadius: state.players[playerBId].rollerRadius,
      },
    },
    grid: state.grid,
    remainingMs: state.remainingMs,
  });

  room.gameLoopHandle = setInterval(() => {
    stepGame(io, room);
  }, TICK_MS);
}

function stepGame(io, room) {
  if (!room || room.status !== "active" || !room.gameState) return;

  const state = room.gameState;
  const now = Date.now();

  if (state.remainingMs <= 0) {
    endGame(io, room);
    return;
  }

  const deltaSeconds = TICK_MS / 1000;
  let changedCells = [];

  // Update remaining time
  state.remainingMs = Math.max(0, state.remainingMs - TICK_MS);

  // 1) Move players
  for (const playerId of room.players) {
    const player = state.players[playerId];
    if (!player) continue;

    const updatedPosition = movePlayer(player, deltaSeconds);
    player.x = updatedPosition.x;
    player.y = updatedPosition.y;

    // apply active buffs
    if (player.speedBoostUntil && now > player.speedBoostUntil) {
      player.speedMultiplier = 1;
      player.speedBoostUntil = 0;
    }

    if (player.sizeBoostUntil && now > player.sizeBoostUntil) {
      player.sizeMultiplier = 1;
      player.rollerRadius = BASE_ROLLER_RADIUS;
      player.sizeBoostUntil = 0;
    }

    const currentRadius = player.rollerRadius * player.sizeMultiplier;
    const paintResult = paintRadius(
      state.grid,
      player.x,
      player.y,
      currentRadius,
      player.socketId,
    );

    state.grid = paintResult.grid;
    changedCells = changedCells.concat(paintResult.changedCells);
  }

  // 2) Powerup spawn / expire
  if (now >= state.nextPowerupSpawnAt) {
    const row = Math.floor(Math.random() * state.grid.length);
    const col = Math.floor(Math.random() * state.grid[0].length);

    const type =
      POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];

    state.powerups.push({
      id: `${Date.now()}-${Math.random()}`,
      row,
      col,
      x: col + 0.5,
      y: row + 0.5,
      type,
      spawnedAt: now,
      expiresAt: now + POWERUP_LIFETIME_MS,
    });

    state.nextPowerupSpawnAt = now + 4000 + Math.random() * 2000;
  }

  state.powerups = state.powerups.filter((powerup) => {
    return powerup.expiresAt > now;
  });

  // 3) Pickups
  for (const playerId of room.players) {
    const player = state.players[playerId];
    if (!player) continue;

    const remainingPowerups = [];

    for (const powerup of state.powerups) {
      const inRange = isWithinPickupRadius(
        player.x,
        player.y,
        powerup.x,
        powerup.y,
        player.rollerRadius,
      );

      if (!inRange) {
        remainingPowerups.push(powerup);
        continue;
      }

      if (powerup.type === "speed_boost") {
        player.speedMultiplier = SPEED_BOOST_MULTIPLIER;
        player.speedBoostUntil = now + BUFF_DURATION_MS;
      } else if (powerup.type === "size_boost") {
        player.sizeMultiplier = SIZE_BOOST_MULTIPLIER;
        player.rollerRadius = BASE_ROLLER_RADIUS * SIZE_BOOST_MULTIPLIER;
        player.sizeBoostUntil = now + BUFF_DURATION_MS;
      } else if (powerup.type === "paint_bomb") {
        const bombResult = paintRadius(
          state.grid,
          player.x,
          player.y,
          PAINT_BOMB_RADIUS,
          player.socketId,
        );
        state.grid = bombResult.grid;
        changedCells = changedCells.concat(bombResult.changedCells);
      }
    }

    state.powerups = remainingPowerups;
  }

  if (state.remainingMs <= 0) {
    endGame(io, room);
    return;
  }

  io.to(room.id).emit(events.COLOR_WARS_STATE, {
    roomId: room.id,
    players: Object.fromEntries(
      room.players.map((id) => [
        id,
        {
          socketId: id,
          x: state.players[id].x,
          y: state.players[id].y,
          speedMultiplier: state.players[id].speedMultiplier,
          rollerRadius: state.players[id].rollerRadius,
        },
      ]),
    ),
    powerups: state.powerups.map((p) => ({
      id: p.id,
      x: p.x,
      y: p.y,
      row: p.row,
      col: p.col,
      type: p.type,
    })),
    changedCells,
    remainingMs: state.remainingMs,
    floorCols: FLOOR_COLS,
    floorRows: FLOOR_ROWS,
  });
}

function endGame(io, room) {
  const state = room.gameState;
  if (!state) return;

  const counts = countCellsByOwner(state.grid);

  let winnerSocketId = null;
  const playerIds = room.players;

  if (playerIds.length >= 2) {
    const a = counts[playerIds[0]] || 0;
    const b = counts[playerIds[1]] || 0;

    if (a > b) winnerSocketId = playerIds[0];
    if (b > a) winnerSocketId = playerIds[1];
  }

  room.status = "finished";
  io.to(room.id).emit(events.COLOR_WARS_GAME_OVER, {
    roomId: room.id,
    winnerSocketId,
    counts,
    grid: state.grid,
  });

  stopGameForRoom(room);
}

function handleSetDirection(io, socket, payload) {
  try {
    const roomId = payload && payload.roomId;
    const dx = payload && payload.dx;
    const dy = payload && payload.dy;

    const room = rooms.getRoomById(roomId);

    if (!room || room.gameType !== "color_wars") {
      socket.emit(events.ERROR, { message: "Unknown Color Wars room" });
      return;
    }

    if (room.status !== "active" || !room.gameState) {
      socket.emit(events.ERROR, { message: "Game is not active" });
      return;
    }

    if (!room.players.includes(socket.id)) {
      socket.emit(events.ERROR, { message: "You are not in this room" });
      return;
    }

    if (typeof dx !== "number" || typeof dy !== "number") {
      socket.emit(events.ERROR, {
        message: "Direction must include dx and dy",
      });
      return;
    }

    const player = room.gameState.players[socket.id];
    if (!player) {
      socket.emit(events.ERROR, { message: "Player not found" });
      return;
    }

    player.direction = { dx, dy };
  } catch (error) {
    socket.emit(events.ERROR, { message: "Failed to set direction" });
  }
}

function attachHandlers(io, socket) {
  socket.on(events.SET_DIRECTION, (payload) => {
    handleSetDirection(io, socket, payload);
  });
}

function stopGameForRoom(room) {
  if (!room || !room.gameLoopHandle) return;
  clearInterval(room.gameLoopHandle);
  room.gameLoopHandle = null;
}

module.exports = {
  startGameForRoom,
  attachHandlers,
  stopGameForRoom,
};
