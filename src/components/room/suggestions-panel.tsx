"use client";

import { DEEP_ANALYSIS_UI_ENABLED } from "@/lib/feature-flags";
import { formatOmittedWarning, latestSuggestion } from "@/lib/room-ui";
import type { AiSuggestion } from "@/lib/types";

type SuggestionsPanelProps = {
  suggestions: AiSuggestion[];
  revealed: boolean;
  summaryPending: boolean;
  summaryError: string;
  deepPending: boolean;
  deepError: string;
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

export function SuggestionsPanel({
  suggestions,
  revealed,
  summaryPending,
  summaryError,
  deepPending,
  deepError,
}: SuggestionsPanelProps) {
  const summary = latestSuggestion(suggestions, "summary");
  const deep = DEEP_ANALYSIS_UI_ENABLED
    ? latestSuggestion(suggestions, "deep")
    : undefined;

  if (!revealed && !summary && !deep && !summaryPending) {
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
        <h3>Resumo rápido</h3>
        {summaryPending ? <p className="panel__empty">Gerando resumo…</p> : null}
        {summaryError ? (
          <p className="form-error" role="alert">
            {summaryError}
          </p>
        ) : null}
        {summary ? (
          <div className="suggestion-card">
            <SuggestedScoreBlock suggestedScore={summary.payload.suggestedScore} />
            <p>{summary.payload.consensusNote}</p>
            {summary.payload.discussionPoints.length > 0 ? (
              <ul>
                {summary.payload.discussionPoints.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* TODO: gated by DEEP_ANALYSIS_UI_ENABLED — re-enable when latency/cost is acceptable */}
      {DEEP_ANALYSIS_UI_ENABLED ? (
        <div className="suggestion-block">
          <h3>Análise profunda</h3>
          {deepPending ? (
            <p className="panel__empty">Analisando repositórios…</p>
          ) : null}
          {deepError ? (
            <p className="form-error" role="alert">
              {deepError}
            </p>
          ) : null}
          {deep?.omitted && deep.omitted.length > 0 ? (
            <p className="form-warning" role="status">
              {formatOmittedWarning(deep.omitted)}
            </p>
          ) : null}
          {deep ? (
            <div className="suggestion-card">
              <SuggestedScoreBlock suggestedScore={deep.payload.suggestedScore} />
              <p>{deep.payload.consensusNote}</p>
              {deep.payload.risks && deep.payload.risks.length > 0 ? (
                <div>
                  <h4>Riscos</h4>
                  <ul>
                    {deep.payload.risks.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {deep.payload.unplannedWork && deep.payload.unplannedWork.length > 0 ? (
                <div>
                  <h4>Trabalho não planejado</h4>
                  <ul>
                    {deep.payload.unplannedWork.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {deep.payload.relevantFiles && deep.payload.relevantFiles.length > 0 ? (
                <div>
                  <h4>Arquivos relevantes</h4>
                  <ul>
                    {deep.payload.relevantFiles.map((file) => (
                      <li key={file.path}>
                        <code>{file.path}</code> — {file.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {deep.payload.openQuestions && deep.payload.openQuestions.length > 0 ? (
                <div>
                  <h4>Perguntas em aberto</h4>
                  <ul>
                    {deep.payload.openQuestions.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {deep.payload.estimateTension ? (
                <p className="suggestion-card__tension">{deep.payload.estimateTension}</p>
              ) : null}
            </div>
          ) : !deepPending ? (
            <p className="panel__empty">
              Disponível após revelar os votos. Anexe um repositório para uma análise
              mais rica.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
