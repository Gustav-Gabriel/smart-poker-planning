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
        hostAvatar: { type: "emoji", value: "🚀" },
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

  it("passes through gif host avatars", () => {
    expect(
      buildRoomPayload({
        roomName: "Sprint 24",
        deck: "fibonacci",
        aiProvider: "gemini",
        gitToken: "",
        hostName: "Ana",
        hostAvatar: {
          type: "gif",
          value: "https://media.giphy.com/media/abc/giphy.gif",
        },
      }).hostAvatar,
    ).toEqual({
      type: "gif",
      value: "https://media.giphy.com/media/abc/giphy.gif",
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
        hostAvatar: { type: "emoji", value: "🃏" },
      }).secrets,
    ).toEqual({
      aiProvider: "gemini",
      gitToken: "gh-pat",
    });
  });
});
