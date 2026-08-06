import type { AiSuggestion, ClientPlayer, OmittedRepoFiles } from "./types";

const OMITTED_SAMPLE_SIZE = 5;

export function formatOmittedWarning(omitted: OmittedRepoFiles[]): string {
  const totalPaths = omitted.reduce((sum, repo) => sum + repo.paths.length, 0);
  const samples = omitted.flatMap((repo) =>
    repo.paths.map((path) => `${repo.repository}: ${path}`),
  );
  const shown = samples.slice(0, OMITTED_SAMPLE_SIZE);
  const remainder = samples.length - shown.length;

  const noun = totalPaths === 1 ? "arquivo" : "arquivos";
  let message = `${totalPaths} ${noun} foram omitidos por exceder os limites de contexto: ${shown.join(", ")}`;
  if (remainder > 0) {
    message += ` (e mais ${remainder})`;
  }
  return `${message}.`;
}

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
  [/votes already revealed/i, "Os votos já foram revelados."],
  [
    /invalid rejoin token/i,
    "Sessão inválida nesta sala. Entre novamente.",
  ],
  [/invalid vote value/i, "Valor de voto inválido para este baralho."],
  [
    /room name is required/i,
    "Informe um nome de sala válido.",
  ],
  [/invalid deck/i, "Baralho inválido."],
  [/host name is required/i, "Informe seu nome para criar a sala."],
  [/invalid host avatar/i, "Avatar do anfitrião inválido."],
  [/invalid room secrets/i, "Credenciais da sala inválidas."],
  [/invalid ai provider/i, "Provedor de IA inválido."],
  [/ai api key is required/i, "Informe a chave da API de IA."],
  [/jira site is required/i, "Informe o site do Jira."],
  [/jira email is required/i, "Informe o e-mail do Jira."],
  [/jira token is required/i, "Informe o token do Jira."],
  [/invalid git token/i, "Token Git inválido."],
  [/invalid github token/i, "Token do GitHub inválido."],
  [/invalid room payload/i, "Dados da sala inválidos."],
  [/invalid name/i, "Nome inválido."],
  [/invalid avatar/i, "Avatar inválido."],
  [
    /jira request timed out/i,
    "O Jira demorou demais para responder. Tente novamente.",
  ],
  [
    /github request timed out/i,
    "O GitHub demorou demais para responder. Tente novamente.",
  ],
  [
    /bitbucket request timed out/i,
    "O Bitbucket demorou demais para responder. Tente novamente.",
  ],
  [
    /klipy request timed out/i,
    "O KLIPY demorou demais para responder. Tente novamente.",
  ],
  [/falha ao buscar gifs no klipy/i, "Não foi possível buscar GIFs no KLIPY."],
  [
    /chave klipy não configurada/i,
    "Serviço de GIFs indisponível: chave KLIPY não configurada.",
  ],
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
    /bitbucket authentication failed/i,
    "Falha na autenticação do Bitbucket. Verifique o Access Token ou App Password + usuário.",
  ],
  [
    /bitbucket repository not found/i,
    "Repositório do Bitbucket não encontrado — ou privado sem autenticação válida (App Password + usuário, ou Access Token).",
  ],
  [
    /invalid bitbucket repository url/i,
    "Link de repositório do Bitbucket inválido.",
  ],
  [
    /failed to fetch bitbucket tree/i,
    "Não foi possível listar os arquivos do repositório no Bitbucket.",
  ],
  [
    /failed to fetch bitbucket contents/i,
    "Não foi possível buscar os arquivos selecionados no Bitbucket.",
  ],
  [/bitbucket request failed/i, "Falha ao comunicar com o Bitbucket."],
  [
    /bitbucket repository has no main branch/i,
    "O repositório do Bitbucket não tem branch principal.",
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
    "Informe o link do repositório no GitHub ou Bitbucket.",
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
