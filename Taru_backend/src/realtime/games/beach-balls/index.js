const events = require("../../events");
const rooms = require("../../rooms");
const {
  createInitialState,
  stepBall,
  stepProjectile,
  checkProjectileBallCollision,
  applyImpact,
  checkGoal,
  isDuckLoaded,
  advanceDuckAngle,
} = require("./physics");

const TICK_MS = 50;

function createPlayerScores(room) {
  const scores = {};

  for (const playerSocketId of room.players) {
    scores[playerSocketId] = 0;
  }

  return scores;
}

function getRoomState(room) {
  return {
    roomId: room.id,
    ball: room.gameState.ball,
    ducks: room.gameState.ducks,
    projectiles: room.gameState.projectiles,
    scores: room.gameState.scores,
    pausedUntil: room.gameState.pausedUntil,
    topPlayerSocketId: room.gameState.topPlayerSocketId,
    bottomPlayerSocketId: room.gameState.bottomPlayerSocketId,
  };
}

function emitState(io, room) {
  if (!room || !room.gameState) return;

  io.to(room.id).emit(events.BEACH_BALLS_STATE, getRoomState(room));
}

function startGameForRoom(io, room) {
  if (!room || !room.id || room.gameState) return;

  const state = createInitialState();
  state.scores = createPlayerScores(room);

  // The first room player owns the top goal.
  // The second room player owns the bottom goal.
  state.topPlayerSocketId = room.players[0];
  state.bottomPlayerSocketId = room.players[1];

  room.gameState = state;
  room.status = "active";

  io.to(room.id).emit(events.BEACH_BALLS_GAME_STARTED, getRoomState(room));

  room.gameLoopHandle = setInterval(() => {
    stepGame(io, room);
  }, TICK_MS);
}

function stepGame(io, room) {
  if (!room || room.status !== "active" || !room.gameState) {
    return;
  }

  const state = room.gameState;
  const now = Date.now();
  const deltaSeconds = TICK_MS / 1000;

  state.ducks.top.angle = advanceDuckAngle(
    state.ducks.top.angle,
    state.config.angularVelocityDegPerSec,
    deltaSeconds,
  );

  state.ducks.bottom.angle = advanceDuckAngle(
    state.ducks.bottom.angle,
    state.config.angularVelocityDegPerSec,
    deltaSeconds,
  );

  if (state.pausedUntil && now < state.pausedUntil) {
    emitState(io, room);
    return;
  }

  if (state.pausedUntil && now >= state.pausedUntil) {
    state.pausedUntil = 0;
  }

  state.ball = stepBall(
    state.ball,
    state.config.ballDragFactor,
    state.poolWidth,
    state.poolHeight,
    state.config.goalWidth,
    state.config.railThickness,
  );

  const nextProjectiles = [];

  for (const projectile of state.projectiles) {
    if (checkProjectileBallCollision(projectile, state.ball)) {
      state.ball = applyImpact(
        state.ball,
        projectile,
        state.config.impactForce * (TICK_MS / 1000),
      );

      io.to(room.id).emit(events.BEACH_BALLS_HIT, {
        roomId: room.id,
        x: projectile.x,
        y: projectile.y,
      });

      continue;
    }

    const nextProjectile = stepProjectile(
      {
        ...projectile,
        tickMs: TICK_MS,
      },
      state.poolWidth,
      state.config.railThickness,
    );

    if (nextProjectile) {
      nextProjectiles.push(nextProjectile);
    }
  }

  state.projectiles = nextProjectiles;

  // Check for two projectiles colliding with each other mid-air.
  const survivingProjectiles = [];
  const clashedIds = new Set();

  for (let i = 0; i < state.projectiles.length; i++) {
    const a = state.projectiles[i];
    if (clashedIds.has(a.id)) continue;

    let clashed = false;

    for (let j = i + 1; j < state.projectiles.length; j++) {
      const b = state.projectiles[j];
      if (clashedIds.has(b.id)) continue;

      // checkProjectileBallCollision just does circle-vs-circle by x/y/radius,
      // so it works fine for two projectiles too, not just projectile-vs-ball.
      if (checkProjectileBallCollision(a, b)) {
        clashedIds.add(a.id);
        clashedIds.add(b.id);
        clashed = true;

        io.to(room.id).emit(events.BEACH_BALLS_HIT, {
          roomId: room.id,
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
        });

        break;
      }
    }

    if (!clashed) {
      survivingProjectiles.push(a);
    }
  }

  state.projectiles = survivingProjectiles;

  const goal = checkGoal(
    state.ball,
    state.poolHeight,
    state.poolWidth,
    state.config.goalWidth,
  );

  if (goal) {
    handleGoal(io, room, goal);
    return;
  }

  emitState(io, room);
}

