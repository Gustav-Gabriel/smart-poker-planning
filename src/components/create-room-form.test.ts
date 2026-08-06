import { describe, expect, it } from "vitest";
import { buildRoomPayload } from "./create-room-form";

describe("buildRoomPayload", () => {
  it("maps create-room fields to the socket payload without secrets", () => {
    expect(
      buildRoomPayload({
        roomName: "  Sprint 24  ",
        deck: "fibonacci",
        aiProvider: "gemini",
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
      },
    });
  });

  it("includes optional git token when set", () => {
    expect(
      buildRoomPayload({
        roomName: "Sprint 24",
        deck: "fibonacci",
        aiProvider: "gemini",
        gitToken: " gh-pat ",
        hostName: "Ana",
        hostEmoji: "🃏",
      }).secrets,
    ).toEqual({
      aiProvider: "gemini",
      gitToken: "gh-pat",
    });
  });
});
