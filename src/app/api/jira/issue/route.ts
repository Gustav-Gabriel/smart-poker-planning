import { NextResponse } from "next/server";
import { assertHost } from "@/lib/host-auth";
import { checkRoomRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { getRoom } from "@/lib/room-store";
import {
  fetchJiraIssue,
  JiraAuthError,
  JiraNotFoundError,
} from "@/lib/jira/client";

type IssueRequestBody = {
  roomCode?: string;
  hostToken?: string;
  issueKeyOrUrl?: string;
};

export async function POST(request: Request) {
  let body: IssueRequestBody;

  try {
    body = (await request.json()) as IssueRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { roomCode, hostToken, issueKeyOrUrl } = body;

  if (!roomCode || !hostToken || !issueKeyOrUrl) {
    return NextResponse.json(
      { error: "roomCode, hostToken, and issueKeyOrUrl are required" },
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
    const story = await fetchJiraIssue({
      site: room.secrets.jiraSite,
      email: room.secrets.jiraEmail,
      token: room.secrets.jiraToken,
      issueKeyOrUrl,
    });

    return NextResponse.json(story);
  } catch (error) {
    if (error instanceof JiraAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof JiraNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof Error && error.message.includes("Invalid Jira issue")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to fetch Jira issue" }, { status: 502 });
  }
}
