import { NextResponse } from "next/server";
import { runDeepAnalysis } from "@/lib/ai/providers";
import { fetchSelectedContents as fetchGithubContents } from "@/lib/github/client";
import { applyCaps } from "@/lib/local-repo/apply-caps";
import { assertHost } from "@/lib/host-auth";
import { checkRoomRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { getRoom, touchRoom } from "@/lib/room-store";
import { getIO } from "@/lib/socket/io";
import type { AiSuggestion } from "@/lib/types";

type LocalFilesPayload = {
  repository: string;
  files: { path: string; content: string }[];
};

type DeepRequestBody = {
  roomCode?: string;
  hostToken?: string;
  localFiles?: LocalFilesPayload[];
};

function matchLocalFiles(
  repo: { owner: string; repo: string },
  localFiles: LocalFilesPayload[] | undefined,
): LocalFilesPayload | undefined {
  if (!localFiles) return undefined;
  const labels = [`${repo.owner}/${repo.repo}`, `local/${repo.repo}`];
  return localFiles.find((entry) => labels.includes(entry.repository));
}

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
        if (repo.provider === "local") {
          const matched = matchLocalFiles(repo, body.localFiles);
          if (!matched || matched.files.length === 0) {
            throw new LocalContentsMissingError(
              `Local repository contents are missing for ${repo.owner}/${repo.repo}. Re-attach the zip or folder before deep analysis.`,
            );
          }
          const contentMap = new Map(
            matched.files.map((file) => [file.path, file.content]),
          );
          const contents = applyCaps(contentMap, repo.selectedPaths);
          if (
            contents.files.length === 0 &&
            repo.selectedPaths.length > 0
          ) {
            throw new LocalContentsMissingError(
              `Local repository contents are missing for ${repo.owner}/${repo.repo}. Re-attach the zip or folder before deep analysis.`,
            );
          }
          return {
            repository: `${repo.owner}/${repo.repo}`,
            ref: repo.ref,
            ...contents,
          };
        }

        const contents = await fetchGithubContents({
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
    if (error instanceof LocalContentsMissingError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao gerar análise aprofundada";
    emitAi(room.code, "ai:deep", { error: message });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

class LocalContentsMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalContentsMissingError";
  }
}

function emitAi(roomCode: string, event: string, payload: unknown): void {
  try {
    getIO().to(roomCode).emit(event, payload);
  } catch {
    // Route unit tests and non-custom Next servers may not initialize Socket.io.
  }
}
