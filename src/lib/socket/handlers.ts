import type { Server, Socket } from "socket.io";
import { runSummary } from "../ai/providers";
import { checkRoomRateLimit, RATE_LIMIT_MESSAGE } from "../rate-limit";
import { toClientSnapshot } from "../room-snapshot";
import {
  castVote,
  createRoom,
  getRoom,
  joinRoom,
  rejoinRoom,
  resetVotes,
  revealVotes,
  setRepos,
  setStory,
  touchRoom,
} from "../room-store";
import type { Player, RepoAttachment, Story } from "../types";
import {
  isValidVoteValue,
  validateCreateRoomInput,
  validateJoinNameAvatar,
  validatePlayerUpdate,
} from "../validation";

type SuccessAck = { ok: true };
type ErrorAck = { ok: false; error: string };
type MutationAck = SuccessAck | ErrorAck;
type Ack<T> = (result: T | ErrorAck) => void;

type JoinPayload = {
  roomCode: string;
  playerId?: string;
  playerToken?: string;
  name?: string;
  avatar?: Player["avatar"];
};

type HostPayload = {
  roomCode?: string;
  hostToken: string;
};

function roomIdentity(
  socket: Socket,
  requestedCode?: string,
): { roomCode: string; playerId: string } | ErrorAck {
  const roomCode = socket.data.roomCode;
  const playerId = socket.data.playerId;
  if (
    typeof roomCode !== "string" ||
    typeof playerId !== "string" ||
    (requestedCode && requestedCode.toUpperCase() !== roomCode)
  ) {
    return { ok: false, error: "Not in this room" };
  }
  return { roomCode, playerId };
}

async function broadcastRoom(io: Server, roomCode: string): Promise<void> {
  const room = getRoom(roomCode);
  if (!room) return;

  const sockets = await io.in(room.code).fetchSockets();
  for (const viewer of sockets) {
    const viewerId =
      typeof viewer.data.playerId === "string" ? viewer.data.playerId : "";
    viewer.emit("room:state", toClientSnapshot(room, viewerId));
  }
}

async function finishMutation(
  io: Server,
  roomCode: string,
  result: MutationAck,
  ack: Ack<SuccessAck>,
): Promise<boolean> {
  if (!result.ok) {
    ack(result);
    return false;
  }
  await broadcastRoom(io, roomCode);
  ack(result);
  return true;
}

function generateSummary(io: Server, roomCode: string): void {
  const room = getRoom(roomCode);
  if (!room) return;

  if (!checkRoomRateLimit(room.code)) {
    io.to(room.code).emit("ai:summary", { error: RATE_LIMIT_MESSAGE });
    return;
  }

  const votes = [...room.players.values()]
    .filter((player) => player.vote !== null)
    .map((player) => ({ player: player.name, vote: player.vote }));
  if (votes.length === 0) {
    io.to(room.code).emit("ai:summary", {
      error: "Não há votos para resumir",
    });
    return;
  }

  void runSummary({
    provider: room.secrets.aiProvider,
    apiKey: room.secrets.aiApiKey,
    story: room.story,
    votes,
    deck: room.deck,
  })
    .then((suggestion) => {
      const activeRoom = getRoom(room.code);
      if (!activeRoom) return;
      activeRoom.suggestions.push(suggestion);
      touchRoom(activeRoom.code);
      io.to(activeRoom.code).emit("ai:summary", suggestion);
    })
    .catch((error: unknown) => {
      io.to(room.code).emit("ai:summary", {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao gerar resumo com IA",
      });
    });
}

