"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { applyCaps } from "@/lib/local-repo/apply-caps";
import {
  clear as clearLocalContents,
  localRepoKey,
  setSelectedContents,
} from "@/lib/local-repo/host-content-store";
import { readFolder } from "@/lib/local-repo/read-folder";
import { readZip } from "@/lib/local-repo/read-zip";
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

type AttachMode = "github" | "local";

type TreeResult = {
  owner: string;
  repo: string;
  ref: string;
  paths: string[];
  provider: "github" | "local";
  url: string;
};

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
  const [attachMode, setAttachMode] = useState<AttachMode>("github");
  const [repoUrl, setRepoUrl] = useState("");
  const [loadingTree, setLoadingTree] = useState(false);
  const [tree, setTree] = useState<TreeResult | null>(null);
  const [pendingContents, setPendingContents] = useState<Map<
    string,
    string
  > | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [pathFilter, setPathFilter] = useState("");
  const [repoError, setRepoError] = useState("");
  const [saving, setSaving] = useState(false);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = folderInputRef.current;
    if (!input) return;
    input.setAttribute("webkitdirectory", "");
    input.setAttribute("directory", "");
  }, []);

  function resetPicker() {
    setTree(null);
    setPendingContents(null);
    setSelectedPaths([]);
    setPathFilter("");
  }

  function switchMode(mode: AttachMode) {
    setAttachMode(mode);
    setRepoError("");
    setRepoUrl("");
    resetPicker();
  }

  async function handleLoadTree(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedUrl = repoUrl.trim();
    if (!hostToken || !trimmedUrl) return;

    setLoadingTree(true);
    setRepoError("");
    resetPicker();
    try {
      const params = new URLSearchParams({
        roomCode,
        hostToken,
        url: trimmedUrl,
      });
      const response = await fetch(`/api/github/tree?${params.toString()}`);
      const data = (await response.json()) as Omit<TreeResult, "provider" | "url"> & {
        error?: string;
      };
      if (!response.ok) {
        setRepoError(translateError(data.error));
        return;
      }
      setTree({
        owner: data.owner,
        repo: data.repo,
        ref: data.ref,
        paths: data.paths,
        provider: "github",
        url: trimmedUrl,
      });
      setPendingContents(null);
      setSelectedPaths([]);
    } catch {
      setRepoError("Falha de rede ao carregar o repositório.");
    } finally {
      setLoadingTree(false);
    }
  }

  async function handleLocalZip(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setLoadingTree(true);
    setRepoError("");
    resetPicker();
    try {
      const buffer = await file.arrayBuffer();
      const result = readZip(buffer, file.name);
      if (result.paths.length === 0) {
        setRepoError("Nenhum arquivo de texto encontrado no zip.");
        return;
      }
      setTree({
        owner: "local",
        repo: result.repoName,
        ref: "local",
        paths: result.paths,
        provider: "local",
        url: `local://${result.repoName}`,
      });
      setPendingContents(result.files);
      setSelectedPaths([]);
    } catch (error) {
      setRepoError(
        error instanceof Error
          ? translateError(error.message) || error.message
          : "Falha ao ler o arquivo zip.",
      );
    } finally {
      setLoadingTree(false);
    }
  }

  async function handleLocalFolder(event: ChangeEvent<HTMLInputElement>) {
    const list = event.target.files;
    event.target.value = "";
    if (!list || list.length === 0) return;

    setLoadingTree(true);
    setRepoError("");
    resetPicker();
    try {
      const result = await readFolder(list);
      if (result.paths.length === 0) {
        setRepoError("Nenhum arquivo de texto encontrado na pasta.");
        return;
      }
      setTree({
        owner: "local",
        repo: result.repoName,
        ref: "local",
        paths: result.paths,
        provider: "local",
        url: `local://${result.repoName}`,
      });
      setPendingContents(result.files);
      setSelectedPaths([]);
    } catch {
      setRepoError("Falha ao ler a pasta selecionada.");
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

    if (tree.provider === "local") {
      if (!pendingContents) {
        setSaving(false);
        setRepoError(
          "Conteúdo local ausente. Selecione o zip ou a pasta novamente.",
        );
        return;
      }
      const selectedMap = new Map<string, string>();
      for (const path of selectedPaths) {
        const content = pendingContents.get(path);
        if (content !== undefined) {
          selectedMap.set(path, content);
        }
      }
      // Soft client-side cap check (server enforces again).
      applyCaps(selectedMap, selectedPaths);
      setSelectedContents(localRepoKey(tree.repo), selectedMap);
    }

    const nextRepo: RepoAttachment = {
      provider: tree.provider,
      url: tree.url,
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
        resetPicker();
        setRepoUrl("");
      },
    );
  }

  function handleRemoveRepo(target: RepoAttachment) {
    if (!hostToken) return;
    if (target.provider === "local") {
      clearLocalContents(localRepoKey(target.repo));
    }
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
                    {repo.provider === "local" ? " (local)" : ""}
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

        <div className="host-controls__mode" role="group" aria-label="Origem do código">
          <button
            type="button"
            className={
              attachMode === "github"
                ? "host-controls__mode-btn host-controls__mode-btn--active"
                : "host-controls__mode-btn"
            }
            onClick={() => switchMode("github")}
          >
            GitHub
          </button>
          <button
            type="button"
            className={
              attachMode === "local"
                ? "host-controls__mode-btn host-controls__mode-btn--active"
                : "host-controls__mode-btn"
            }
            onClick={() => switchMode("local")}
          >
            Código local
          </button>
        </div>

        {attachMode === "github" ? (
          <form className="host-controls__repo-form" onSubmit={handleLoadTree}>
            <input
              type="url"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              placeholder="https://github.com/org/repo"
              aria-label="URL do repositório GitHub"
            />
            <Button type="submit" variant="secondary" disabled={loadingTree}>
              {loadingTree ? "Carregando…" : "Carregar arquivos"}
            </Button>
          </form>
        ) : (
          <div className="host-controls__local">
            <p className="host-controls__local-warning">
              Código local fica só neste navegador; após atualizar a página, anexe de
              novo para análise profunda.
            </p>
            <div className="host-controls__local-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={loadingTree}
                onClick={() => zipInputRef.current?.click()}
              >
                {loadingTree ? "Carregando…" : "Escolher zip"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={loadingTree}
                onClick={() => folderInputRef.current?.click()}
              >
                Escolher pasta
              </Button>
              <input
                ref={zipInputRef}
                type="file"
                accept=".zip,.ZIP,application/zip"
                className="visually-hidden"
                aria-label="Arquivo zip do repositório"
                onChange={handleLocalZip}
              />
              <input
                ref={folderInputRef}
                type="file"
                multiple
                className="visually-hidden"
                aria-label="Pasta do repositório"
                onChange={handleLocalFolder}
              />
            </div>
          </div>
        )}

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
