"use client";

import { useEffect, useRef, useState } from "react";
import { HostControls } from "@/components/room/host-controls";
import { Participants } from "@/components/room/participants";
import { StoryPanel } from "@/components/room/story-panel";
import { SuggestionsPanel } from "@/components/room/suggestions-panel";
import { VoteDeck } from "@/components/room/vote-deck";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  getSelectedContents,
  localRepoKey,
} from "@/lib/local-repo/host-content-store";
import type { MutationAck } from "@/lib/room-ui";
import { mergeSuggestions, translateError } from "@/lib/room-ui";
import { clearSession } from "@/lib/session-client";
import { getSocket } from "@/lib/socket/client";
import type {
  AiSuggestion,
  ClientRoomSnapshot,
  Player,
  RepoAttachment,
} from "@/lib/types";

/** Build localFiles payload for deep analysis from host in-memory store. */
export function buildLocalFilesPayload(
  repos: RepoAttachment[],
):
  | { ok: true; localFiles: { repository: string; files: { path: string; content: string }[] }[] }
  | { ok: false; error: string } {
  const localRepos = repos.filter((repo) => repo.provider === "local");
  const localFiles: {
    repository: string;
    files: { path: string; content: string }[];
  }[] = [];

  for (const repo of localRepos) {
    const stored = getSelectedContents(localRepoKey(repo.repo));
    if (!stored) {
      return {
        ok: false,
        error:
          "Código local ausente neste navegador. Anexe o zip ou a pasta de novo antes da análise profunda.",
      };
    }
    const files: { path: string; content: string }[] = [];
    for (const path of repo.selectedPaths) {
      const content = stored.get(path);
      if (content !== undefined) {
        files.push({ path, content });
      }
    }
    if (files.length === 0 && repo.selectedPaths.length > 0) {
      return {
        ok: false,
        error:
          "Código local ausente neste navegador. Anexe o zip ou a pasta de novo antes da análise profunda.",
      };
    }
    localFiles.push({
      repository: `${repo.owner}/${repo.repo}`,
      files,
    });
  }

  return { ok: true, localFiles };
}

type AiEventPayload = AiSuggestion | { status: "pending" } | { error: string };

type GameRoomProps = {
  code: string;
  initialRoom: ClientRoomSnapshot;
  player: Player;
  playerToken: string;
  hostToken?: string;
  onLeave: () => void;
};

