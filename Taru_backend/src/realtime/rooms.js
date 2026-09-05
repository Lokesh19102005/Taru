const { generateRoomId } = require("./utils");

/*
Room shape:
{
  id: string,
  gameType: string,
  players: [socketId1, socketId2],
  status: 'waiting' | 'active' | 'finished',
  gameState: object | null,
  createdAt: number
}
*/

const rooms = new Map();

function createRoom(gameType) {
  const id = generateRoomId();
  const room = {
    id,
    gameType,
    players: [],
    status: "waiting",
    gameState: null,
    createdAt: Date.now(),
  };
  rooms.set(id, room);
  return room;
}

function getRoomById(id) {
  return rooms.get(id) || null;
}

function addPlayer(roomId, socketId) {
  const room = getRoomById(roomId);
  if (!room) return null;
  if (!room.players.includes(socketId)) room.players.push(socketId);
  if (room.players.length === 2) room.status = "active";
  return room;
}

function removePlayer(roomId, socketId) {
  const room = getRoomById(roomId);
  if (!room) return null;
  room.players = room.players.filter((id) => id !== socketId);
  if (room.players.length === 0) {
    // leave status to caller (cleanup may delete)
    room.status = "finished";
  } else {
    room.status = "finished";
  }
  return room;
}

function deleteRoom(roomId) {
  return rooms.delete(roomId);
}

function findRoomBySocket(socketId) {
  for (const room of rooms.values()) {
    if (room.status !== "finished" && room.players.includes(socketId)) {
      return room;
    }
  }
  return null;
}

function listRooms() {
  return Array.from(rooms.values());
}

module.exports = {
  createRoom,
  getRoomById,
  addPlayer,
  removePlayer,
  deleteRoom,
  findRoomBySocket,
  listRooms,
};
