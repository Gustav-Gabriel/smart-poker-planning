import type { AiSuggestion, ClientPlayer } from "./types";

export type MutationAck = { ok: true } | { ok: false; error: string };

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

export type VoteStats = {
  votesCast: number;
  average: number | null;
  mode: string | null;
};

export function computeVoteStats(players: ClientPlayer[]): VoteStats {
  const votes = players
    .map((player) => player.vote)
    .filter((vote): vote is string => vote !== null);

  if (votes.length === 0) {
    return { votesCast: 0, average: null, mode: null };
  }

  const counts = new Map<string, number>();
  for (const vote of votes) {
    counts.set(vote, (counts.get(vote) ?? 0) + 1);
  }

  let mode: string | null = null;
  let modeCount = 0;
  for (const [vote, count] of counts) {
    if (count > modeCount) {
      mode = vote;
      modeCount = count;
    }
  }

  const numericVotes = votes
    .map((vote) => Number(vote))
    .filter((value) => Number.isFinite(value));
  const average =
    numericVotes.length > 0
      ? Math.round(
          (numericVotes.reduce((sum, value) => sum + value, 0) /
            numericVotes.length) *
            10,
        ) / 10
      : null;

  return { votesCast: votes.length, average, mode };
}

export function mergeSuggestions(
  existing: AiSuggestion[],
  incoming: AiSuggestion[],
): AiSuggestion[] {
  const map = new Map<string, AiSuggestion>();
  for (const suggestion of [...existing, ...incoming]) {
    map.set(`${suggestion.kind}:${suggestion.createdAt}`, suggestion);
  }
  return [...map.values()].sort((a, b) => a.createdAt - b.createdAt);
}

export function latestSuggestion(
  suggestions: AiSuggestion[],
  kind: AiSuggestion["kind"],
): AiSuggestion | null {
  for (let index = suggestions.length - 1; index >= 0; index -= 1) {
    if (suggestions[index].kind === kind) return suggestions[index];
  }
  return null;
}

const GENERIC_ERROR = "Ocorreu um erro inesperado.";
const GENERIC_OPERATION_ERROR =
  "Não foi possível concluir a operação. Tente novamente.";

const ERROR_TRANSLATIONS: Array<[RegExp, string]> = [
  [/room not found/i, "Sala não encontrada ou expirada."],
  [/room is full/i, "A sala atingiu o limite de participantes."],
  [/player not found/i, "Jogador não encontrado nesta sala."],
  [/name and avatar are required/i, "Informe nome e avatar para entrar."],
  [/not in this room/i, "Você não está conectado a esta sala."],
  [/unauthorized/i, "Apenas o anfitrião pode fazer isso."],
  [
    /jira authentication failed/i,
    "Falha na autenticação do Jira. Verifique e-mail e token.",
  ],
  [/jira issue not found/i, "Issue do Jira não encontrada."],
  [/invalid jira issue key or url/i, "Chave ou link do Jira inválido."],
  [/failed to fetch jira issue/i, "Não foi possível buscar a issue no Jira."],
  [/jira request failed/i, "Falha ao comunicar com o Jira."],
  [
    /github authentication failed/i,
    "Falha na autenticação do GitHub. Verifique o token.",
  ],
  [/github repository not found/i, "Repositório do GitHub não encontrado."],
  [/invalid github repository url/i, "Link de repositório do GitHub inválido."],
  [
    /failed to fetch github tree/i,
    "Não foi possível listar os arquivos do repositório no GitHub.",
  ],
  [
    /failed to fetch github contents/i,
    "Não foi possível buscar os arquivos selecionados no GitHub.",
  ],
  [/github request failed/i, "Falha ao comunicar com o GitHub."],
  [
    /unexpected github content encoding/i,
    "Formato de arquivo do GitHub não suportado.",
  ],
  [
    /roomcode, hosttoken, url, ref, and paths are required/i,
    "Dados do repositório incompletos.",
  ],
  [
    /roomcode, hosttoken, and issuekeyorurl are required/i,
    "Informe a chave ou o link da issue do Jira.",
  ],
  [
    /roomcode, hosttoken, and url are required/i,
    "Informe o link do repositório no GitHub.",
  ],
  [/roomcode and hosttoken are required/i, "Dados obrigatórios ausentes."],
  [/roomcode, hosttoken/i, "Dados obrigatórios ausentes."],
  [/paths must be an array/i, "Seleção de arquivos inválida."],
  [/invalid json body/i, "Requisição inválida."],
  [/invalid url/i, "URL inválida."],
];

const PORTUGUESE_MARKERS =
  /\b(não|você|informe|apenas|anfitrião|expirada|participantes|conectado|configurada|demorou|concluir|possível|selecionados|obrigatórios|inválid[oa]s?)\b/i;

function looksEnglishOnly(message: string): boolean {
  if (/[áàâãéêíóôõúç]/i.test(message)) return false;
  if (PORTUGUESE_MARKERS.test(message)) return false;
  if (
    /\b(failed|required|not found|invalid|unauthorized|error|must be|cannot|unable)\b/i.test(
      message,
    )
  ) {
    return true;
  }
  if (/\b[a-z]+[A-Z][a-zA-Z]*/.test(message)) return true;
  return /^[A-Za-z0-9\s.,!?'"():_/-]+$/.test(message.trim());
}

export function translateError(message: string | undefined | null): string {
  if (!message?.trim()) return GENERIC_ERROR;

  const normalized = message.trim();

  if (/hosttoken/i.test(normalized)) {
    for (const [pattern, translation] of ERROR_TRANSLATIONS) {
      if (pattern.test(normalized)) return translation;
    }
    return GENERIC_OPERATION_ERROR;
  }

  for (const [pattern, translation] of ERROR_TRANSLATIONS) {
    if (pattern.test(normalized)) return translation;
  }

  if (looksEnglishOnly(normalized)) return GENERIC_OPERATION_ERROR;

  return normalized;
}
