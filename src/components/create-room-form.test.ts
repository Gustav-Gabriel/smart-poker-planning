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
        bitbucketUsername: "  ",
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

  it("includes optional Bitbucket username and git token when set", () => {
    expect(
      buildRoomPayload({
        roomName: "Sprint 24",
        deck: "fibonacci",
        aiProvider: "openai",
        aiApiKey: "ai-key",
        jiraSite: "https://acme.atlassian.net",
        jiraEmail: "ana@acme.com",
        jiraToken: "jira-key",
        gitToken: " app-password ",
        bitbucketUsername: " ana ",
        hostName: "Ana",
        hostEmoji: "🃏",
      }).secrets,
    ).toEqual({
      aiProvider: "openai",
      aiApiKey: "ai-key",
      jiraSite: "https://acme.atlassian.net",
      jiraEmail: "ana@acme.com",
      jiraToken: "jira-key",
      gitToken: "app-password",
      bitbucketUsername: "ana",
    });
  });
});
