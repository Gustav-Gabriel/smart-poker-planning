"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
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
        <div className="story-card">
          <div className="story-card__meta">
            <span className="story-card__key">{story.jiraKey}</span>
            {story.issueType ? <span className="tag">{story.issueType}</span> : null}
            {story.status ? (
              <span className="tag tag--muted">{story.status}</span>
            ) : null}
          </div>
          <h3>{story.title}</h3>
          {story.description ? (
            <p className="story-card__description">{story.description}</p>
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
          >
            Abrir no Jira ↗
          </a>
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
