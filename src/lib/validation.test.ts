import { describe, expect, it } from "vitest";
import {
  clampString,
  isValidAvatar,
  isValidVoteValue,
  validateCreateRoomInput,
  validateJoinNameAvatar,
  validatePlayerUpdate,
} from "./validation";

const validSecrets = {
  aiProvider: "openai",
  aiApiKey: "sk-test",
  jiraSite: "https://acme.atlassian.net",
  jiraEmail: "ana@acme.com",
  jiraToken: "jira-token",
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
  it("accepts a well-formed payload", () => {
    const result = validateCreateRoomInput({
      name: "Sprint 12",
      deck: "fibonacci",
      hostName: "Ana",
      hostAvatar: { type: "emoji", value: "🎯" },
      secrets: validSecrets,
    });
    expect("error" in result).toBe(false);
  });

  it("rejects an oversized name", () => {
    const result = validateCreateRoomInput({
      name: "a".repeat(81),
      deck: "fibonacci",
      hostName: "Ana",
      hostAvatar: { type: "emoji", value: "🎯" },
      secrets: validSecrets,
    });
    expect(result).toEqual({ error: "Room name is required" });
  });

  it("rejects an oversized secret", () => {
    const result = validateCreateRoomInput({
      name: "Sprint 12",
      deck: "fibonacci",
      hostName: "Ana",
      hostAvatar: { type: "emoji", value: "🎯" },
      secrets: { ...validSecrets, aiApiKey: "a".repeat(513) },
    });
    expect(result).toEqual({ error: "AI API key is required" });
  });

  it("rejects an invalid deck or avatar", () => {
    expect(
      validateCreateRoomInput({
        name: "Sprint 12",
        deck: "poker",
        hostName: "Ana",
        hostAvatar: { type: "emoji", value: "🎯" },
        secrets: validSecrets,
      }),
    ).toEqual({ error: "Invalid deck" });

    expect(
      validateCreateRoomInput({
        name: "Sprint 12",
        deck: "fibonacci",
        hostName: "Ana",
        hostAvatar: { type: "gif", value: "https://evil.com/x.gif" },
        secrets: validSecrets,
      }),
    ).toEqual({ error: "Invalid host avatar" });
  });

  it("rejects a missing hostName", () => {
    expect(
      validateCreateRoomInput({
        name: "Sprint 12",
        deck: "fibonacci",
        hostName: "   ",
        hostAvatar: { type: "emoji", value: "🎯" },
        secrets: validSecrets,
      }),
    ).toEqual({ error: "Host name is required" });
  });

  it("includes optional git token and Bitbucket username when set", () => {
    const result = validateCreateRoomInput({
      name: "Sprint 12",
      deck: "fibonacci",
      hostName: "Ana",
      hostAvatar: { type: "emoji", value: "🎯" },
      secrets: {
        ...validSecrets,
        gitToken: "  app-password  ",
        bitbucketUsername: "  ana  ",
      },
    });
    expect(result).toMatchObject({
      secrets: {
        gitToken: "app-password",
        bitbucketUsername: "ana",
      },
    });
  });

  it("rejects blank optional Bitbucket username", () => {
    expect(
      validateCreateRoomInput({
        name: "Sprint 12",
        deck: "fibonacci",
        hostName: "Ana",
        hostAvatar: { type: "emoji", value: "🎯" },
        secrets: { ...validSecrets, bitbucketUsername: "   " },
      }),
    ).toEqual({ error: "Invalid Bitbucket username" });
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
