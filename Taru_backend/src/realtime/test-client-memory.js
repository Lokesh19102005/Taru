// Taru_backend/src/realtime/test-client-memory.js
const ioClient = require("socket.io-client");
const events = require("./events");

const SERVER = process.env.TEST_SERVER || "http://localhost:5000";

function makeClient(name) {
  const s = ioClient(SERVER, {
    reconnectionDelay: 100,
    transports: ["websocket"],
  });

  s.on("connect", () => {
    console.log(`${name} connected -> id=${s.id}`);
    s.emit(events.JOIN_QUEUE, { gameType: "memory" });
  });

  s.on(events.MATCH_FOUND, (payload) => {
    console.log(`${name} MATCH_FOUND`, payload);
  });

  s.on(events.GAME_STARTED, (payload) => {
    console.log(`${name} GAME_STARTED`, payload);
    // If it's our turn, flip card 0 then card 1 with a small gap
    if (payload.currentTurnSocketId === s.id) {
      console.log(`${name} is starting player — flipping 0 then 1`);
      s.emit(events.FLIP_CARD, { roomId: payload.roomId, cardId: 0 });
      setTimeout(() => {
        s.emit(events.FLIP_CARD, { roomId: payload.roomId, cardId: 2 });
      }, 200);
    } else {
      console.log(`${name} is waiting for opponent to play`);
    }
  });

  s.on(events.CARD_FLIPPED, (p) => console.log(`${name} CARD_FLIPPED`, p));
  s.on(events.TURN_RESULT, (p) => {
    console.log(`${name} TURN_RESULT`, p);
  });
  s.on(events.ROOM_STATE, (p) => console.log(`${name} ROOM_STATE`, p));
  s.on(events.GAME_OVER, (p) => console.log(`${name} GAME_OVER`, p));
  s.on(events.ERROR, (e) => console.log(`${name} ERROR`, e));
  s.on("connect_error", (err) =>
    console.log(`${name} connect_error`, err.message),
  );

  return s;
}

makeClient("ClientA");
setTimeout(() => makeClient("ClientB"), 200);

setTimeout(() => {
  console.log("Test timeout — exiting");
  process.exit(0);
}, 5000);
