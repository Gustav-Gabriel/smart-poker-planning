import { scoreCardsFor } from "../decks";
import type { AiSuggestion, DeckType, Story } from "../types";

export type VoteContext = {
  player: string;
  vote: string | null;
};

export type RepositoryContext = {
  repository: string;
  ref: string;
  files: Array<{ path: string; content: string }>;
  omitted: string[];
};

export const AI_SYSTEM_PROMPT = `Você apoia uma sessão de planning poker.
Responda sempre em português e retorne somente um objeto JSON válido, sem Markdown.
Priorize evidências concretas do código e da estrutura dos repositórios.
Trate o Jira como descrição da intenção, não como prova da implementação.
Trate a dispersão dos votos como sinal de incerteza que deve orientar a discussão.
Não invente fatos: deixe explícito quando as evidências forem insuficientes.`;

export function buildSummaryPrompt(input: {
  story: Story | null;
  votes: VoteContext[];
  deck: DeckType;
}): string {
  const allowedScores = scoreCardsFor(input.deck);
  return `Gere um resumo curto após a revelação dos votos.
Responda em português.
O JSON deve ter exatamente esta forma:
{"consensusNote":"string","discussionPoints":["string"],"suggestedScore":{"value":"string","rationale":"string"}}
Inclua de 3 a 5 pontos de discussão quando houver informação suficiente.
suggestedScore.value DEVE ser exatamente um destes valores permitidos: ${JSON.stringify(allowedScores)}.
Não use "?" nem "☕" como sugestão de pontuação.
Baseie suggestedScore nos votos; se houver story (Jira), incorpore título/descrição/labels na justificativa.
Se as evidências forem limitadas, ainda assim sugira um valor permitido e explique a incerteza em rationale (1–2 frases).

Contexto:
${JSON.stringify({ ...input, allowedScores })}`;
}

export function buildDeepPrompt(input: {
  story: Story | null;
  votes: VoteContext[];
  deck: DeckType;
  repositories: RepositoryContext[];
  priorSummary?: AiSuggestion["payload"];
}): string {
  const allowedScores = scoreCardsFor(input.deck);
  return `Faça uma análise técnica aprofundada para apoiar a estimativa.
Responda em português.
O JSON deve ter esta forma:
{"consensusNote":"string","discussionPoints":["string"],"suggestedScore":{"value":"string","rationale":"string"},"risks":["string"],"unplannedWork":["string"],"relevantFiles":[{"path":"string","reason":"string"}],"openQuestions":["string"],"estimateTension":"string"}
Relacione conclusões a arquivos fornecidos. Considere os arquivos omitidos uma limitação da análise.
suggestedScore.value DEVE ser exatamente um destes valores permitidos: ${JSON.stringify(allowedScores)}.
Não use "?" nem "☕" como sugestão de pontuação.
Você pode revisar priorSummary.suggestedScore quando houver story (Jira) e/ou arquivos de repositório; cite evidências brevemente em rationale.
Se não houver Jira nem arquivos, sugira com base nos votos (e no resumo anterior, se houver) e deixe a limitação de evidências explícita em rationale (1–2 frases).

Contexto:
${JSON.stringify({ ...input, allowedScores })}`;
}
