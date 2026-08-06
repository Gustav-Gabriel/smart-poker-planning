import { describe, expect, it } from "vitest";
import {
  computeVoteStats,
  formatOmittedWarning,
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

describe("formatOmittedWarning", () => {
  it("reports total count and a sample of the omitted paths", () => {
    const message = formatOmittedWarning([
      { repository: "acme/app", paths: ["a.ts", "b.ts"] },
    ]);
    expect(message).toContain("2 arquivos");
    expect(message).toContain("acme/app: a.ts");
    expect(message).toContain("acme/app: b.ts");
  });

  it("truncates the sample and notes the remainder", () => {
    const paths = Array.from({ length: 8 }, (_, i) => `file${i}.ts`);
    const message = formatOmittedWarning([{ repository: "acme/app", paths }]);
    expect(message).toContain("8 arquivos");
    expect(message).toContain("e mais 3");
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
    expect(translateError("Local repository contents are missing")).toBe(
      "Código local ausente neste navegador. Anexe o zip ou a pasta de novo antes da análise profunda.",
    );
    expect(translateError("roomCode and hostToken are required")).toBe(
      "Dados obrigatórios ausentes.",
    );
  });

  it("maps the newer validation and integrity errors to Portuguese", () => {
    expect(translateError("Votes already revealed")).toBe(
      "Os votos já foram revelados.",
    );
    expect(translateError("Invalid rejoin token")).toBe(
      "Sessão inválida nesta sala. Entre novamente.",
    );
    expect(translateError("Invalid vote value")).toBe(
      "Valor de voto inválido para este baralho.",
    );
    expect(translateError("GitHub request timed out")).toBe(
      "O GitHub demorou demais para responder. Tente novamente.",
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

  it("maps AI provider HTTP failures to actionable Portuguese", () => {
    expect(
      translateError("Provedor de IA respondeu com status 401: API key invalid"),
    ).toBe(
      "Chave da API de IA inválida ou sem permissão. Verifique a chave configurada na sala.",
    );
    expect(
      translateError("Provedor de IA respondeu com status 403"),
    ).toBe(
      "Chave da API de IA inválida ou sem permissão. Verifique a chave configurada na sala.",
    );
    expect(
      translateError(
        "Provedor de IA respondeu com status 404: models/gemini-2.0-flash is not found",
      ),
    ).toBe(
      "Modelo ou endpoint de IA indisponível. Tente atualizar o app ou verificar a chave.",
    );
    expect(translateError("Provedor de IA respondeu com status 429")).toBe(
      "Quota ou limite do provedor de IA atingido. Aguarde e tente novamente.",
    );
  });

  it("keeps accent-free Portuguese AI errors (does not treat as English-only)", () => {
    expect(
      translateError("Provedor de IA respondeu com status 502: upstream boom"),
    ).toBe("Provedor de IA respondeu com status 502: upstream boom");
    expect(
      translateError("A requisicao para o provedor de IA expirou"),
    ).toMatch(/expirou/i);
  });

  it("maps oversized zip to the 200MB limit message", () => {
    expect(translateError("Zip archive is too large (max 200MB)")).toBe(
      "O arquivo zip é grande demais (máx. 200MB).",
    );
  });

  it("returns a generic message when empty", () => {
    expect(translateError(undefined)).toBe("Ocorreu um erro inesperado.");
  });
});
