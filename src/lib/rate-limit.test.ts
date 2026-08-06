import { beforeEach, describe, expect, it } from "vitest";
import { _resetRateLimitsForTests, checkRoomRateLimit } from "./rate-limit";

beforeEach(() => _resetRateLimitsForTests());

describe("checkRoomRateLimit", () => {
  it("allows up to 10 requests per room within a window", () => {
    const now = 1_000;
    for (let i = 0; i < 10; i += 1) {
      expect(checkRoomRateLimit("ABC123", now)).toBe(true);
    }
    expect(checkRoomRateLimit("ABC123", now)).toBe(false);
  });

  it("tracks separate rooms independently", () => {
    const now = 1_000;
    for (let i = 0; i < 10; i += 1) {
      checkRoomRateLimit("ROOM1", now);
    }
    expect(checkRoomRateLimit("ROOM1", now)).toBe(false);
    expect(checkRoomRateLimit("ROOM2", now)).toBe(true);
  });

  it("resets the window after 60 seconds", () => {
    const start = 1_000;
    for (let i = 0; i < 10; i += 1) {
      checkRoomRateLimit("ABC123", start);
    }
    expect(checkRoomRateLimit("ABC123", start)).toBe(false);
    expect(checkRoomRateLimit("ABC123", start + 60_000)).toBe(true);
  });
});
