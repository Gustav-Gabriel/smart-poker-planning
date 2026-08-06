"use client";

import { computeVoteStats } from "@/lib/room-ui";
import type { ClientPlayer } from "@/lib/types";

type ParticipantsProps = {
  players: ClientPlayer[];
  hostId: string;
  revealed: boolean;
};

export function Participants({ players, hostId, revealed }: ParticipantsProps) {
  const stats = revealed ? computeVoteStats(players) : null;

  return (
    <section className="panel participants">
      <div className="panel__heading">
        <h2>Participantes</h2>
        <span className="participants__count">{players.length}</span>
      </div>

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
        {players.map((player) => (
          <li
            key={player.id}
            className={`participant ${!player.connected ? "is-offline" : ""}`}
          >
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
            <span
              className={`participant__vote ${player.vote !== null ? "has-vote" : ""}`}
            >
              {player.vote !== null ? player.vote : player.hasVoted ? "🂠" : "…"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
