import { NextResponse } from "next/server";
import { runSummary } from "@/lib/ai/providers";
import { assertHost } from "@/lib/host-auth";
import { checkRoomRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { getRoom, touchRoom } from "@/lib/room-store";
import { getIO } from "@/lib/socket/io";

type SummaryRequestBody = {
  roomCode?: string;
  hostToken?: string;
};

export async function POST(request: Request) {
  let body: SummaryRequestBody;
  try {
    body = (await request.json()) as SummaryRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.roomCode || !body.hostToken) {
    return NextResponse.json(
      { error: "roomCode and hostToken are required" },
      { status: 400 },
    );
  }

  const room = getRoom(body.roomCode);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (!assertHost(room.code, body.hostToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRoomRateLimit(room.code)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  try {
    const suggestion = await runSummary({
      provider: room.secrets.aiProvider,
      apiKey: room.secrets.aiApiKey,
      story: room.story,
      votes: [...room.players.values()].map((player) => ({
        player: player.name,
        vote: player.vote,
      })),
      deck: room.deck,
    });
    room.suggestions.push(suggestion);
    touchRoom(room.code);
    emitAi(room.code, "ai:summary", suggestion);
    return NextResponse.json(suggestion);
  } catch (error) {
    const message = aiErrorMessage(error);
    emitAi(room.code, "ai:summary", { error: message });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function emitAi(roomCode: string, event: string, payload: unknown): void {
  try {
    getIO().to(roomCode).emit(event, payload);
  } catch {
    // Route unit tests and non-custom Next servers may not initialize Socket.io.
  }
}

function aiErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Falha ao gerar resumo com IA";
}
