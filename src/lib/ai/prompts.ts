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

Adote simultaneamente três lentes sênior:
1) Desenvolvedor sênior — esforço de implementação, acoplamento, refatoração, débito técnico.
2) QA sênior — estratégia de testes, casos de borda, regressão, automação, dados de teste, tempo de validação.
3) Arquiteto sênior — impactos em fluxos/sistemas, contratos, migrações, riscos de desenho e dependências.

Priorize evidências concretas do Jira e do código (quando houver).
Trate a descrição do Jira como intenção, não como prova de que o código já está pronto.
Os votos da mesa são contexto de alinhamento humano — NÃO são âncora obrigatória da pontuação.
suggestedScore deve refletir a complexidade/esforço reais (dificuldade, volume de código, refatoração, custo de testes e duração da tarefa), mesmo que diverga bastante da maioria dos votos.
Se a tarefa for simples mas longa (muitos passos), eleve a nota pelo esforço total.
Se for curta mas difícil/arriscada (muitos testes ou alto acoplamento), eleve pela dificuldade/risco.
Não invente fatos: deixe explícito quando as evidências forem insuficientes.`;

const MULTI_LENS_SCORE_RULES = `suggestedScore.value DEVE ser exatamente um dos valores permitidos informados.
Não use "?" nem "☕" como sugestão de pontuação.
Calcule suggestedScore pela complexidade real (dev + QA + arquitetura): votos servem só como contraste.
Em rationale, explique em 1–3 frases o porquê técnico (implementação, testes e/ou arquitetura), mencionando se divergiu dos votos.`;

export function buildSummaryPrompt(input: {
  story: Story | null;
  votes: VoteContext[];
  deck: DeckType;
}): string {
  const allowedScores = scoreCardsFor(input.deck);
  return `Gere um resumo após a revelação dos votos, com olhar de dev sênior, QA sênior e arquiteto sênior.
Responda em português.
O JSON deve ter exatamente esta forma:
{"consensusNote":"string","discussionPoints":["string"],"suggestedScore":{"value":"string","rationale":"string"},"risks":["string"],"forgottenDetails":["string"],"impacts":["string"],"dependencies":["string"]}
Inclua de 3 a 5 pontos de discussão (misturando implementação, testes e arquitetura) quando houver informação suficiente.
Inclua riscos, detalhes esquecidos na história, impactos em outros fluxos e dependências.
${MULTI_LENS_SCORE_RULES}
Valores permitidos para suggestedScore.value: ${JSON.stringify(allowedScores)}.
Se as evidências forem limitadas, ainda assim sugira um valor permitido e declare a incerteza em rationale.

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
  return `Faça uma análise técnica aprofundada para apoiar a estimativa, com olhar de dev sênior, QA sênior e arquiteto sênior.
Responda em português.
O JSON deve ter esta forma:
{"consensusNote":"string","discussionPoints":["string"],"suggestedScore":{"value":"string","rationale":"string"},"risks":["string"],"forgottenDetails":["string"],"impacts":["string"],"dependencies":["string"],"unplannedWork":["string"],"relevantFiles":[{"path":"string","reason":"string"}],"openQuestions":["string"],"estimateTension":"string"}
Relacione conclusões a arquivos fornecidos. Considere arquivos omitidos uma limitação.
Em risks / forgottenDetails / impacts / dependencies / unplannedWork / openQuestions, cubra implementação, testes (incluindo custo de validação) e arquitetura.
Em estimateTension, compare a nota técnica sugerida com a distribuição dos votos quando divergirem.
${MULTI_LENS_SCORE_RULES}
Valores permitidos para suggestedScore.value: ${JSON.stringify(allowedScores)}.
Você pode revisar priorSummary.suggestedScore à luz do código e do Jira.
Se não houver Jira nem arquivos, estime com base no que houver (votos/resumo) e declare a limitação em rationale.

Contexto:
${JSON.stringify({ ...input, allowedScores })}`;
}
