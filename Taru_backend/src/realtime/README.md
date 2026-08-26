Realtime / Matchmaking module

What this module provides

- Anonymous, queue-based matchmaking per gameType.
- In-memory room store (rooms.js) and FIFO queues (matchmaking.js).
- Socket.IO server initialization (index.js) which wires `join_queue`, `leave_queue`, and `disconnect`.

How a game plugs in

- Each game implementation (e.g. `games/memory.js`) will be responsible for:
  - Creating and maintaining per-room gameState (cards, turns, scores).
  - Validating client events (e.g. flips) and emitting game-specific events.
  - Attaching event handlers after the socket connects (see index.js placeholder).
- API: game module should export an `attach(io)` or `attachToRoom(io, room)` function and register per-socket handlers.

Cleanup and TODOs

- Rooms are marked `finished` when a player disconnects; automatic deletion/TTL cleanup is TODO.
- This storage is in-memory. For horizontal scaling replace `rooms.js` with a Redis-backed implementation and add the Socket.IO Redis adapter.
