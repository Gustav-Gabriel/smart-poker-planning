import { cardsFor } from "./decks";
import type { ClientRoomSnapshot, Player, RoomState, RoomSecrets } from "./types";

type StoredRoom = RoomState & { secrets: RoomSecrets };

export function toClientSnapshot(
  room: StoredRoom,
  viewerId: string,
): ClientRoomSnapshot {
  const players = Array.from(room.players.values()).map((player) =>
    toClientPlayer(player, room.revealed, viewerId),
  );

  return {
    code: room.code,
    name: room.name,
    deck: room.deck,
    hostId: room.hostId,
    players,
    story: room.story,
    repos: room.repos,
    revealed: room.revealed,
    suggestions: room.suggestions,
    deckCards: cardsFor(room.deck),
  };
}

function toClientPlayer(
  player: Player,
  revealed: boolean,
  viewerId: string,
): ClientRoomSnapshot["players"][number] {
  const hideVote = !revealed && player.id !== viewerId;
  return {
    id: player.id,
    name: player.name,
    avatar: player.avatar,
    isHost: player.isHost,
    connected: player.connected,
    hasVoted: player.vote !== null,
    vote: hideVote ? null : player.vote,
  };
}
