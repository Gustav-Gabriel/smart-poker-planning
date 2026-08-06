import { describe, expect, it } from "vitest";
import { buildRoomPayload } from "./create-room-form";

describe("buildRoomPayload", () => {
  it("maps create-room fields to the socket payload", () => {
    expect(
      buildRoomPayload({
        roomName: "  Sprint 24  ",
        deck: "fibonacci",
        aiProvider: "gemini",
        aiApiKey: "ai-key",
        jiraSite: "https://acme.atlassian.net/",
        jiraEmail: "ana@acme.com",
        jiraToken: "jira-key",
        gitToken: "  ",
        hostName: "  Ana  ",
        hostEmoji: "🚀",
      }),
    ).toEqual({
      name: "Sprint 24",
      deck: "fibonacci",
      hostName: "Ana",
      hostAvatar: { type: "emoji", value: "🚀" },
      secrets: {
        aiProvider: "gemini",
        aiApiKey: "ai-key",
        jiraSite: "https://acme.atlassian.net",
        jiraEmail: "ana@acme.com",
        jiraToken: "jira-key",
      },
    });
  });
});
