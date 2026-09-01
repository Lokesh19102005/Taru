const { io } = require("socket.io-client");
const events = require("./events");

const TIMEOUT_MS = 30000;

function makeClient(label, fleet, shots) {
  const client = io("http://localhost:5000", {
    transports: ["websocket"],
    reconnection: false,
  });

  client.on("connect", () => {
    console.log(label, "connected");
    client.emit(events.JOIN_QUEUE, { gameType: "sea_battle" });
  });

  client.on(events.MATCH_FOUND, (payload) => {
    console.log(label, "MATCH_FOUND:", payload);
  });

  client.on(events.FLEET_PLACED, (payload) => {
    console.log(label, "FLEET_PLACED:", payload);
  });

  client.on(events.OPPONENT_READY, (payload) => {
    console.log(label, "OPPONENT_READY:", payload);
  });

  client.on("connect_error", (err) => {
    console.log(label, "connect_error:", err.message);
  });

  client.on(events.SEA_BATTLE_GAME_STARTED, (payload) => {
    console.log(label, "SEA_BATTLE_GAME_STARTED:", payload);

    client.emit(events.PLACE_FLEET, {
      roomId: payload.roomId,
      ships: fleet,
    });
  });

  client.on(events.BATTLE_STARTED, (payload) => {
    console.log(label, "BATTLE_STARTED:", payload);

    let index = 0;
    const fireNext = () => {
      if (index >= shots.length) {
        console.log(label, "no more scripted shots");
        return;
      }

      const shot = shots[index];
      index += 1;
      client.emit(events.FIRE_SHOT, {
        roomId: payload.roomId,
        row: shot.row,
        col: shot.col,
      });
    };

    client.on(events.SHOT_RESULT, (shotPayload) => {
      console.log(label, "SHOT_RESULT:", shotPayload);
      if (shotPayload.currentTurnSocketId === client.id) {
        fireNext();
      }
    });

    client.on(events.SEA_BATTLE_GAME_OVER, (gameOver) => {
      console.log(label, "SEA_BATTLE_GAME_OVER:", gameOver);
      setTimeout(() => client.disconnect(), 500);
    });

    if (payload.currentTurnSocketId === client.id) {
      fireNext();
    }
  });

  client.on(events.ERROR, (payload) => {
    console.log(label, "ERROR:", payload);
  });

  client.on(events.OPPONENT_LEFT, (payload) => {
    console.log(label, "OPPONENT_LEFT:", payload);
  });

  client.on("disconnect", () => {
    console.log(label, "disconnected");
  });

  setTimeout(() => {
    console.log(label, "timeout reached, forcing disconnect");
    client.disconnect();
  }, TIMEOUT_MS);

  return client;
}

const fleetA = [
  {
    cells: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
      { row: 0, col: 4 },
    ],
  },
  {
    cells: [
      { row: 2, col: 2 },
      { row: 3, col: 2 },
      { row: 4, col: 2 },
      { row: 5, col: 2 },
    ],
  },
  {
    cells: [
      { row: 7, col: 0 },
      { row: 7, col: 1 },
      { row: 7, col: 2 },
    ],
  },
  {
    cells: [
      { row: 9, col: 5 },
      { row: 9, col: 6 },
      { row: 9, col: 7 },
    ],
  },
  {
    cells: [
      { row: 5, col: 8 },
      { row: 6, col: 8 },
    ],
  },
];

// Same shapes, shifted down by 1 row, so Client A's scripted shots
// (still aimed at fleetA's original coordinates) will produce a
// mix of hits and genuine misses against this fleet.
const fleetB = [
  {
    cells: [
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 1, col: 3 },
      { row: 1, col: 4 },
    ],
  },
  {
    cells: [
      { row: 3, col: 2 },
      { row: 4, col: 2 },
      { row: 5, col: 2 },
      { row: 6, col: 2 },
    ],
  },
  {
    cells: [
      { row: 8, col: 0 },
      { row: 8, col: 1 },
      { row: 8, col: 2 },
    ],
  },
  {
    cells: [
      { row: 9, col: 5 },
      { row: 9, col: 6 },
      { row: 9, col: 7 },
    ],
  },
  {
    cells: [
      { row: 6, col: 8 },
      { row: 7, col: 8 },
    ],
  },
];

// Client A attacks B's board, so A's real hits must match fleetB's cells.
const shotsForA = [
  { row: 9, col: 9 }, // guaranteed miss on both fleets — proves miss passes turn
  { row: 1, col: 0 },
  { row: 1, col: 1 },
  { row: 1, col: 2 },
  { row: 1, col: 3 },
  { row: 1, col: 4 },
  { row: 3, col: 2 },
  { row: 4, col: 2 },
  { row: 5, col: 2 },
  { row: 6, col: 2 },
  { row: 8, col: 0 },
  { row: 8, col: 1 },
  { row: 8, col: 2 },
  { row: 9, col: 5 },
  { row: 9, col: 6 },
  { row: 9, col: 7 },
  { row: 6, col: 8 },
  { row: 7, col: 8 },
];

// Client B attacks A's board, so B's real hits must match fleetA's cells.
const shotsForB = [
  { row: 9, col: 9 }, // guaranteed miss on both fleets
  { row: 0, col: 0 },
  { row: 0, col: 1 },
  { row: 0, col: 2 },
  { row: 0, col: 3 },
  { row: 0, col: 4 },
  { row: 2, col: 2 },
  { row: 3, col: 2 },
  { row: 4, col: 2 },
  { row: 5, col: 2 },
  { row: 7, col: 0 },
  { row: 7, col: 1 },
  { row: 7, col: 2 },
  { row: 9, col: 5 },
  { row: 9, col: 6 },
  { row: 9, col: 7 },
  { row: 5, col: 8 },
  { row: 6, col: 8 },
];

const clientA = makeClient("CLIENT_A", fleetA, shotsForA);
const clientB = makeClient("CLIENT_B", fleetB, shotsForB);
