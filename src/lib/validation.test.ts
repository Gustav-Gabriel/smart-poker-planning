import { describe, expect, it } from "vitest";
import {
  clampString,
  isValidAvatar,
  isValidVoteValue,
  validateCreateRoomInput,
  validateJoinNameAvatar,
  validatePlayerUpdate,
} from "./validation";

const validPublic = {
  name: "Sprint 12",
  deck: "fibonacci" as const,
  hostName: "Ana",
  hostAvatar: { type: "emoji" as const, value: "🎯" },
  secrets: {
    aiProvider: "gemini" as const,
  },
};

describe("clampString", () => {
  it("trims and rejects empty or too-long strings", () => {
    expect(clampString("  hi  ", 10)).toBe("hi");
    expect(clampString("   ", 10)).toBeNull();
    expect(clampString("a".repeat(11), 10)).toBeNull();
    expect(clampString(42, 10)).toBeNull();
  });
});

describe("isValidAvatar", () => {
  it("accepts short emoji avatars", () => {
    expect(isValidAvatar({ type: "emoji", value: "🃏" })).toBe(true);
    expect(isValidAvatar({ type: "emoji", value: "a".repeat(17) })).toBe(false);
    expect(isValidAvatar({ type: "emoji", value: "" })).toBe(false);
  });

  it("only accepts https KLIPY URLs for gif avatars", () => {
    expect(
      isValidAvatar({ type: "gif", value: "https://media.klipy.com/abc.gif" }),
    ).toBe(true);
    expect(
      isValidAvatar({ type: "gif", value: "https://cdn.klipy.com/abc.gif" }),
    ).toBe(true);
    expect(
      isValidAvatar({ type: "gif", value: "http://media.klipy.com/abc.gif" }),
    ).toBe(false);
    expect(
      isValidAvatar({ type: "gif", value: "https://evil.com/abc.gif" }),
    ).toBe(false);
    expect(isValidAvatar({ type: "gif", value: "not a url" })).toBe(false);
  });

  it("rejects unknown avatar shapes", () => {
    expect(isValidAvatar(null)).toBe(false);
    expect(isValidAvatar({ type: "video", value: "x" })).toBe(false);
  });
});

describe("isValidVoteValue", () => {
  it("only allows values from the room deck", () => {
    expect(isValidVoteValue("fibonacci", "5")).toBe(true);
    expect(isValidVoteValue("fibonacci", "M")).toBe(false);
    expect(isValidVoteValue("tshirt", "M")).toBe(true);
    expect(isValidVoteValue("tshirt", "99")).toBe(false);
  });
});

describe("validateCreateRoomInput", () => {
  it("accepts a well-formed public payload", () => {
    const result = validateCreateRoomInput(validPublic);
    expect(result).toEqual({
      name: "Sprint 12",
      deck: "fibonacci",
      hostName: "Ana",
      hostAvatar: { type: "emoji", value: "🎯" },
      aiProvider: "gemini",
    });
  });

  it("ignores client-sent AI and Jira secrets", () => {
    const result = validateCreateRoomInput({
      ...validPublic,
      secrets: {
        aiProvider: "openai",
        aiApiKey: "client-should-be-ignored",
        jiraSite: "https://evil.example",
        jiraEmail: "x@y.com",
        jiraToken: "tok",
      },
    });
    expect(result).toEqual({
      name: "Sprint 12",
      deck: "fibonacci",
      hostName: "Ana",
      hostAvatar: { type: "emoji", value: "🎯" },
      aiProvider: "openai",
    });
  });

  it("rejects an oversized name", () => {
    const result = validateCreateRoomInput({
      ...validPublic,
      name: "a".repeat(81),
    });
    expect(result).toEqual({ error: "Room name is required" });
  });

  it("rejects an invalid deck or avatar", () => {
    expect(
      validateCreateRoomInput({
        ...validPublic,
        deck: "poker",
      }),
    ).toEqual({ error: "Invalid deck" });

    expect(
      validateCreateRoomInput({
        ...validPublic,
        hostAvatar: { type: "gif", value: "https://evil.com/x.gif" },
      }),
    ).toEqual({ error: "Invalid host avatar" });
  });

  it("rejects a missing hostName", () => {
    expect(
      validateCreateRoomInput({
        ...validPublic,
        hostName: "   ",
      }),
    ).toEqual({ error: "Host name is required" });
  });

  it("includes optional git token when set", () => {
    const result = validateCreateRoomInput({
      ...validPublic,
      secrets: {
        aiProvider: "gemini",
        gitToken: "  gh-pat  ",
      },
    });
    expect(result).toEqual({
      name: "Sprint 12",
      deck: "fibonacci",
      hostName: "Ana",
      hostAvatar: { type: "emoji", value: "🎯" },
      aiProvider: "gemini",
      gitToken: "gh-pat",
    });
  });

  it("rejects blank optional git token", () => {
    expect(
      validateCreateRoomInput({
        ...validPublic,
        secrets: { aiProvider: "gemini", gitToken: "   " },
      }),
    ).toEqual({ error: "Invalid Git token" });
  });
});

describe("validateJoinNameAvatar", () => {
  it("requires a non-empty name and a valid avatar", () => {
    expect(
      validateJoinNameAvatar("Bob", { type: "emoji", value: "🐸" }),
    ).toEqual({ name: "Bob", avatar: { type: "emoji", value: "🐸" } });
    expect(validateJoinNameAvatar("", { type: "emoji", value: "🐸" })).toEqual({
      error: "Name and avatar are required",
    });
    expect(validateJoinNameAvatar("Bob", { type: "video", value: "x" })).toEqual(
      { error: "Name and avatar are required" },
    );
  });
});

describe("validatePlayerUpdate", () => {
  it("passes through valid partial updates", () => {
    expect(validatePlayerUpdate("Bia", undefined)).toEqual({ name: "Bia" });
    expect(
      validatePlayerUpdate(undefined, { type: "emoji", value: "🚀" }),
    ).toEqual({ avatar: { type: "emoji", value: "🚀" } });
  });

  it("rejects invalid name or avatar", () => {
    expect(validatePlayerUpdate("   ", undefined)).toEqual({
      error: "Invalid name",
    });
    expect(
      validatePlayerUpdate(undefined, { type: "gif", value: "https://evil.com/x.gif" }),
    ).toEqual({ error: "Invalid avatar" });
  });
});
