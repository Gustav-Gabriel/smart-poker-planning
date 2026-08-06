import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Server } from "socket.io";
import { io as createClient, type Socket as ClientSocket } from "socket.io-client";
import { assertHost } from "../host-auth";
import { _resetStoreForTests, createRoom, getRoom } from "../room-store";
import { registerSocketHandlers } from "./handlers";

type Ack = Record<string, unknown>;

let httpServer: HttpServer | undefined;
let io: Server | undefined;
let clients: ClientSocket[] = [];

function stubCreateEnv() {
  vi.stubEnv("OPENAI_API_KEY", "sk-test");
  vi.stubEnv("JIRA_SITE", "https://acme.atlassian.net");
  vi.stubEnv("JIRA_EMAIL", "ana@acme.com");
  vi.stubEnv("JIRA_TOKEN", "jira-token");
}

beforeEach(() => {
  _resetStoreForTests();
  stubCreateEnv();
});

afterEach(async () => {
  vi.unstubAllEnvs();
  for (const client of clients) client.disconnect();
  clients = [];
  await io?.close();
  io = undefined;
  httpServer = undefined;
});

async function startHarness(): Promise<ClientSocket> {
  httpServer = createServer();
  io = new Server(httpServer);
  registerSocketHandlers(io);
  await new Promise<void>((resolve) => httpServer!.listen(0, resolve));

  const port = (httpServer.address() as AddressInfo).port;
  const client = createClient(`http://127.0.0.1:${port}`, {
    transports: ["websocket"],
  });
  clients.push(client);
  await once(client, "connect");
  return client;
}

async function addClient(): Promise<ClientSocket> {
  const address = httpServer?.address() as AddressInfo;
  const client = createClient(`http://127.0.0.1:${address.port}`, {
    transports: ["websocket"],
  });
  clients.push(client);
  await once(client, "connect");
  return client;
}

function once<T = unknown>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve));
}

function onceWhere<T>(
  socket: ClientSocket,
  event: string,
  predicate: (value: T) => boolean,
): Promise<T> {
  return new Promise((resolve) => {
    const listener = (value: T) => {
      if (!predicate(value)) return;
      socket.off(event, listener);
      resolve(value);
    };
    socket.on(event, listener);
  });
}

