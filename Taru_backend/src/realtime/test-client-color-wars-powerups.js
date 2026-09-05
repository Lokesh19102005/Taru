const ioClient = require("socket.io-client");
const events = require("./events");
const {
  BASE_ROLLER_RADIUS,
  SPEED_BOOST_MULTIPLIER,
  SIZE_BOOST_MULTIPLIER,
} = require("./games/color-wars/logic");

const SERVER = process.env.TEST_SERVER || "http://localhost:5000";
const SAFETY_TIMEOUT_MS = 20000;
const CHASE_BURST_CELLS_THRESHOLD = 15; // a paint_bomb should produce a big spike

const clients = [];
let testFinished = false;
let safetyTimer = null;
let gameOverFinishTimer = null;
let postGameOverStateTicks = 0;
let gameOverReceived = false;
let pickupConfirmed = false;

function finishTest(message) {
  if (testFinished) return;
  testFinished = true;

  if (safetyTimer) clearTimeout(safetyTimer);
  if (gameOverFinishTimer) clearTimeout(gameOverFinishTimer);

  console.log(message);
  console.log(
    pickupConfirmed
      ? "Powerup pickup effect: CONFIRMED"
      : "Powerup pickup effect: NOT CONFIRMED (no pickup observed in this run — safe to re-run, spawn timing is probabilistic)",
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

function createIdleClient(label) {
  const client = ioClient(SERVER, {
    transports: ["websocket"],
    reconnection: false,
  });
  clients.push(client);

  client.on("connect", () => {
    console.log(`${label} connected: ${client.id}`);
    client.emit(events.JOIN_QUEUE, { gameType: "color_wars" });
  });

  client.on(events.COLOR_WARS_GAME_STARTED, () => {
    console.log(`${label} (idle) game started — staying put`);
  });

  client.on(events.COLOR_WARS_GAME_OVER, handleGameOver);
  client.on(events.OPPONENT_LEFT, (p) =>
    console.error(`${label} OPPONENT_LEFT`, p),
  );
  client.on(events.ERROR, (p) => console.error(`${label} ERROR`, p));
  client.on("connect_error", (e) =>
    console.error(`${label} connect_error`, e.message),
  );

  return client;
}

function createChaserClient(label) {
  const client = ioClient(SERVER, {
    transports: ["websocket"],
    reconnection: false,
  });
  clients.push(client);

  let roomId = null;
  let chasingPowerupId = null;
  let tickCount = 0;

  client.on("connect", () => {
    console.log(`${label} connected: ${client.id}`);
    client.emit(events.JOIN_QUEUE, { gameType: "color_wars" });
  });

  client.on(events.COLOR_WARS_GAME_STARTED, (payload) => {
    roomId = payload.roomId;
    console.log(
      `${label} (chaser) game started, floor ${payload.floorCols}x${payload.floorRows}`,
    );
  });

  client.on(events.COLOR_WARS_STATE, (payload) => {
    if (payload.roomId !== roomId) return;
    tickCount += 1;

    if (gameOverReceived) {
      postGameOverStateTicks += 1;
      return;
    }

    const me = payload.players[client.id];
    if (!me) return;

    const activePowerup = payload.powerups && payload.powerups[0];

    // Detect a pickup: we were chasing a specific powerup id, and it's now
    // gone from the list. Check this same tick's data for evidence of the
    // effect actually applying.
    if (
      chasingPowerupId &&
      (!activePowerup || activePowerup.id !== chasingPowerupId)
    ) {
      const changedThisTick = (payload.changedCells || []).length;
      const speedBoosted = me.speedMultiplier && me.speedMultiplier > 1;
      const sizeBoosted =
        me.rollerRadius && me.rollerRadius > BASE_ROLLER_RADIUS;
      const bombBurst = changedThisTick >= CHASE_BURST_CELLS_THRESHOLD;

      if (speedBoosted) {
        pickupConfirmed = true;
        console.log(
          `${label} CONFIRMED speed_boost pickup — speedMultiplier now ${me.speedMultiplier} (expected ~${SPEED_BOOST_MULTIPLIER})`,
        );
      } else if (sizeBoosted) {
        pickupConfirmed = true;
        console.log(
          `${label} CONFIRMED size_boost pickup — rollerRadius now ${me.rollerRadius} (expected ~${(BASE_ROLLER_RADIUS * SIZE_BOOST_MULTIPLIER).toFixed(2)})`,
        );
      } else if (bombBurst) {
        pickupConfirmed = true;
        console.log(
          `${label} CONFIRMED paint_bomb pickup — ${changedThisTick} cells changed in one tick`,
        );
      } else {
        console.log(
          `${label} powerup ${chasingPowerupId} disappeared without a detected effect on us (likely expired before we reached it, or opponent got it)`,
        );
      }

      chasingPowerupId = null;
    }

    // If there's a powerup and we're not already chasing it, start chasing:
    // recompute direction toward its current position every tick.
    if (activePowerup) {
      chasingPowerupId = activePowerup.id;

      const dx = activePowerup.x - me.x;
      const dy = activePowerup.y - me.y;
      const magnitude = Math.hypot(dx, dy) || 1;

      client.emit(events.SET_DIRECTION, {
        roomId,
        dx: dx / magnitude,
        dy: dy / magnitude,
      });
    }

    if (tickCount % 20 === 0) {
      console.log(
        `${label} tick ${tickCount}: me=(${me.x.toFixed(2)}, ${me.y.toFixed(2)})`,
        {
          chasing: chasingPowerupId,
          remainingMs: payload.remainingMs,
        },
      );
    }
  });

  client.on(events.COLOR_WARS_GAME_OVER, handleGameOver);
  client.on(events.OPPONENT_LEFT, (p) =>
    console.error(`${label} OPPONENT_LEFT`, p),
  );
  client.on(events.ERROR, (p) => console.error(`${label} ERROR`, p));
  client.on("connect_error", (e) =>
    console.error(`${label} connect_error`, e.message),
  );

  return client;
}

createIdleClient("ClientA");

setTimeout(() => {
  createChaserClient("ClientB");
}, 250);

safetyTimer = setTimeout(() => {
  finishTest("FAIL: safety timeout reached before the round finished");
}, SAFETY_TIMEOUT_MS);
