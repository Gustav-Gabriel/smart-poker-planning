"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ChevronDownIcon } from "@/components/icons/ic-chevron-down";
import { Button } from "@/components/ui/button";
import { clearAll as clearLocalRepoContents } from "@/lib/local-repo/host-content-store";
import { linkifyText } from "@/lib/linkify";
import type { MutationAck } from "@/lib/room-ui";
import { translateError } from "@/lib/room-ui";
import { getSocket } from "@/lib/socket/client";
import type { Story } from "@/lib/types";

type StoryPanelProps = {
  story: Story | null;
  isHost: boolean;
  roomCode: string;
  hostToken?: string;
};

export function StoryPanel({ story, isHost, roomCode, hostToken }: StoryPanelProps) {
  const [issueInput, setIssueInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // New import starts collapsed so the expand affordance is obvious.
    setExpanded(false);
  }, [story?.jiraKey]);

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hostToken || !issueInput.trim()) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/jira/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode,
          hostToken,
          issueKeyOrUrl: issueInput.trim(),
        }),
      });
      const data = (await response.json()) as Story & { error?: string };
      if (!response.ok) {
        setError(translateError(data.error));
        return;
      }
      setIssueInput("");
      // Importing a ticket clears attached repos + AI suggestions (server) and local zip memory.
      clearLocalRepoContents();
      getSocket().emit(
        "story:set",
        { roomCode, hostToken, story: data },
        (ack: MutationAck) => {
          if (ack && "ok" in ack && !ack.ok) setError(translateError(ack.error));
        },
      );
    } catch {
      setError("Falha de rede ao importar do Jira.");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    if (!hostToken) return;
    getSocket().emit(
      "story:set",
      { roomCode, hostToken, story: null },
      () => undefined,
    );
  }

  return (
    <section className="panel story-panel">
      <div className="panel__heading">
        <h2>História ativa</h2>
        {isHost && story ? (
          <button type="button" className="text-link" onClick={handleClear}>
            Remover
          </button>
        ) : null}
      </div>

      {story ? (
        <div className={`story-card${expanded ? " is-expanded" : " is-collapsed"}`}>
          <button
            type="button"
            className="story-card__summary"
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
          >
            <span className="story-card__summary-text">
              <span className="story-card__key">{story.jiraKey}</span>
              <span className="story-card__summary-title">{story.title}</span>
            </span>
            <span
              className={`story-card__chevron${expanded ? " is-open" : ""}`}
              aria-hidden="true"
            >
              <ChevronDownIcon height="1.15em" width="1.15em" />
            </span>
          </button>

          <div className="story-card__details" inert={!expanded ? true : undefined}>
            <div className="story-card__details-inner">
              <div className="story-card__meta">
                {story.issueType ? <span className="tag">{story.issueType}</span> : null}
                {story.status ? (
                  <span className="tag tag--muted">{story.status}</span>
                ) : null}
              </div>
              {story.description ? (
                <p className="story-card__description">
                  {linkifyText(story.description)}
                </p>
              ) : null}
              {story.labels.length > 0 ? (
                <div className="story-card__labels">
                  {story.labels.map((label) => (
                    <span key={label} className="tag tag--outline">
                      {label}
                    </span>
                  ))}
                </div>
              ) : null}
              <a
                className="text-link"
                href={story.jiraUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                Abrir no Jira ↗
              </a>
            </div>
          </div>
        </div>
      ) : (
        <p className="panel__empty">Nenhuma história importada ainda.</p>
      )}

      {isHost ? (
        <form className="story-panel__import" onSubmit={handleImport}>
          <input
            type="text"
            value={issueInput}
            onChange={(event) => setIssueInput(event.target.value)}
            placeholder="Chave ou link do Jira (ex.: PROJ-123)"
            aria-label="Chave ou link do Jira"
          />
          <Button type="submit" variant="secondary" disabled={loading}>
            {loading ? "Importando…" : "Importar do Jira"}
          </Button>
        </form>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
