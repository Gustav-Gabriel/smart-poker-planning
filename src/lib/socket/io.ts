import type { Server } from "socket.io";

let io: Server | undefined;

export function setIO(server: Server): void {
  io = server;
}

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.io server has not been initialized");
  }
  return io;
}
