import { NextResponse } from "next/server";
import { assertHost } from "@/lib/host-auth";
import { checkRoomRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { getRoom } from "@/lib/room-store";
import {
  BitbucketAuthError,
  BitbucketNotFoundError,
  fetchSelectedContentsFromUrl,
} from "@/lib/bitbucket/client";
import { parseBitbucketUrl } from "@/lib/bitbucket/parse-url";

type ContentsRequestBody = {
  roomCode?: string;
  hostToken?: string;
  url?: string;
  ref?: string;
  paths?: string[];
};

export async function POST(request: Request) {
  let body: ContentsRequestBody;

  try {
    body = (await request.json()) as ContentsRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { roomCode, hostToken, url, ref, paths } = body;

  if (!roomCode || !hostToken || !url || !ref || !paths) {
    return NextResponse.json(
      { error: "roomCode, hostToken, url, ref, and paths are required" },
      { status: 400 },
    );
  }

  if (!Array.isArray(paths)) {
    return NextResponse.json({ error: "paths must be an array" }, { status: 400 });
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
    parseBitbucketUrl(url);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid URL" },
      { status: 400 },
    );
  }

  try {
    const result = await fetchSelectedContentsFromUrl({
      url,
      ref,
      paths,
      token: room.secrets.gitToken,
      username: room.secrets.bitbucketUsername,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BitbucketAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof BitbucketNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to fetch Bitbucket contents" },
      { status: 502 },
    );
  }
}
