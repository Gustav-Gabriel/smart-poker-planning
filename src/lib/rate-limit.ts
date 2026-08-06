const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;

export const RATE_LIMIT_MESSAGE =
  "Muitas requisições nesta sala. Aguarde um pouco e tente novamente.";

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

export function _resetRateLimitsForTests(): void {
  buckets.clear();
}

/**
 * Simple fixed-window in-memory throttle shared by the AI/Jira/GitHub host
 * routes for a given room. Returns false when the room has exceeded the
 * allowed request count for the current window.
 */
export function checkRoomRateLimit(
  roomCode: string,
  now: number = Date.now(),
): boolean {
  const bucket = buckets.get(roomCode);

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(roomCode, { count: 1, windowStart: now });
    return true;
  }

  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  bucket.count += 1;
  return true;
}
