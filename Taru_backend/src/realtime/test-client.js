// Usage: node src/realtime/test-client.js
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
    s.disconnect();
  });

  s.on(events.ROOM_STATE, (payload) => {
    console.log(`${name} ROOM_STATE`, payload);
  });

  s.on(events.OPPONENT_LEFT, (payload) => {
    console.log(`${name} OPPONENT_LEFT`, payload);
  });

  s.on(events.ERROR, (err) => {
    console.log(`${name} ERROR`, err);
  });

  s.on("connect_error", (err) => {
    console.log(`${name} connect_error`, err.message);
  });
  return s;
}

// Create two clients that will join queue and log MATCH_FOUND
makeClient("ClientA");
setTimeout(() => makeClient("ClientB"), 200);
