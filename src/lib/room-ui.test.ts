import { describe, expect, it } from "vitest";
import {
  computeVoteStats,
  latestSuggestion,
  mergeSuggestions,
  normalizeRoomCode,
  translateError,
} from "./room-ui";
import type { AiSuggestion, ClientPlayer } from "./types";

function player(overrides: Partial<ClientPlayer> = {}): ClientPlayer {
  return {
    id: "p1",
    name: "Ana",
    avatar: { type: "emoji", value: "🃏" },
    isHost: false,
    connected: true,
    hasVoted: true,
    vote: "5",
    ...overrides,
  };
}

describe("normalizeRoomCode", () => {
  it("trims, uppercases, and strips whitespace", () => {
    expect(normalizeRoomCode("  a1 b2c3  ")).toBe("A1B2C3");
  });
});

describe("computeVoteStats", () => {
  it("returns zero state when nobody has voted", () => {
    expect(
      computeVoteStats([player({ vote: null, hasVoted: false })]),
    ).toEqual({
      votesCast: 0,
      average: null,
      mode: null,
    });
  });

  it("computes numeric average and mode", () => {
    const stats = computeVoteStats([
      player({ id: "a", vote: "5" }),
      player({ id: "b", vote: "5" }),
      player({ id: "c", vote: "8" }),
    ]);
    expect(stats).toEqual({ votesCast: 3, average: 6, mode: "5" });
  });

  it("ignores non-numeric votes for the average but keeps the mode", () => {
    const stats = computeVoteStats([
      player({ id: "a", vote: "?" }),
      player({ id: "b", vote: "?" }),
      player({ id: "c", vote: "3" }),
    ]);
    expect(stats.average).toBe(3);
    expect(stats.mode).toBe("?");
    expect(stats.votesCast).toBe(3);
  });
});

describe("mergeSuggestions", () => {
  it("dedupes by kind and createdAt while sorting ascending by time", () => {
    const a: AiSuggestion = {
      kind: "summary",
      createdAt: 2,
      payload: { consensusNote: "b", discussionPoints: [] },
    };
    const b: AiSuggestion = {
      kind: "summary",
      createdAt: 1,
      payload: { consensusNote: "a", discussionPoints: [] },
    };
    const bDuplicate: AiSuggestion = { ...b };
    expect(mergeSuggestions([a], [b, bDuplicate])).toEqual([b, a]);
  });
});

describe("latestSuggestion", () => {
  it("returns the most recent suggestion of a kind", () => {
    const summary: AiSuggestion = {
      kind: "summary",
      createdAt: 1,
      payload: { consensusNote: "x", discussionPoints: [] },
    };
    const deep: AiSuggestion = {
      kind: "deep",
      createdAt: 2,
      payload: { consensusNote: "y", discussionPoints: [] },
    };
    expect(latestSuggestion([summary, deep], "deep")).toBe(deep);
    expect(latestSuggestion([summary, deep], "summary")).toBe(summary);
  });

  it("returns null when there is no suggestion of that kind", () => {
    expect(latestSuggestion([], "summary")).toBeNull();
  });
});

describe("translateError", () => {
  it("maps known server errors to Portuguese", () => {
    expect(translateError("Room not found")).toBe(
      "Sala não encontrada ou expirada.",
    );
    expect(translateError("Failed to fetch Jira issue")).toBe(
      "Não foi possível buscar a issue no Jira.",
    );
    expect(translateError("Failed to fetch GitHub tree")).toBe(
      "Não foi possível listar os arquivos do repositório no GitHub.",
    );
    expect(translateError("roomCode and hostToken are required")).toBe(
      "Dados obrigatórios ausentes.",
    );
  });

  it("never exposes hostToken in user-facing text", () => {
    expect(translateError("roomCode, hostToken, and url are required")).not
      .toMatch(/hosttoken/i);
    expect(translateError("unknown hostToken leak abc123")).toBe(
      "Não foi possível concluir a operação. Tente novamente.",
    );
  });

  it("falls back to a generic Portuguese message for unknown English", () => {
    expect(translateError("Something weird")).toBe(
      "Não foi possível concluir a operação. Tente novamente.",
    );
  });

  it("passes through existing Portuguese messages", () => {
    expect(translateError("Chave da IA não configurada")).toBe(
      "Chave da IA não configurada",
    );
  });

  it("returns a generic message when empty", () => {
    expect(translateError(undefined)).toBe("Ocorreu um erro inesperado.");
  });
});
