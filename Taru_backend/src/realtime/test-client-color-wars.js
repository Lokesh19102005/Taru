const ioClient = require("socket.io-client");
const events = require("./events");

const SERVER = process.env.TEST_SERVER || "http://localhost:5000";
const SAFETY_TIMEOUT_MS = 15000;
const DIRECTION_RESEND_MS = 500;
const POSITION_FROZEN_TICK_THRESHOLD = 15; // ~1.5s of ticks with no movement

const clients = [];
let testFinished = false;
let safetyTimer = null;
let gameOverFinishTimer = null;
let postGameOverStateTicks = 0;
let gameOverReceived = false;
let totalChangedCells = 0;

function finishTest(message) {
  if (testFinished) return;
  testFinished = true;

  if (safetyTimer) clearTimeout(safetyTimer);
  if (gameOverFinishTimer) clearTimeout(gameOverFinishTimer);

  console.log(message);
  console.log(
    `Total changed cells observed across the test: ${totalChangedCells}`,
  );

  for (const client of clients) {
    client.disconnect();
  }

  setTimeout(() => {
    process.exit(message.startsWith("PASS") ? 0 : 1);
  }, 100);
}

function handleGameOver(payload) {
  if (gameOverReceived) return;
  gameOverReceived = true;

  console.log("COLOR_WARS_GAME_OVER:", {
    roomId: payload.roomId,
    winnerSocketId: payload.winnerSocketId,
    counts: payload.counts,
  });

  gameOverFinishTimer = setTimeout(() => {
    if (postGameOverStateTicks === 0) {
      finishTest(
        "PASS: no further state ticks after game over - loop stopped correctly",
      );
    } else {
      finishTest(
        `FAIL: received ${postGameOverStateTicks} state ticks after game over - the interval was not cleared`,
      );
    }
  }, 2000);
}

function createClient(label) {
  const client = ioClient(SERVER, {
    transports: ["websocket"],
    reconnection: false,
  });

  clients.push(client);

  let roomId = null;
  let tickCount = 0;
  let direction = null;
  let directionIntervalHandle = null;
  let lastPosition = null;
  let framesSincePositionChanged = 0;
  let loggedPowerupOnce = false;

  const stopSendingDirection = () => {
    if (directionIntervalHandle) {
      clearInterval(directionIntervalHandle);
      directionIntervalHandle = null;
    }
  };

  client.on("connect", () => {
    console.log(`${label} connected: ${client.id}`);
    client.emit(events.JOIN_QUEUE, { gameType: "color_wars" });
  });

  client.on(events.MATCH_FOUND, (payload) => {
    console.log(`${label} MATCH_FOUND:`, payload);
    roomId = payload.roomId;
  });

  client.on(events.COLOR_WARS_GAME_STARTED, (payload) => {
    roomId = payload.roomId;

    const myPlayer = payload.players[client.id];
    console.log(`${label} COLOR_WARS_GAME_STARTED:`, {
      roomId: payload.roomId,
      floorCols: payload.floorCols,
      floorRows: payload.floorRows,
      myStartPosition: myPlayer ? { x: myPlayer.x, y: myPlayer.y } : null,
    });

    if (!myPlayer) {
      console.error(
        `${label} could not find its own player in game_started payload`,
      );
      return;
    }

    lastPosition = { x: myPlayer.x, y: myPlayer.y };

    const centerX = payload.floorCols / 2;
    const centerY = payload.floorRows / 2;
    const dx = centerX - myPlayer.x;
    const dy = centerY - myPlayer.y;
    const magnitude = Math.hypot(dx, dy) || 1;
    direction = { dx: dx / magnitude, dy: dy / magnitude };

    console.log(`${label} heading toward center with direction`, direction);

    const sendDirection = () => {
      if (!roomId || !direction) return;
      client.emit(events.SET_DIRECTION, {
        roomId,
        dx: direction.dx,
        dy: direction.dy,
      });
    };

    sendDirection();
    directionIntervalHandle = setInterval(sendDirection, DIRECTION_RESEND_MS);
  });

  client.on(events.COLOR_WARS_STATE, (payload) => {
    tickCount += 1;

    if (gameOverReceived) {
      postGameOverStateTicks += 1;
      return;
    }

    totalChangedCells += (payload.changedCells || []).length;

    const myPlayer = payload.players[client.id];
    if (myPlayer && lastPosition) {
      const moved =
        Math.abs(myPlayer.x - lastPosition.x) > 0.001 ||
        Math.abs(myPlayer.y - lastPosition.y) > 0.001;

      if (moved) {
        framesSincePositionChanged = 0;
      } else {
        framesSincePositionChanged += 1;
        if (framesSincePositionChanged === POSITION_FROZEN_TICK_THRESHOLD) {
          console.warn(
            `${label} WARNING: position has not changed for ${POSITION_FROZEN_TICK_THRESHOLD} ticks - movement may not be working`,
          );
        }
      }

      lastPosition = { x: myPlayer.x, y: myPlayer.y };
    }

    if (!loggedPowerupOnce && payload.powerups && payload.powerups.length > 0) {
      loggedPowerupOnce = true;
      console.log(`${label} first powerup(s) seen:`, payload.powerups);
    }

    if (tickCount % 10 === 0) {
      console.log(`${label} COLOR_WARS_STATE tick ${tickCount}:`, {
        players: Object.fromEntries(
          Object.entries(payload.players).map(([id, p]) => [
            id,
            { x: Number(p.x.toFixed(2)), y: Number(p.y.toFixed(2)) },
          ]),
        ),
        changedCellsThisTick: (payload.changedCells || []).length,
        remainingMs: payload.remainingMs,
      });
    }
  });

  client.on(events.COLOR_WARS_GAME_OVER, (payload) => {
    stopSendingDirection();
    handleGameOver(payload);
  });

  client.on(events.OPPONENT_LEFT, (payload) => {
    console.error(`${label} OPPONENT_LEFT:`, payload);
    finishTest("FAIL: opponent disconnected before the game ended");
  });

  client.on(events.ERROR, (payload) => {
    console.error(`${label} ERROR:`, payload);
  });

  client.on("connect_error", (error) => {
    console.error(`${label} connect_error: ${error.message}`);
  });

  client.on("disconnect", (reason) => {
    stopSendingDirection();
    console.log(`${label} disconnected: ${reason}`);
  });
}

createClient("ClientA");

setTimeout(() => {
  createClient("ClientB");
}, 250);

safetyTimer = setTimeout(() => {
  finishTest(
    "FAIL: safety timeout reached - something did not complete in time",
  );
}, SAFETY_TIMEOUT_MS);
