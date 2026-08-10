"use client";

import { formatOmittedWarning, latestSuggestion } from "@/lib/room-ui";
import type { AiSuggestion } from "@/lib/types";

type SuggestionsPanelProps = {
  suggestions: AiSuggestion[];
  revealed: boolean;
  summaryPending: boolean;
  summaryError: string;
  deepPending: boolean;
  deepError: string;
  hasRepos: boolean;
};

function SuggestedScoreBlock({
  suggestedScore,
}: {
  suggestedScore: AiSuggestion["payload"]["suggestedScore"];
}) {
  return (
    <div className="suggestion-card__score" role="group" aria-label="Sugestão de pontuação">
      <h4>Sugestão de pontuação</h4>
      <p className="suggestion-card__score-value">
        <span className="suggestion-card__score-card">{suggestedScore.value}</span>
      </p>
      <p className="suggestion-card__score-rationale">{suggestedScore.rationale}</p>
    </div>
  );
}

function StringListSection({
  title,
  items,
}: {
  title: string;
  items: string[] | undefined;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h4>{title}</h4>
      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function pickList(
  primary: string[] | undefined,
  fallback: string[] | undefined,
): string[] | undefined {
  if (primary && primary.length > 0) return primary;
  if (fallback && fallback.length > 0) return fallback;
  return undefined;
}

export function SuggestionsPanel({
  suggestions,
  revealed,
  summaryPending,
  summaryError,
  deepPending,
  deepError,
  hasRepos,
}: SuggestionsPanelProps) {
  const summary = latestSuggestion(suggestions, "summary");
  const enrichment = latestSuggestion(suggestions, "deep");
  const rich = enrichment?.payload ?? summary?.payload;

  if (!revealed && !summary && !summaryPending) {
    return (
      <section className="panel suggestions-panel">
        <div className="panel__heading">
          <h2>Sugestões de IA</h2>
        </div>
        <p className="panel__empty">Revele os votos para receber um resumo com IA.</p>
      </section>
    );
  }

  return (
    <section className="panel suggestions-panel">
      <div className="panel__heading">
        <h2>Sugestões de IA</h2>
      </div>

      <div className="suggestion-block">
        <h3>Resumo pós-votos</h3>
        {summaryPending ? <p className="panel__empty">Gerando resumo…</p> : null}
        {summaryError ? (
          <p className="form-error" role="alert">
            {summaryError}
          </p>
        ) : null}
        {hasRepos && deepPending ? (
          <p className="panel__empty">Enriquecendo com o código anexado…</p>
        ) : null}
        {deepError ? (
          <p className="form-error" role="alert">
            {deepError}
          </p>
        ) : null}
        {enrichment?.omitted && enrichment.omitted.length > 0 ? (
          <p className="form-warning" role="status">
            {formatOmittedWarning(enrichment.omitted)}
          </p>
        ) : null}
        {summary ? (
          <div className="suggestion-card">
            <SuggestedScoreBlock
              suggestedScore={
                enrichment?.payload.suggestedScore ?? summary.payload.suggestedScore
              }
            />
            <p>
              {(enrichment?.payload.consensusNote || summary.payload.consensusNote)}
            </p>
            {(enrichment?.payload.discussionPoints ?? summary.payload.discussionPoints)
              .length > 0 ? (
              <ul>
                {(
                  enrichment?.payload.discussionPoints ??
                  summary.payload.discussionPoints
                ).map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            ) : null}

            <StringListSection
              title="Riscos"
              items={pickList(rich?.risks, summary.payload.risks)}
            />
            <StringListSection
              title="Detalhes esquecidos"
              items={pickList(
                rich?.forgottenDetails,
                summary.payload.forgottenDetails,
              )}
            />
            <StringListSection
              title="Impactos"
              items={pickList(rich?.impacts, summary.payload.impacts)}
            />
            <StringListSection
              title="Dependências"
              items={pickList(rich?.dependencies, summary.payload.dependencies)}
            />
            <StringListSection
              title="Trabalho não planejado"
              items={pickList(rich?.unplannedWork, summary.payload.unplannedWork)}
            />
            {rich?.relevantFiles && rich.relevantFiles.length > 0 ? (
              <div>
                <h4>Arquivos relevantes</h4>
                <ul>
                  {rich.relevantFiles.map((file) => (
                    <li key={file.path}>
                      <code>{file.path}</code> — {file.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <StringListSection title="Perguntas em aberto" items={rich?.openQuestions} />
            {rich?.estimateTension ? (
              <p className="suggestion-card__tension">{rich.estimateTension}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
