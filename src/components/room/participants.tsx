"use client";

import { computeVoteStats } from "@/lib/room-ui";
import type { ClientPlayer } from "@/lib/types";

type ParticipantsProps = {
  players: ClientPlayer[];
  hostId: string;
  revealed: boolean;
  variant?: "sidebar" | "table";
  onExpand?: () => void;
};

export function Participants({
  players,
  hostId,
  revealed,
  variant = "sidebar",
  onExpand,
}: ParticipantsProps) {
  const stats = revealed ? computeVoteStats(players) : null;
  const isTable = variant === "table";

  return (
    <section
      className={`panel participants${isTable ? " panel__table participants--table" : ""}`}
    >
      {!isTable && (
        <div className="panel__heading">
          <h2>Participantes</h2>
          <div className="participants__heading-actions">
            <span className="participants__count">{players.length}</span>
            {!isTable && onExpand ? (
              <button type="button" className="text-link" onClick={onExpand}>
                Modo mesa
              </button>
            ) : null}
          </div>
        </div>
      )}

      {stats && stats.votesCast > 0 ? (
        <div className="participants__stats">
          {stats.average !== null ? (
            <div className="participants__stat">
              <strong>{stats.average}</strong>
              <span>média</span>
            </div>
          ) : null}
          <div className="participants__stat">
            <strong>{stats.mode}</strong>
            <span>mais votado</span>
          </div>
        </div>
      ) : null}

      <ul className="participants__list">
        {players.map((player) => {
          const facedown = player.hasVoted && !revealed;
          const revealedValue = revealed && player.vote !== null;

          return (
            <li
              key={player.id}
              className={`participant${isTable ? " participant--table" : ""}${
                !player.connected ? " is-offline" : ""
              }`}
            >
              <div className="participant__info">
                <span className="participant__avatar" aria-hidden="true">
                  {player.avatar.type === "gif" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={player.avatar.value} alt="" />
                  ) : (
                    <span>{player.avatar.value}</span>
                  )}
                </span>
                <span className="participant__name">
                  {player.name}
                  <span className="participant__badges">
                    {player.id === hostId ? (
                      <span className="tag tag--host">Anfitrião</span>
                    ) : null}
                    {!player.connected ? (
                      <span className="tag tag--muted">Offline</span>
                    ) : null}
                  </span>
                </span>
              </div>
              <span
                className={[
                  "participant__vote",
                  isTable ? "participant__vote--xl" : "",
                  facedown ? "has-vote is-facedown" : "",
                  revealedValue ? "has-vote is-revealed" : "",
                  !player.hasVoted ? "is-waiting" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={
                  facedown
                    ? `${player.name} já votou`
                    : revealedValue
                      ? `Voto de ${player.name}: ${player.vote}`
                      : `${player.name} ainda não votou`
                }
              >
                {facedown ? (
                  <span className="participant__vote-back" aria-hidden="true" />
                ) : revealedValue ? (
                  player.vote
                ) : (
                  "…"
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
