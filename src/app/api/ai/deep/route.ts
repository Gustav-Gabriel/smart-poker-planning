import { NextResponse } from "next/server";
import { runDeepAnalysis } from "@/lib/ai/providers";
import { fetchSelectedContents as fetchBitbucketContents } from "@/lib/bitbucket/client";
import { fetchSelectedContents as fetchGithubContents } from "@/lib/github/client";
import { assertHost } from "@/lib/host-auth";
import { checkRoomRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { getRoom, touchRoom } from "@/lib/room-store";
import { getIO } from "@/lib/socket/io";
import type { AiSuggestion } from "@/lib/types";

type DeepRequestBody = {
  roomCode?: string;
  hostToken?: string;
};

export async function POST(request: Request) {
  let body: DeepRequestBody;
  try {
    body = (await request.json()) as DeepRequestBody;
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
    const repositories = await Promise.all(
      room.repos.map(async (repo) => {
        const contents =
          repo.provider === "bitbucket"
            ? await fetchBitbucketContents({
                workspace: repo.owner,
                repo: repo.repo,
                ref: repo.ref,
                paths: repo.selectedPaths,
                token: room.secrets.gitToken,
              })
            : await fetchGithubContents({
                owner: repo.owner,
                repo: repo.repo,
                ref: repo.ref,
                paths: repo.selectedPaths,
                token: room.secrets.gitToken,
              });
        return {
          repository: `${repo.owner}/${repo.repo}`,
          ref: repo.ref,
          ...contents,
        };
      }),
    );
    const omitted = repositories
      .filter((repo) => repo.omitted.length > 0)
      .map((repo) => ({ repository: repo.repository, paths: repo.omitted }));
    const priorSummary = room.suggestions
      .toReversed()
      .find((suggestion) => suggestion.kind === "summary")?.payload;
    const suggestion: AiSuggestion = await runDeepAnalysis({
      provider: room.secrets.aiProvider,
      apiKey: room.secrets.aiApiKey,
      story: room.story,
      votes: [...room.players.values()].map((player) => ({
        player: player.name,
        vote: player.vote,
      })),
      deck: room.deck,
      repositories,
      priorSummary,
    });
    if (omitted.length > 0) {
      suggestion.omitted = omitted;
    }
    room.suggestions.push(suggestion);
    touchRoom(room.code);
    emitAi(room.code, "ai:deep", suggestion);
    return NextResponse.json(suggestion);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao gerar análise aprofundada";
    emitAi(room.code, "ai:deep", { error: message });
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
