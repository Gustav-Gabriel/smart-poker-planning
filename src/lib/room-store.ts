import { randomBytes } from "node:crypto";
import { customAlphabet } from "nanoid";
import type {
  DeckType,
  Player,
  RepoAttachment,
  RoomSecrets,
  RoomState,
  Story,
} from "./types";

const ROOM_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const generateRoomCode = customAlphabet(ROOM_CODE_ALPHABET, 6);
const generatePlayerId = customAlphabet(
  "abcdefghijklmnopqrstuvwxyz0123456789",
  12,
);

const MAX_PLAYERS = 20;
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

type StoredRoom = RoomState & { secrets: RoomSecrets };

const rooms = new Map<string, StoredRoom>();

export function _resetStoreForTests(): void {
  rooms.clear();
}

export function getRoom(code: string): StoredRoom | undefined {
  return rooms.get(code.toUpperCase());
}

export function assertHost(room: StoredRoom, hostToken: string): boolean {
  return room.secrets.hostToken === hostToken;
}

function touchRoom(room: StoredRoom): void {
  room.lastActivityAt = Date.now();
}

export function purgeExpired(now: number = Date.now()): void {
  for (const [code, room] of rooms) {
    if (now - room.lastActivityAt > ROOM_TTL_MS) {
      rooms.delete(code);
    }
  }
}

type CreateRoomSecretsInput = Omit<RoomSecrets, "hostToken">;

export type CreateRoomInput = {
  name: string;
  deck: DeckType;
  hostName: string;
  hostAvatar: Player["avatar"];
  secrets: CreateRoomSecretsInput;
};

export function createRoom(input: CreateRoomInput): {
  room: StoredRoom;
  hostToken: string;
  player: Player;
} {
  purgeExpired();

  let code: string;
  do {
    code = generateRoomCode();
  } while (rooms.has(code));

  const hostToken = randomBytes(32).toString("hex");
  const playerId = generatePlayerId();
  const now = Date.now();

  const player: Player = {
    id: playerId,
    name: input.hostName,
    avatar: input.hostAvatar,
    isHost: true,
    connected: true,
    vote: null,
  };

  const room: StoredRoom = {
    code,
    name: input.name,
    deck: input.deck,
    hostId: playerId,
    players: new Map([[playerId, player]]),
    story: null,
    repos: [],
    revealed: false,
    suggestions: [],
    lastActivityAt: now,
    secrets: {
      hostToken,
      ...input.secrets,
    },
  };

  rooms.set(code, room);

  return { room, hostToken, player };
}

export type JoinRoomInput = {
  name: string;
  avatar: Player["avatar"];
};

export function joinRoom(
  code: string,
  input: JoinRoomInput,
): { room: StoredRoom; player: Player } | { error: string } {
  purgeExpired();

  const room = getRoom(code);
  if (!room) {
    return { error: "Room not found" };
  }

  if (room.players.size >= MAX_PLAYERS) {
    return { error: "Room is full" };
  }

  const playerId = generatePlayerId();
  const player: Player = {
    id: playerId,
    name: input.name,
    avatar: input.avatar,
    isHost: false,
    connected: true,
    vote: null,
  };

  room.players.set(playerId, player);
  touchRoom(room);

  return { room, player };
}

export function rejoinRoom(
  code: string,
  playerId: string,
): { ok: true; room: StoredRoom; player: Player } | { ok: false; error: string } {
  purgeExpired();

  const room = getRoom(code);
  if (!room) {
    return { ok: false, error: "Room not found" };
  }

  const player = room.players.get(playerId);
  if (!player) {
    return { ok: false, error: "Player not found" };
  }

  player.connected = true;
  touchRoom(room);

  return { ok: true, room, player };
}

export function castVote(
  code: string,
  playerId: string,
  value: string,
): { ok: true } | { ok: false; error: string } {
  const room = getRoom(code);
  if (!room) {
    return { ok: false, error: "Room not found" };
  }

  const player = room.players.get(playerId);
  if (!player) {
    return { ok: false, error: "Player not found" };
  }

  player.vote = value;
  touchRoom(room);

  return { ok: true };
}

export function revealVotes(
  code: string,
  hostToken: string,
): { ok: true } | { ok: false; error: string } {
  const room = getRoom(code);
  if (!room) {
    return { ok: false, error: "Room not found" };
  }

  if (!assertHost(room, hostToken)) {
    return { ok: false, error: "Unauthorized" };
  }

  room.revealed = true;
  touchRoom(room);

  return { ok: true };
}

export function resetVotes(
  code: string,
  hostToken: string,
): { ok: true } | { ok: false; error: string } {
  const room = getRoom(code);
  if (!room) {
    return { ok: false, error: "Room not found" };
  }

  if (!assertHost(room, hostToken)) {
    return { ok: false, error: "Unauthorized" };
  }

  room.revealed = false;
  for (const player of room.players.values()) {
    player.vote = null;
  }
  touchRoom(room);

  return { ok: true };
}

export function setStory(
  code: string,
  hostToken: string,
  story: Story | null,
): { ok: true } | { ok: false; error: string } {
  const room = getRoom(code);
  if (!room) {
    return { ok: false, error: "Room not found" };
  }

  if (!assertHost(room, hostToken)) {
    return { ok: false, error: "Unauthorized" };
  }

  room.story = story;
  touchRoom(room);

  return { ok: true };
}

export function setRepos(
  code: string,
  hostToken: string,
  repos: RepoAttachment[],
): { ok: true } | { ok: false; error: string } {
  const room = getRoom(code);
  if (!room) {
    return { ok: false, error: "Room not found" };
  }

  if (!assertHost(room, hostToken)) {
    return { ok: false, error: "Unauthorized" };
  }

  room.repos = repos;
  touchRoom(room);

  return { ok: true };
}
