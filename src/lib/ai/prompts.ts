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
  return `Gere um resumo curto após a revelação dos votos.
O JSON deve ter exatamente esta forma:
{"consensusNote":"string","discussionPoints":["string"]}
Inclua de 3 a 5 pontos de discussão quando houver informação suficiente.

Contexto:
${JSON.stringify(input)}`;
}

export function buildDeepPrompt(input: {
  story: Story | null;
  votes: VoteContext[];
  deck: DeckType;
  repositories: RepositoryContext[];
  priorSummary?: AiSuggestion["payload"];
}): string {
  return `Faça uma análise técnica aprofundada para apoiar a estimativa.
O JSON deve ter esta forma:
{"consensusNote":"string","discussionPoints":["string"],"risks":["string"],"unplannedWork":["string"],"relevantFiles":[{"path":"string","reason":"string"}],"openQuestions":["string"],"estimateTension":"string"}
Relacione conclusões a arquivos fornecidos. Considere os arquivos omitidos uma limitação da análise.

Contexto:
${JSON.stringify(input)}`;
}
