import { describe, expect, it, beforeEach } from "vitest";
import {
  createRoom,
  joinRoom,
  castVote,
  revealVotes,
  resetVotes,
  rejoinRoom,
  getRoom,
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
        githubToken: undefined,
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

  it("rejoins by playerId", () => {
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
    const again = rejoinRoom(created.room.code, created.player.id);
    expect(again.ok).toBe(true);
    if (!again.ok) throw new Error(again.error);
    expect(again.player.isHost).toBe(true);
  });
});
