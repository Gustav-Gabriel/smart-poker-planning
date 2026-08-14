import { describe, expect, it, beforeEach } from "vitest";
import {
  createRoom,
  joinRoom,
  castVote,
  revealVotes,
  resetVotes,
  rejoinRoom,
  getRoom,
  setStory,
  setRepos,
  _resetStoreForTests,
} from "./room-store";
import { toClientSnapshot } from "./room-snapshot";

beforeEach(() => _resetStoreForTests());

describe("room-store", () => {
  it("creates a room with host and hostToken", () => {
    const { room, hostToken, player } = createRoom({
      name: "Sprint 12",
      deck: "fibonacci",
      hostName: "Ana",
      hostAvatar: { type: "emoji", value: "🎯" },
      secrets: {
        aiProvider: "openai",
        aiApiKey: "sk-test",
        jiraSite: "https://acme.atlassian.net",
        jiraEmail: "ana@acme.com",
        jiraToken: "jira-token",
        gitToken: undefined,
      },
    });
    expect(room.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(hostToken).toHaveLength(64);
    expect(player.isHost).toBe(true);
    expect(getRoom(room.code)?.players.size).toBe(1);
  });

  it("joins, votes hidden until reveal, then resets", () => {
    const created = createRoom({
      name: "R",
      deck: "fibonacci",
      hostName: "Host",
      hostAvatar: { type: "emoji", value: "👑" },
      secrets: {
        aiProvider: "gemini",
        aiApiKey: "k",
        jiraSite: "https://x.atlassian.net",
        jiraEmail: "h@x.com",
        jiraToken: "t",
      },
    });
    const joined = joinRoom(created.room.code, {
      name: "Bob",
      avatar: { type: "emoji", value: "🐸" },
    });
    if ("error" in joined) throw new Error(joined.error);
    castVote(created.room.code, created.player.id, "5");
    castVote(created.room.code, joined.player.id, "8");

    const hidden = toClientSnapshot(getRoom(created.room.code)!, joined.player.id);
    expect(hidden.players.find((p) => p.id === created.player.id)?.vote).toBeNull();
    expect(hidden.players.find((p) => p.id === joined.player.id)?.vote).toBe("8");
    expect(hidden.revealed).toBe(false);

    const revealed = revealVotes(created.room.code, created.hostToken);
    expect(revealed.ok).toBe(true);
    const shown = toClientSnapshot(getRoom(created.room.code)!, joined.player.id);
    expect(shown.revealed).toBe(true);
    expect(shown.players.find((p) => p.id === created.player.id)?.vote).toBe("5");

    resetVotes(created.room.code, created.hostToken);
    expect(getRoom(created.room.code)!.revealed).toBe(false);
    expect(getRoom(created.room.code)!.players.get(created.player.id)!.vote).toBeNull();
  });

  it("clears story, repos and suggestions on new round", () => {
    const created = createRoom({
      name: "R",
      deck: "fibonacci",
      hostName: "Host",
      hostAvatar: { type: "emoji", value: "👑" },
      secrets: {
        aiProvider: "gemini",
        aiApiKey: "k",
        jiraSite: "https://x.atlassian.net",
        jiraEmail: "h@x.com",
        jiraToken: "t",
      },
    });
    setStory(created.room.code, created.hostToken, {
      jiraKey: "PROJ-1",
      jiraUrl: "https://x.atlassian.net/browse/PROJ-1",
      title: "Title",
      description: "Desc",
      labels: [],
    });
    setRepos(created.room.code, created.hostToken, [
      {
        provider: "local",
        url: "local://app",
        owner: "local",
        repo: "app",
        ref: "local",
        selectedPaths: ["src/a.ts"],
      },
    ]);
    const room = getRoom(created.room.code)!;
    room.suggestions.push({
      kind: "summary",
      createdAt: Date.now(),
      payload: {
        consensusNote: "ok",
        discussionPoints: [],
        suggestedScore: { value: "5", rationale: "x" },
      },
    });

    resetVotes(created.room.code, created.hostToken);
    const cleared = getRoom(created.room.code)!;
    expect(cleared.story).toBeNull();
    expect(cleared.repos).toEqual([]);
    expect(cleared.suggestions).toEqual([]);
  });

  it("clears repos and suggestions when importing a Jira story", () => {
    const created = createRoom({
      name: "R",
      deck: "fibonacci",
      hostName: "Host",
      hostAvatar: { type: "emoji", value: "👑" },
      secrets: {
        aiProvider: "gemini",
        aiApiKey: "k",
        jiraSite: "https://x.atlassian.net",
        jiraEmail: "h@x.com",
        jiraToken: "t",
      },
    });
    setRepos(created.room.code, created.hostToken, [
      {
        provider: "github",
        url: "https://github.com/a/b",
        owner: "a",
        repo: "b",
        ref: "main",
        selectedPaths: ["x.ts"],
      },
    ]);
    const room = getRoom(created.room.code)!;
    room.suggestions.push({
      kind: "deep",
      createdAt: Date.now(),
      payload: {
        consensusNote: "old",
        discussionPoints: [],
        suggestedScore: { value: "3", rationale: "old" },
      },
    });

    setStory(created.room.code, created.hostToken, {
      jiraKey: "PROJ-9",
      jiraUrl: "https://x.atlassian.net/browse/PROJ-9",
      title: "Nova",
      description: "",
      labels: ["api"],
    });

    const updated = getRoom(created.room.code)!;
    expect(updated.story?.jiraKey).toBe("PROJ-9");
    expect(updated.repos).toEqual([]);
    expect(updated.suggestions).toEqual([]);
  });

  it("rejects casting a vote after votes are revealed", () => {
    const created = createRoom({
      name: "R",
      deck: "fibonacci",
      hostName: "Host",
      hostAvatar: { type: "emoji", value: "👑" },
      secrets: {
        aiProvider: "openai",
        aiApiKey: "k",
        jiraSite: "https://x.atlassian.net",
        jiraEmail: "h@x.com",
        jiraToken: "t",
      },
    });
    castVote(created.room.code, created.player.id, "5");
    revealVotes(created.room.code, created.hostToken);

    const result = castVote(created.room.code, created.player.id, "8");
    expect(result).toEqual({ ok: false, error: "Votes already revealed" });
    expect(getRoom(created.room.code)!.players.get(created.player.id)!.vote).toBe(
      "5",
    );
  });

  it("rejoins by playerId and playerToken", () => {
    const created = createRoom({
      name: "R",
      deck: "tshirt",
      hostName: "Host",
      hostAvatar: { type: "emoji", value: "👑" },
      secrets: {
        aiProvider: "claude",
        aiApiKey: "k",
        jiraSite: "https://x.atlassian.net",
        jiraEmail: "h@x.com",
        jiraToken: "t",
      },
    });
    const again = rejoinRoom(
      created.room.code,
      created.player.id,
      created.playerToken,
    );
    expect(again.ok).toBe(true);
    if (!again.ok) throw new Error(again.error);
    expect(again.player.isHost).toBe(true);
  });

  it("rejects rejoin with a missing or wrong playerToken", () => {
    const created = createRoom({
      name: "R",
      deck: "tshirt",
      hostName: "Host",
      hostAvatar: { type: "emoji", value: "👑" },
      secrets: {
        aiProvider: "claude",
        aiApiKey: "k",
        jiraSite: "https://x.atlassian.net",
        jiraEmail: "h@x.com",
        jiraToken: "t",
      },
    });

    const wrongToken = rejoinRoom(created.room.code, created.player.id, "nope");
    expect(wrongToken).toEqual({ ok: false, error: "Invalid rejoin token" });

    const missingToken = rejoinRoom(created.room.code, created.player.id, "");
    expect(missingToken).toEqual({ ok: false, error: "Invalid rejoin token" });
  });
});

type RoomsGlobal = typeof globalThis & {
  __smartPokerPlanningRooms?: Map<string, unknown>;
};

describe("room-store globalThis singleton", () => {
  it("stores rooms on globalThis.__smartPokerPlanningRooms", () => {
    const { room } = createRoom({
      name: "Singleton",
      deck: "fibonacci",
      hostName: "Host",
      hostAvatar: { type: "emoji", value: "👑" },
      secrets: {
        aiProvider: "openai",
        aiApiKey: "k",
        jiraSite: "https://x.atlassian.net",
        jiraEmail: "h@x.com",
        jiraToken: "t",
      },
    });

    const g = globalThis as RoomsGlobal;
    expect(g.__smartPokerPlanningRooms).toBeInstanceOf(Map);
    expect(g.__smartPokerPlanningRooms?.get(room.code)).toBeDefined();
    expect(getRoom(room.code)).toBe(g.__smartPokerPlanningRooms?.get(room.code));
  });

  it("clears the same Map reference on _resetStoreForTests", () => {
    createRoom({
      name: "Reset",
      deck: "tshirt",
      hostName: "Host",
      hostAvatar: { type: "emoji", value: "👑" },
      secrets: {
        aiProvider: "openai",
        aiApiKey: "k",
        jiraSite: "https://x.atlassian.net",
        jiraEmail: "h@x.com",
        jiraToken: "t",
      },
    });

    const g = globalThis as RoomsGlobal;
    const before = g.__smartPokerPlanningRooms;
    expect(before?.size).toBeGreaterThan(0);

    _resetStoreForTests();

    expect(g.__smartPokerPlanningRooms).toBe(before);
    expect(g.__smartPokerPlanningRooms?.size).toBe(0);
    expect(getRoom(Array.from(before?.keys() ?? [])[0] ?? "NOPE")).toBeUndefined();
  });
});