function emitAck(
  socket: ClientSocket,
  event: string,
  payload?: unknown,
): Promise<Ack> {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

/** Full secrets for direct createRoom() in unit tests. */
const roomStoreInput = {
  name: "Sprint 12",
  deck: "fibonacci" as const,
  hostName: "Ana",
  hostAvatar: { type: "emoji" as const, value: "🎯" },
  secrets: {
    aiProvider: "openai" as const,
    aiApiKey: "sk-test",
    jiraSite: "https://acme.atlassian.net",
    jiraEmail: "ana@acme.com",
    jiraToken: "jira-token",
  },
};

/** Public create payload — secrets come from env on the server. */
const roomCreatePayload = {
  name: "Sprint 12",
  deck: "fibonacci" as const,
  hostName: "Ana",
  hostAvatar: { type: "emoji" as const, value: "🎯" },
  secrets: {
    aiProvider: "openai" as const,
  },
};

describe("assertHost", () => {
  it("authenticates only the room host token", () => {
    const created = createRoom(roomStoreInput);

    expect(assertHost(created.room.code, created.hostToken)).toBe(true);
    expect(assertHost(created.room.code, "wrong-token")).toBe(false);
    expect(assertHost("MISSING", created.hostToken)).toBe(false);
  });
});

describe("registerSocketHandlers", () => {
  it("creates, joins, and broadcasts hidden votes per viewer", async () => {
    const host = await startHarness();
    const created = await emitAck(host, "room:create", roomCreatePayload);
    const room = created.room as { code: string };
    const hostPlayer = created.player as { id: string };

    const guest = await addClient();
    const joined = await emitAck(guest, "room:join", {
      roomCode: room.code,
      name: "Bob",
      avatar: { type: "emoji", value: "🐸" },
    });
    const guestPlayer = joined.player as { id: string };

    await emitAck(host, "vote:cast", { value: "5" });
    type RoomState = {
      players: Array<{ id: string; vote: string | null; hasVoted: boolean }>;
    };
    const hasGuestVote = (state: RoomState) =>
      state.players.find((player) => player.id === guestPlayer.id)?.hasVoted ===
      true;
    const hostStatePromise = onceWhere(host, "room:state", hasGuestVote);
    const guestStatePromise = onceWhere(guest, "room:state", hasGuestVote);
    await emitAck(guest, "vote:cast", { value: "8" });

    const [hostState, guestState] = await Promise.all([
      hostStatePromise,
      guestStatePromise,
    ]);
    expect(hostState.players.find((p) => p.id === hostPlayer.id)?.vote).toBe("5");
    expect(hostState.players.find((p) => p.id === guestPlayer.id)).toMatchObject({
      vote: null,
      hasVoted: true,
    });
    expect(guestState.players.find((p) => p.id === guestPlayer.id)?.vote).toBe(
      "8",
    );
    expect(guestState.players.find((p) => p.id === hostPlayer.id)?.vote).toBeNull();
  });

  it("authorizes host actions and emits pending AI state after reveal", async () => {
    const host = await startHarness();
    const created = await emitAck(host, "room:create", roomCreatePayload);
    const room = created.room as { code: string };
    const hostToken = created.hostToken as string;

    expect(
      await emitAck(host, "vote:reveal", {
        roomCode: room.code,
        hostToken: "wrong",
      }),
    ).toMatchObject({ ok: false, error: "Unauthorized" });

    const pending = once(host, "ai:summary");
    expect(
      await emitAck(host, "vote:reveal", { roomCode: room.code, hostToken }),
    ).toEqual({ ok: true });
    await expect(pending).resolves.toEqual({ status: "pending" });
    expect(getRoom(room.code)?.revealed).toBe(true);
  });

  it("updates players and tracks leave and disconnect presence", async () => {
    const host = await startHarness();
    const created = await emitAck(host, "room:create", roomCreatePayload);
    const room = created.room as { code: string };

    const guest = await addClient();
    const joined = await emitAck(guest, "room:join", {
      roomCode: room.code,
      name: "Bob",
      avatar: { type: "emoji", value: "🐸" },
    });
    const guestPlayer = joined.player as { id: string };
    const guestPlayerToken = joined.playerToken as string;
    expect(guestPlayerToken).toBeTruthy();

    expect(
      await emitAck(guest, "player:update", {
        name: "Bia",
        avatar: { type: "emoji", value: "🚀" },
      }),
    ).toEqual({ ok: true });
    expect(getRoom(room.code)?.players.get(guestPlayer.id)).toMatchObject({
      name: "Bia",
      avatar: { type: "emoji", value: "🚀" },
    });

    guest.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(getRoom(room.code)?.players.get(guestPlayer.id)?.connected).toBe(false);

    const rejoined = await addClient();
    expect(
      await emitAck(rejoined, "room:join", {
        roomCode: room.code,
        playerId: guestPlayer.id,
        playerToken: "wrong-token",
      }),
    ).toMatchObject({ ok: false, error: "Invalid rejoin token" });

    expect(
      await emitAck(rejoined, "room:join", {
        roomCode: room.code,
        playerId: guestPlayer.id,
        playerToken: guestPlayerToken,
      }),
    ).toHaveProperty("room");
    expect(getRoom(room.code)?.players.get(guestPlayer.id)?.connected).toBe(true);

    expect(await emitAck(rejoined, "room:leave", {})).toEqual({ ok: true });
    expect(getRoom(room.code)?.players.has(guestPlayer.id)).toBe(false);
  });

  it("rejects create when AI or Jira env secrets are missing", async () => {
    vi.unstubAllEnvs();
    const host = await startHarness();
    expect(await emitAck(host, "room:create", roomCreatePayload)).toEqual({
      ok: false,
      error: "AI API key is not configured",
    });

    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    expect(await emitAck(host, "room:create", roomCreatePayload)).toEqual({
      ok: false,
      error: "Jira credentials are not configured",
    });
  });

  it("ignores client-supplied AI and Jira secrets on create", async () => {
    const host = await startHarness();
    const created = await emitAck(host, "room:create", {
      ...roomCreatePayload,
      secrets: {
        aiProvider: "openai",
        aiApiKey: "client-key",
        jiraSite: "https://evil.example",
        jiraEmail: "evil@example.com",
        jiraToken: "evil-token",
      },
    });
    expect(created).toHaveProperty("room");
    const room = getRoom((created.room as { code: string }).code);
    expect(room?.secrets.aiApiKey).toBe("sk-test");
    expect(room?.secrets.jiraSite).toBe("https://acme.atlassian.net");
    expect(room?.secrets.jiraEmail).toBe("ana@acme.com");
    expect(room?.secrets.jiraToken).toBe("jira-token");
  });
});