export function registerSocketHandlers(io: Server): void {
  io.on("connection", (socket) => {
    socket.on(
      "room:create",
      async (
        input: unknown,
        ack: Ack<{
          room: ReturnType<typeof toClientSnapshot>;
          player: Player;
          hostToken: string;
          playerToken: string;
        }> = () => undefined,
      ) => {
        const validated = validateCreateRoomInput(input);
        if ("error" in validated) {
          ack({ ok: false, error: validated.error });
          return;
        }

        const created = createRoom(validated);
        await socket.join(created.room.code);
        socket.data.roomCode = created.room.code;
        socket.data.playerId = created.player.id;
        ack({
          room: toClientSnapshot(created.room, created.player.id),
          player: created.player,
          hostToken: created.hostToken,
          playerToken: created.playerToken,
        });
      },
    );

    socket.on(
      "room:join",
      async (
        input: JoinPayload,
        ack: Ack<{
          room: ReturnType<typeof toClientSnapshot>;
          player: Player;
          playerToken: string;
        }> = () => undefined,
      ) => {
        if (!input || typeof input.roomCode !== "string") {
          ack({ ok: false, error: "Room code is required" });
          return;
        }

        const roomCode = input.roomCode.toUpperCase();
        let result:
          | {
              room: NonNullable<ReturnType<typeof getRoom>>;
              player: Player;
              playerToken: string;
            }
          | ErrorAck;

        if (input.playerId) {
          const rejoined = rejoinRoom(
            roomCode,
            input.playerId,
            input.playerToken ?? "",
          );
          result = rejoined.ok
            ? {
                room: rejoined.room,
                player: rejoined.player,
                playerToken: input.playerToken ?? "",
              }
            : { ok: false, error: rejoined.error };
        } else {
          const validated = validateJoinNameAvatar(input.name, input.avatar);
          if ("error" in validated) {
            result = { ok: false, error: validated.error };
          } else {
            const joined = joinRoom(roomCode, validated);
            result =
              "error" in joined
                ? { ok: false, error: joined.error }
                : {
                    room: joined.room,
                    player: joined.player,
                    playerToken: joined.playerToken,
                  };
          }
        }

        if ("ok" in result) {
          ack(result);
          return;
        }

        await socket.join(result.room.code);
        socket.data.roomCode = result.room.code;
        socket.data.playerId = result.player.id;
        await broadcastRoom(io, result.room.code);
        ack({
          room: toClientSnapshot(result.room, result.player.id),
          player: result.player,
          playerToken: result.playerToken,
        });
      },
    );

    socket.on(
      "vote:cast",
      async (
        input: { roomCode?: string; value: string },
        ack: Ack<SuccessAck> = () => undefined,
      ) => {
        const identity = roomIdentity(socket, input.roomCode);
        if ("ok" in identity) {
          ack(identity);
          return;
        }

        const room = getRoom(identity.roomCode);
        if (!room) {
          ack({ ok: false, error: "Room not found" });
          return;
        }
        if (!isValidVoteValue(room.deck, input.value)) {
          ack({ ok: false, error: "Invalid vote value" });
          return;
        }

        await finishMutation(
          io,
          identity.roomCode,
          castVote(identity.roomCode, identity.playerId, input.value),
          ack,
        );
      },
    );

    socket.on(
      "vote:reveal",
      async (
        input: HostPayload,
        ack: Ack<SuccessAck> = () => undefined,
      ) => {
        const identity = roomIdentity(socket, input.roomCode);
        if ("ok" in identity) {
          ack(identity);
          return;
        }
        const result = revealVotes(identity.roomCode, input.hostToken);
        const succeeded = await finishMutation(
          io,
          identity.roomCode,
          result,
          ack,
        );
        if (succeeded) {
          io.to(identity.roomCode).emit("ai:summary", { status: "pending" });
          generateSummary(io, identity.roomCode);
        }
      },
    );

    socket.on(
      "vote:reset",
      async (
        input: HostPayload,
        ack: Ack<SuccessAck> = () => undefined,
      ) => {
        const identity = roomIdentity(socket, input.roomCode);
        if ("ok" in identity) {
          ack(identity);
          return;
        }
        await finishMutation(
          io,
          identity.roomCode,
          resetVotes(identity.roomCode, input.hostToken),
          ack,
        );
      },
    );

    socket.on(
      "story:set",
      async (
        input: HostPayload & { story: Story | null },
        ack: Ack<SuccessAck> = () => undefined,
      ) => {
        const identity = roomIdentity(socket, input.roomCode);
        if ("ok" in identity) {
          ack(identity);
          return;
        }
        await finishMutation(
          io,
          identity.roomCode,
          setStory(identity.roomCode, input.hostToken, input.story),
          ack,
        );
      },
    );

    socket.on(
      "repo:set",
      async (
        input: HostPayload & { repos: RepoAttachment[] },
        ack: Ack<SuccessAck> = () => undefined,
      ) => {
        const identity = roomIdentity(socket, input.roomCode);
        if ("ok" in identity) {
          ack(identity);
          return;
        }
        await finishMutation(
          io,
          identity.roomCode,
          setRepos(identity.roomCode, input.hostToken, input.repos),
          ack,
        );
      },
    );

    socket.on(
      "player:update",
      async (
        input: {
          roomCode?: string;
          name?: string;
          avatar?: Player["avatar"];
        },
        ack: Ack<SuccessAck> = () => undefined,
      ) => {
        const identity = roomIdentity(socket, input.roomCode);
        if ("ok" in identity) {
          ack(identity);
          return;
        }
        const room = getRoom(identity.roomCode);
        const player = room?.players.get(identity.playerId);
        if (!room || !player) {
          ack({ ok: false, error: "Player not found" });
          return;
        }

        const validated = validatePlayerUpdate(input.name, input.avatar);
        if ("error" in validated) {
          ack({ ok: false, error: validated.error });
          return;
        }

        if (validated.name !== undefined) player.name = validated.name;
        if (validated.avatar !== undefined) player.avatar = validated.avatar;
        touchRoom(room.code);
        await broadcastRoom(io, room.code);
        ack({ ok: true });
      },
    );

    socket.on(
      "room:leave",
      async (
        input: { roomCode?: string } = {},
        ack: Ack<SuccessAck> = () => undefined,
      ) => {
        const identity = roomIdentity(socket, input.roomCode);
        if ("ok" in identity) {
          ack(identity);
          return;
        }
        const room = getRoom(identity.roomCode);
        if (!room || !room.players.delete(identity.playerId)) {
          ack({ ok: false, error: "Player not found" });
          return;
        }
        room.playerTokens.delete(identity.playerId);
        touchRoom(room.code);
        await socket.leave(room.code);
        socket.data.roomCode = undefined;
        socket.data.playerId = undefined;
        ack({ ok: true });
        await broadcastRoom(io, room.code);
      },
    );

    socket.on("disconnect", () => {
      const identity = roomIdentity(socket);
      if ("ok" in identity) return;
      const room = getRoom(identity.roomCode);
      const player = room?.players.get(identity.playerId);
      if (!room || !player) return;

      player.connected = false;
      touchRoom(room.code);
      void broadcastRoom(io, room.code).catch((error: unknown) => {
        console.error("Failed to broadcast disconnect state", error);
      });
    });
  });
}
