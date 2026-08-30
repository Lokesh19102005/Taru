const ioClient = require("socket.io-client");
const events = require("./events");

const SERVER = process.env.TEST_SERVER || "http://localhost:5000";
const MAX_RUNTIME_MS = 60000;
const PRECISE_AIM_DEGREES = 3;

const clients = [];
const tickCounts = new Map();
const clientSides = new Map();

let roomId = null;
let gameOverReceived = false;
let postGameStateTicks = 0;
let testFinished = false;
let notFacingPoolCount = 0;
let notFacingPoolLogged = false;
let finishTimer = null;
let safetyTimer = null;

function finishTest(message) {
  if (testFinished) return;

  testFinished = true;

  if (finishTimer) {
    clearTimeout(finishTimer);
  }

  if (safetyTimer) {
    clearTimeout(safetyTimer);
  }

  console.log(message);
  console.log(
    `Suppressed "Duck is not facing the pool" errors: ${notFacingPoolCount}`,
  );

  for (const client of clients) {
    client.disconnect();
  }

  setTimeout(() => {
    process.exit(message.startsWith("PASS") ? 0 : 1);
  }, 100);
}

function isPreciselyAimed(angle) {
  const normalizedAngle = ((angle + 180) % 360) - 180;
  return Math.abs(normalizedAngle) <= PRECISE_AIM_DEGREES;
}

function identifyClientSide(client, payload) {
  if (payload.topPlayerSocketId === client.id) {
    clientSides.set(client.id, "top");
    return "top";
  }

  if (payload.bottomPlayerSocketId === client.id) {
    clientSides.set(client.id, "bottom");
    return "bottom";
  }

  return null;
}

function tryPreciseFire(client, payload) {
  if (!payload || !payload.roomId) return;

  const side =
    clientSides.get(client.id) || identifyClientSide(client, payload);

  if (!side) return;

  const duck = payload.ducks && payload.ducks[side];

  if (!duck || !isPreciselyAimed(duck.angle)) {
    return;
  }

  client.emit(events.FIRE_PROJECTILE, {
    roomId: payload.roomId,
  });
}

function handleGameOver(payload) {
  if (gameOverReceived) return;

  gameOverReceived = true;

  console.log("BEACH_BALLS_GAME_OVER:", payload);

  finishTimer = setTimeout(() => {
    if (postGameStateTicks === 0) {
      finishTest(
        "PASS: no further state ticks after game over - loop stopped correctly",
      );
    } else {
      finishTest(
        `FAIL: received ${postGameStateTicks} state ticks after game over - the interval was not cleared`,
      );
    }
  }, 2000);
}

function createClient(label, canFire) {
  const client = ioClient(SERVER, {
    transports: ["websocket"],
    reconnection: false,
  });

  clients.push(client);
  tickCounts.set(label, 0);

  client.on("connect", () => {
    console.log(`${label} connected: ${client.id}`);

    client.emit(events.JOIN_QUEUE, {
      gameType: "beach_balls",
    });
  });

  client.on(events.MATCH_FOUND, (payload) => {
    console.log(`${label} MATCH_FOUND:`, payload);
    roomId = payload.roomId;
  });

  client.on(events.BEACH_BALLS_GAME_STARTED, (payload) => {
    console.log(`${label} BEACH_BALLS_GAME_STARTED:`, {
      roomId: payload.roomId,
      topPlayerSocketId: payload.topPlayerSocketId,
      bottomPlayerSocketId: payload.bottomPlayerSocketId,
      scores: payload.scores,
      ball: payload.ball,
      ducks: payload.ducks,
    });

    roomId = payload.roomId;
    identifyClientSide(client, payload);

    // The initial duck angle is exactly 0 degrees, so this is a precise shot.
    if (canFire) {
      tryPreciseFire(client, payload);
    }
  });

  client.on(events.BEACH_BALLS_STATE, (payload) => {
    const currentTicks = (tickCounts.get(label) || 0) + 1;
    tickCounts.set(label, currentTicks);

    if (gameOverReceived) {
      postGameStateTicks += 1;
      return;
    }

    roomId = payload.roomId || roomId;
    identifyClientSide(client, payload);

    if (currentTicks % 10 === 0) {
      console.log(`${label} BEACH_BALLS_STATE tick ${currentTicks}:`, {
        ball: payload.ball,
        projectiles: payload.projectiles.length,
        scores: payload.scores,
        ducks: payload.ducks,
        pausedUntil: payload.pausedUntil,
      });
    }

    // Fire only when this client's own duck is within +/-3 degrees of center.
    if (canFire) {
      tryPreciseFire(client, payload);
    }
  });

  client.on(events.BEACH_BALLS_GOAL, (payload) => {
    console.log(`${label} BEACH_BALLS_GOAL:`, payload);
  });

  client.on(events.BEACH_BALLS_GAME_OVER, handleGameOver);

  client.on(events.ERROR, (payload) => {
    const message = payload && payload.message;

    if (message === "Duck is not facing the pool") {
      notFacingPoolCount += 1;

      if (!notFacingPoolLogged) {
        notFacingPoolLogged = true;
        console.log(`${label} expected error: Duck is not facing the pool`);
      }

      return;
    }

    console.error(`${label} UNEXPECTED ERROR:`, payload);
  });

  client.on(events.OPPONENT_LEFT, (payload) => {
    console.error(`${label} OPPONENT_LEFT:`, payload);
    finishTest("FAIL: opponent disconnected before the game ended");
  });

  client.on("connect_error", (error) => {
    console.error(`${label} connect_error: ${error.message}`);
  });

  client.on("disconnect", (reason) => {
    console.log(`${label} disconnected: ${reason}`);
  });
}

createClient("ClientA", true);

setTimeout(() => {
  createClient("ClientB", true);
}, 250);

safetyTimer = setTimeout(() => {
  finishTest(
    "Test ended without a goal occurring - try running again or check firing logic",
  );
}, MAX_RUNTIME_MS);
