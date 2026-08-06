import { getRoom } from "./room-store";

export function assertHost(roomCode: string, hostToken: string): boolean {
  const room = getRoom(roomCode);
  return Boolean(room && room.secrets.hostToken === hostToken);
}
