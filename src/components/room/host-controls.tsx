"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { MutationAck } from "@/lib/room-ui";
import { translateError } from "@/lib/room-ui";
import { getSocket } from "@/lib/socket/client";
import type { RepoAttachment } from "@/lib/types";

type HostControlsProps = {
  roomCode: string;
  hostToken?: string;
  repos: RepoAttachment[];
  revealed: boolean;
  deepPending: boolean;
  deepError: string;
  onReveal: () => void;
  onReset: () => void;
  onDeepAnalysis: () => void;
};

type TreeResult = { owner: string; repo: string; ref: string; paths: string[] };

export function HostControls({
  roomCode,
  hostToken,
  repos,
  revealed,
  deepPending,
  deepError,
  onReveal,
  onReset,
  onDeepAnalysis,
}: HostControlsProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const [loadingTree, setLoadingTree] = useState(false);
  const [tree, setTree] = useState<TreeResult | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [pathFilter, setPathFilter] = useState("");
  const [repoError, setRepoError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleLoadTree(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedUrl = repoUrl.trim();
    if (!hostToken || !trimmedUrl) return;

    setLoadingTree(true);
    setRepoError("");
    setTree(null);
    try {
      const params = new URLSearchParams({
        roomCode,
        hostToken,
        url: trimmedUrl,
      });
      const response = await fetch(`/api/github/tree?${params.toString()}`);
      const data = (await response.json()) as TreeResult & { error?: string };
      if (!response.ok) {
        setRepoError(translateError(data.error));
        return;
      }
      setTree(data);
      setSelectedPaths([]);
    } catch {
      setRepoError("Falha de rede ao carregar o repositório.");
    } finally {
      setLoadingTree(false);
    }
  }

  function togglePath(path: string) {
    setSelectedPaths((prev) =>
      prev.includes(path) ? prev.filter((item) => item !== path) : [...prev, path],
    );
  }

  function handleSaveRepo() {
    if (!hostToken || !tree || selectedPaths.length === 0) return;

    setSaving(true);
    const nextRepo: RepoAttachment = {
      url: repoUrl.trim(),
      owner: tree.owner,
      repo: tree.repo,
      ref: tree.ref,
      selectedPaths,
    };
    const nextRepos = [
      ...repos.filter(
        (repo) => !(repo.owner === tree.owner && repo.repo === tree.repo),
      ),
      nextRepo,
    ];
    getSocket().emit(
      "repo:set",
      { roomCode, hostToken, repos: nextRepos },
      (ack: MutationAck) => {
        setSaving(false);
        if (ack && "ok" in ack && !ack.ok) {
          setRepoError(translateError(ack.error));
          return;
        }
        setTree(null);
        setRepoUrl("");
        setSelectedPaths([]);
      },
    );
  }

  function handleRemoveRepo(target: RepoAttachment) {
    if (!hostToken) return;
    const nextRepos = repos.filter(
      (repo) => !(repo.owner === target.owner && repo.repo === target.repo),
    );
    getSocket().emit(
      "repo:set",
      { roomCode, hostToken, repos: nextRepos },
      () => undefined,
    );
  }

  const filteredPaths = tree
    ? tree.paths
        .filter((path) => path.toLowerCase().includes(pathFilter.toLowerCase()))
        .slice(0, 200)
    : [];

  return (
    <section className="panel host-controls">
      <div className="panel__heading">
        <h2>Controles do anfitrião</h2>
      </div>

      <div className="host-controls__actions">
        <Button type="button" onClick={onReveal} disabled={revealed}>
          Revelar votos
        </Button>
        <Button type="button" variant="secondary" onClick={onReset} disabled={!revealed}>
          Nova rodada
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onDeepAnalysis}
          disabled={!revealed || deepPending}
        >
          {deepPending ? "Analisando…" : "Análise profunda"}
        </Button>
      </div>
      {deepError ? (
        <p className="form-error" role="alert">
          {deepError}
        </p>
      ) : null}

      <div className="host-controls__repos">
        <h3>Repositórios anexados</h3>
        {repos.length === 0 ? (
          <p className="panel__empty">Nenhum repositório anexado.</p>
        ) : (
          <ul className="repo-list">
            {repos.map((repo) => (
              <li key={`${repo.owner}/${repo.repo}`} className="repo-list__item">
                <div>
                  <strong>
                    {repo.owner}/{repo.repo}
                  </strong>
                  <span>{repo.selectedPaths.length} caminho(s) selecionado(s)</span>
                </div>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => handleRemoveRepo(repo)}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}

        <form className="host-controls__repo-form" onSubmit={handleLoadTree}>
          <input
            type="url"
            value={repoUrl}
            onChange={(event) => setRepoUrl(event.target.value)}
            placeholder="https://github.com/org/repositorio"
            aria-label="URL do repositório GitHub"
          />
          <Button type="submit" variant="secondary" disabled={loadingTree}>
            {loadingTree ? "Carregando…" : "Carregar arquivos"}
          </Button>
        </form>
        {repoError ? (
          <p className="form-error" role="alert">
            {repoError}
          </p>
        ) : null}

        {tree ? (
          <div className="repo-picker">
            <input
              type="text"
              className="repo-picker__filter"
              value={pathFilter}
              onChange={(event) => setPathFilter(event.target.value)}
              placeholder="Filtrar arquivos…"
              aria-label="Filtrar arquivos do repositório"
            />
            <ul className="repo-picker__list">
              {filteredPaths.map((path) => (
                <li key={path}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedPaths.includes(path)}
                      onChange={() => togglePath(path)}
                    />
                    {path}
                  </label>
                </li>
              ))}
            </ul>
            <div className="repo-picker__footer">
              <span>{selectedPaths.length} selecionado(s)</span>
              <Button
                type="button"
                onClick={handleSaveRepo}
                disabled={selectedPaths.length === 0 || saving}
              >
                {saving ? "Salvando…" : "Salvar caminhos"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
