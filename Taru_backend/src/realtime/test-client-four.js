const ioClient = require("socket.io-client");
const events = require("./events");

const SERVER = process.env.TEST_SERVER || "http://localhost:5000";
const EXIT_TIMEOUT_MS = 10000;

const clients = [];

function closeClients() {
  for (const client of clients) {
    client.disconnect();
  }
  process.exit(0);
}

function createClient(label, winColumns) {
  const client = ioClient(SERVER, {
    transports: ["websocket"],
    reconnection: false,
  });

  let roomId = null;
  let winIndex = 0;

  clients.push(client);

  function maybeDrop(currentTurnSocketId) {
    if (currentTurnSocketId !== client.id || !roomId) return;

    let column;
    if (winColumns && winIndex < winColumns.length) {
      column = winColumns[winIndex];
      winIndex += 1;
      console.log(
        `${label} dropping in column ${column} (win attempt ${winIndex})`,
      );
    } else {
      column = 6; // harmless filler move, far from the winning row
      console.log(`${label} dropping in column ${column} (filler move)`);
    }

    client.emit(events.DROP_PIECE, { roomId, column });
  }

  client.on("connect", () => {
    console.log(`${label} connected: ${client.id}`);
    client.emit(events.JOIN_QUEUE, { gameType: "four_in_a_row" });
  });

  client.on(events.MATCH_FOUND, (payload) => {
    console.log(`${label} MATCH_FOUND`, payload);
  });

  client.on(events.FOUR_GAME_STARTED, (payload) => {
    console.log(
      `${label} FOUR_GAME_STARTED currentTurn=${payload.currentTurnSocketId}`,
    );
    roomId = payload.roomId;
    maybeDrop(payload.currentTurnSocketId);
  });

  client.on(events.PIECE_DROPPED, (payload) => {
    console.log(`${label} PIECE_DROPPED`, payload);
  });

  client.on(events.ROOM_STATE, (payload) => {
    console.log(
      `${label} ROOM_STATE currentTurn=${payload.currentTurnSocketId}`,
    );
    maybeDrop(payload.currentTurnSocketId);
  });

  client.on(events.FOUR_GAME_OVER, (payload) => {
    console.log(`${label} FOUR_GAME_OVER`, payload);
    closeClients();
  });

  client.on(events.ERROR, (payload) => {
    console.log(`${label} ERROR`, payload);
  });

  client.on("connect_error", (error) => {
    console.error(`${label} connect_error: ${error.message}`);
  });
}

// ClientA will try to win with columns 0,1,2,3 (horizontal, row 0).
// ClientB just plays filler moves in column 6 every turn.
createClient("ClientA", [0, 1, 2, 3]);

setTimeout(() => {
  createClient("ClientB", null);
}, 250);

setTimeout(() => {
  console.log("Test timeout reached; closing clients.");
  closeClients();
}, EXIT_TIMEOUT_MS);