export function GameRoom({
  code,
  initialRoom,
  player,
  playerToken,
  hostToken,
  onLeave,
}: GameRoomProps) {
  const [room, setRoom] = useState<ClientRoomSnapshot>(initialRoom);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>(
    initialRoom.suggestions,
  );
  const [summaryPending, setSummaryPending] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [deepPending, setDeepPending] = useState(false);
  const [deepError, setDeepError] = useState("");
  const [voteError, setVoteError] = useState("");
  const [roomLostError, setRoomLostError] = useState("");
  const playerIdRef = useRef(player.id);
  const playerTokenRef = useRef(playerToken);

  useEffect(() => {
    playerIdRef.current = player.id;
    playerTokenRef.current = playerToken;
  }, [player.id, playerToken]);

  useEffect(() => {
    const socket = getSocket();

    function handleRoomState(next: ClientRoomSnapshot) {
      if (next.code !== code) return;
      setRoom(next);
      setSuggestions((prev) => mergeSuggestions(prev, next.suggestions));
    }

    function handleSummary(payload: AiEventPayload) {
      if ("status" in payload) {
        setSummaryPending(true);
        setSummaryError("");
        return;
      }
      if ("error" in payload) {
        setSummaryPending(false);
        setSummaryError(translateError(payload.error));
        return;
      }
      setSummaryPending(false);
      setSummaryError("");
      setSuggestions((prev) => mergeSuggestions(prev, [payload]));
    }

    function handleDeep(payload: AiEventPayload) {
      if ("status" in payload) return;
      setDeepPending(false);
      if ("error" in payload) {
        setDeepError(translateError(payload.error));
        return;
      }
      setDeepError("");
      setSuggestions((prev) => mergeSuggestions(prev, [payload]));
    }

    function reattach() {
      socket.emit(
        "room:join",
        {
          roomCode: code,
          playerId: playerIdRef.current,
          playerToken: playerTokenRef.current,
        },
        (ack: unknown) => {
          if (ack && typeof ack === "object" && "error" in ack) {
            setRoomLostError(
              translateError((ack as { error: string }).error),
            );
          }
        },
      );
    }

    socket.on("room:state", handleRoomState);
    socket.on("ai:summary", handleSummary);
    socket.on("ai:deep", handleDeep);
    socket.on("connect", reattach);

    return () => {
      socket.off("room:state", handleRoomState);
      socket.off("ai:summary", handleSummary);
      socket.off("ai:deep", handleDeep);
      socket.off("connect", reattach);
    };
  }, [code]);

  const self = room.players.find((candidate) => candidate.id === player.id) ?? player;
  const isHost = room.hostId === player.id && Boolean(hostToken);

  function handleVote(value: string) {
    setVoteError("");
    getSocket().emit(
      "vote:cast",
      { roomCode: code, value },
      (ack: MutationAck) => {
        if (ack && "ok" in ack && !ack.ok) {
          setVoteError(translateError(ack.error));
        }
      },
    );
  }

  function handleLeave() {
    getSocket().emit("room:leave", { roomCode: code }, () => undefined);
    clearSession();
    onLeave();
  }

  function handleReveal() {
    if (!hostToken) return;
    setSummaryPending(true);
    setSummaryError("");
    getSocket().emit(
      "vote:reveal",
      { roomCode: code, hostToken },
      (ack: MutationAck) => {
        if (ack && "ok" in ack && !ack.ok) {
          setSummaryPending(false);
          setSummaryError(translateError(ack.error));
        }
      },
    );
  }

  function handleReset() {
    if (!hostToken) return;
    getSocket().emit("vote:reset", { roomCode: code, hostToken }, () => undefined);
    setSummaryPending(false);
    setSummaryError("");
    setDeepError("");
  }

  async function handleDeepAnalysis() {
    if (!hostToken) return;
    setDeepPending(true);
    setDeepError("");

    const localPayload = buildLocalFilesPayload(room.repos);
    if (!localPayload.ok) {
      setDeepPending(false);
      setDeepError(localPayload.error);
      return;
    }

    try {
      const response = await fetch("/api/ai/deep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode: code,
          hostToken,
          ...(localPayload.localFiles.length > 0
            ? { localFiles: localPayload.localFiles }
            : {}),
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setDeepPending(false);
        setDeepError(translateError(data.error));
      }
    } catch {
      setDeepPending(false);
      setDeepError("Falha de rede ao gerar análise aprofundada.");
    }
  }

  function handleCopyLink() {
    if (typeof window === "undefined") return;
    void navigator.clipboard?.writeText(window.location.href);
  }

  if (roomLostError) {
    return (
      <div className="room room--lost">
        <p className="form-error" role="alert">
          {roomLostError}
        </p>
        <button type="button" className="text-link" onClick={onLeave}>
          Voltar ao início
        </button>
      </div>
    );
  }

  return (
    <div className="room">
      <header className="room__header">
        <div>
          <p className="eyebrow">
            <span aria-hidden="true">✦</span> {room.name}
          </p>
          <h1>Sala {room.code}</h1>
        </div>
        <div className="room__header-actions">
          <ThemeToggle />
          <button type="button" className="text-link" onClick={handleCopyLink}>
            Copiar link
          </button>
          <button type="button" className="text-link" onClick={handleLeave}>
            Sair da sala
          </button>
        </div>
      </header>

      <div className="room__layout">
        <div className="room__main">
          <StoryPanel
            story={room.story}
            isHost={isHost}
            roomCode={code}
            hostToken={hostToken}
          />
          {isHost ? (
            <HostControls
              roomCode={code}
              hostToken={hostToken}
              repos={room.repos}
              revealed={room.revealed}
              deepPending={deepPending}
              deepError={deepError}
              onReveal={handleReveal}
              onReset={handleReset}
              onDeepAnalysis={handleDeepAnalysis}
            />
          ) : null}
          <VoteDeck
            cards={room.deckCards}
            selected={self.vote}
            disabled={room.revealed}
            onVote={handleVote}
          />
          {voteError ? (
            <p className="form-error" role="alert">
              {voteError}
            </p>
          ) : null}
          <SuggestionsPanel
            suggestions={suggestions}
            revealed={room.revealed}
            summaryPending={summaryPending}
            summaryError={summaryError}
            deepPending={deepPending}
            deepError={deepError}
          />
        </div>
        <aside className="room__sidebar">
          <Participants
            players={room.players}
            hostId={room.hostId}
            revealed={room.revealed}
          />
        </aside>
      </div>
    </div>
  );
}
