import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

export const socket = io(API_URL, {
  autoConnect: false,
  transports: ["websocket"],
});

export function connectSocket() {
  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect();
  }
}
