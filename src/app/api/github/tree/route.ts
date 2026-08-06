import { NextResponse } from "next/server";
import { assertHost } from "@/lib/host-auth";
import { checkRoomRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { getRoom } from "@/lib/room-store";
import {
  GithubAuthError,
  GithubNotFoundError,
  listRepoTreeFromUrl,
} from "@/lib/github/client";
import { parseGithubUrl } from "@/lib/github/parse-url";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomCode = searchParams.get("roomCode");
  const hostToken = searchParams.get("hostToken");
  const url = searchParams.get("url");

  if (!roomCode || !hostToken || !url) {
    return NextResponse.json(
      { error: "roomCode, hostToken, and url are required" },
      { status: 400 },
    );
  }

  const room = getRoom(roomCode);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  if (!assertHost(roomCode, hostToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRoomRateLimit(room.code)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  try {
    parseGithubUrl(url);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid URL" },
      { status: 400 },
    );
  }

  try {
    const result = await listRepoTreeFromUrl({
      url,
      token: room.secrets.gitToken,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof GithubAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof GithubNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to fetch GitHub tree" },
      { status: 502 },
    );
  }
}
