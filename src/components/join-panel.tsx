"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AvatarPicker } from "@/components/avatar-picker";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";
import { translateError } from "@/lib/room-ui";
import { saveSession, type SessionData } from "@/lib/session-client";
import { getSocket } from "@/lib/socket/client";
import type { ClientRoomSnapshot, Player } from "@/lib/types";

export type JoinResult = {
  room: ClientRoomSnapshot;
  player: Player;
  playerToken: string;
  hostToken?: string;
};

type JoinAck =
  | { room: ClientRoomSnapshot; player: Player; playerToken?: string }
  | { ok: false; error: string };

type JoinPanelProps = {
  roomCode: string;
  existingSession: SessionData | null;
  onJoined: (result: JoinResult) => void;
};

export function JoinPanel({ roomCode, existingSession, onJoined }: JoinPanelProps) {
  const [mode, setMode] = useState<"rejoin" | "form">(
    existingSession ? "rejoin" : "form",
  );
  const [avatar, setAvatar] = useState<Player["avatar"]>(
    existingSession?.avatar ?? { type: "emoji", value: "🃏" },
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function finishJoin(
    ack: JoinAck,
    hostToken: string | undefined,
    fallbackPlayerToken: string | undefined,
  ) {
    if (!ack || "ok" in ack) {
      setError(translateError(ack?.error));
      setSubmitting(false);
      return;
    }
    const playerToken = ack.playerToken ?? fallbackPlayerToken;
    if (!playerToken) {
      setError(translateError("Invalid rejoin token"));
      setSubmitting(false);
      return;
    }
    saveSession({
      roomCode,
      playerId: ack.player.id,
      playerToken,
      hostToken,
      name: ack.player.name,
      avatar: ack.player.avatar,
    });
    onJoined({ room: ack.room, player: ack.player, playerToken, hostToken });
  }

  function handleRejoin() {
    if (!existingSession) return;
    setSubmitting(true);
    setError("");
    getSocket()
      .timeout(10_000)
      .emit(
        "room:join",
        {
          roomCode,
          playerId: existingSession.playerId,
          playerToken: existingSession.playerToken,
        },
        (timeoutError: Error | null, ack: JoinAck) => {
          if (timeoutError) {
            setError("A conexão demorou demais. Tente novamente.");
            setSubmitting(false);
            return;
          }
          finishJoin(ack, existingSession.hostToken, existingSession.playerToken);
        },
      );
  }

  function handleSwitchProfile() {
    setMode("form");
    setError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) {
      setError("Informe seu nome para entrar.");
      return;
    }

    setSubmitting(true);
    setError("");
    getSocket()
      .timeout(10_000)
      .emit(
        "room:join",
        { roomCode, name, avatar },
        (timeoutError: Error | null, ack: JoinAck) => {
          if (timeoutError) {
            setError("A conexão demorou demais. Tente novamente.");
            setSubmitting(false);
            return;
          }
          finishJoin(ack, undefined, undefined);
        },
      );
  }

  const roomNotFound = /não encontrada/i.test(error);

  return (
    <div className="join-panel">
      <p className="eyebrow">
        <span aria-hidden="true">✦</span> Sala {roomCode}
      </p>

      {mode === "rejoin" && existingSession ? (
        <div className="rejoin-banner">
          <div className="rejoin-banner__avatar" aria-hidden="true">
            {existingSession.avatar.type === "gif" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={existingSession.avatar.value} alt="" />
            ) : (
              <span>{existingSession.avatar.value}</span>
            )}
          </div>
          <div className="rejoin-banner__body">
            <h1>Continuar como {existingSession.name}?</h1>
            <p>Encontramos sua sessão anterior nesta sala.</p>
          </div>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="rejoin-banner__actions">
            <Button type="button" onClick={handleRejoin} disabled={submitting}>
              {submitting ? "Entrando…" : "Continuar"}
            </Button>
            <button
              type="button"
              className="text-link"
              onClick={handleSwitchProfile}
              disabled={submitting}
            >
              Entrar com outro perfil
            </button>
          </div>
        </div>
      ) : (
        <form className="join-form" onSubmit={handleSubmit}>
          <h1>Entrar na sala</h1>
          <p className="join-form__support">
            Escolha um nome e um avatar para votar com o time.
          </p>
          <InputField
            id="name"
            name="name"
            label="Seu nome"
            placeholder="Como o time te chama?"
            autoComplete="name"
            required
          />
          <div className="field">
            <p className="field-label">Avatar</p>
            <AvatarPicker value={avatar} onChange={setAvatar} />
          </div>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="join-form__actions">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Entrando…" : "Entrar na sala"}{" "}
              <span aria-hidden="true">→</span>
            </Button>
            {roomNotFound ? (
              <Link className="text-link" href="/">
                Voltar ao início
              </Link>
            ) : null}
          </div>
        </form>
      )}
    </div>
  );
}
