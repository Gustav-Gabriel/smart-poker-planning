import type { Player } from "./types";

export type SessionData = {
  roomCode: string;
  playerId: string;
  hostToken?: string;
  name: string;
  avatar: Player["avatar"];
};

const KEYS = {
  roomCode: "spp:roomCode",
  playerId: "spp:playerId",
  hostToken: "spp:hostToken",
  name: "spp:name",
  avatar: "spp:avatar",
} as const;

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export function saveSession(data: SessionData): void {
  const store = storage();
  if (!store) return;

  store.setItem(KEYS.roomCode, data.roomCode);
  store.setItem(KEYS.playerId, data.playerId);
  store.setItem(KEYS.name, data.name);
  store.setItem(KEYS.avatar, JSON.stringify(data.avatar));

  if (data.hostToken) {
    store.setItem(KEYS.hostToken, data.hostToken);
  } else {
    store.removeItem(KEYS.hostToken);
  }
}

export function loadSession(): SessionData | null {
  const store = storage();
  if (!store) return null;

  const roomCode = store.getItem(KEYS.roomCode);
  const playerId = store.getItem(KEYS.playerId);
  const name = store.getItem(KEYS.name);
  const avatarRaw = store.getItem(KEYS.avatar);

  if (!roomCode || !playerId || !name || !avatarRaw) {
    return null;
  }

  try {
    const avatar = JSON.parse(avatarRaw) as Player["avatar"];
    const hostToken = store.getItem(KEYS.hostToken) ?? undefined;
    return { roomCode, playerId, name, avatar, hostToken };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  const store = storage();
  if (!store) return;

  for (const key of Object.values(KEYS)) {
    store.removeItem(key);
  }
}