function handleGoal(io, room, goal) {
  const state = room.gameState;

  const scoringSocketId =
    goal === "top" ? state.bottomPlayerSocketId : state.topPlayerSocketId;

  state.scores[scoringSocketId] += 1;
  state.ball = {
    ...state.ball,
    x: state.poolWidth / 2,
    y: state.poolHeight / 2,
    vx: 0,
    vy: 0,
  };
  state.projectiles = [];
  state.pausedUntil = Date.now() + state.config.goalPauseMs;

  io.to(room.id).emit(events.BEACH_BALLS_GOAL, {
    roomId: room.id,
    scoringSocketId,
    scores: state.scores,
  });

  if (state.scores[scoringSocketId] >= state.config.goalsToWin) {
    room.status = "finished";

    io.to(room.id).emit(events.BEACH_BALLS_GAME_OVER, {
      roomId: room.id,
      winnerSocketId: scoringSocketId,
      scores: state.scores,
    });

    stopGameForRoom(room);
    return;
  }

  emitState(io, room);
}

function getDuckForPlayer(state, socketId) {
  if (socketId === state.topPlayerSocketId) {
    return {
      duck: state.ducks.top,
      side: "top",
    };
  }

  if (socketId === state.bottomPlayerSocketId) {
    return {
      duck: state.ducks.bottom,
      side: "bottom",
    };
  }

  return null;
}

function getProjectileVelocity(state, playerSocketId) {
  const playerDuck = getDuckForPlayer(state, playerSocketId);
  if (!playerDuck) return null;

  const angleOffset = (playerDuck.duck.angle * Math.PI) / 180;

  // Bottom player fires upward from the bottom edge.
  // Top player fires downward from the top edge.
  const direction =
    playerDuck.side === "bottom"
      ? {
          x: Math.sin(angleOffset),
          y: -Math.cos(angleOffset),
        }
      : {
          x: -Math.sin(angleOffset),
          y: Math.cos(angleOffset),
        };

  return {
    vx: direction.x * state.config.projectileSpeed * (TICK_MS / 1000),
    vy: direction.y * state.config.projectileSpeed * (TICK_MS / 1000),
  };
}

function handleFireProjectile(io, socket, payload) {
  try {
    const roomId = payload && payload.roomId;
    const room = rooms.getRoomById(roomId);

    if (!room || room.gameType !== "beach_balls") {
      socket.emit(events.ERROR, {
        message: "Unknown Beach Balls room",
      });
      return;
    }

    if (room.status !== "active" || !room.gameState) {
      socket.emit(events.ERROR, {
        message: "Game is not active",
      });
      return;
    }

    if (!room.players.includes(socket.id)) {
      socket.emit(events.ERROR, {
        message: "You are not in this room",
      });
      return;
    }

    const state = room.gameState;

    if (state.pausedUntil > Date.now()) {
      socket.emit(events.ERROR, {
        message: "The game is paused after a goal",
      });
      return;
    }

    const playerDuck = getDuckForPlayer(state, socket.id);

    if (!playerDuck) {
      socket.emit(events.ERROR, {
        message: "Player duck not found",
      });
      return;
    }

    if (
      !isDuckLoaded(
        playerDuck.duck.angle,
        state.config.duckLoadToleranceDegrees,
      )
    ) {
      socket.emit(events.ERROR, {
        message: "Duck is not facing the pool",
      });
      return;
    }

    const existingProjectile = state.projectiles.some(
      (projectile) => projectile.ownerSocketId === socket.id,
    );

    if (existingProjectile) {
      socket.emit(events.ERROR, {
        message: "You already have a projectile in flight",
      });
      return;
    }

    const velocity = getProjectileVelocity(state, socket.id);
    const x = state.poolWidth / 2;
    const y =
      playerDuck.side === "bottom"
        ? state.poolHeight + state.config.duckOffset
        : -state.config.duckOffset;

    state.projectiles.push({
      id: `${socket.id}-${state.moveSequence++}`,
      ownerSocketId: socket.id,
      x,
      y,
      vx: velocity.vx,
      vy: velocity.vy,
      radius: state.config.projectileRadius,
      ageMs: 0,
      tickMs: TICK_MS,
      maxLifetimeMs: state.config.projectileMaxLifetimeMs,
      poolHeight: state.poolHeight,
      spawnMargin: state.config.duckOffset + 15, // small buffer past the duck
    });
  } catch (error) {
    console.error("Beach Balls fire error", error);
    socket.emit(events.ERROR, {
      message: "Failed to fire projectile",
    });
  }
}

function attachHandlers(io, socket) {
  socket.on(events.FIRE_PROJECTILE, (payload) => {
    handleFireProjectile(io, socket, payload);
  });
}

function stopGameForRoom(room) {
  if (!room || !room.gameLoopHandle) {
    return;
  }

  clearInterval(room.gameLoopHandle);
  room.gameLoopHandle = null;
}

module.exports = {
  startGameForRoom,
  attachHandlers,
  stopGameForRoom,
};
