# Room Store Singleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Socket.io and Next.js App Router API routes share one in-memory rooms `Map` via `globalThis`, so Jira/GitHub/AI HTTP calls stop returning false “Room not found” while the live room still works.

**Architecture:** Keep the existing `room-store` API. Replace the module-scoped `Map` with a singleton keyed as `globalThis.__smartPokerPlanningRooms`. `_resetStoreForTests` clears that Map in place (same reference). No changes to API routes, socket handlers, or client UI.

**Tech Stack:** TypeScript, Vitest, existing Next.js + custom `server.ts` / Socket.io process.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-06-room-store-singleton-design.md`
- No Redis/database; no Bitbucket; no Socket.io migration of Jira/GitHub/AI
- Public store API unchanged (`getRoom`, `createRoom`, `purgeExpired`, `_resetStoreForTests`, …)
- Global key name must be exactly `__smartPokerPlanningRooms`
- `_resetStoreForTests` must `.clear()` the shared Map — never replace the `globalThis` reference with a new `Map`
- Copy/UI language unchanged (Portuguese error strings stay as-is)

---

## File map

| Path | Responsibility |
|------|----------------|
| `src/lib/room-store.ts` | Own rooms state; switch to `globalThis` singleton |
| `src/lib/room-store.test.ts` | Unit tests for singleton identity + clear-in-place reset |
| `docs/superpowers/specs/2026-08-06-room-store-singleton-design.md` | Spec (read-only reference) |

No other files require changes for this fix.

---

### Task 1: Failing tests for shared Map + clear-in-place reset

**Files:**
- Modify: `src/lib/room-store.test.ts`
- Test: `src/lib/room-store.test.ts`

**Interfaces:**
- Consumes: `createRoom`, `getRoom`, `_resetStoreForTests` from `./room-store`
- Produces: two new tests that fail until Task 2 wires `globalThis.__smartPokerPlanningRooms`

- [ ] **Step 1: Add helper type + failing tests at end of `room-store.test.ts`**

Append (do not remove existing tests):

```typescript
type RoomsGlobal = typeof globalThis & {
  __smartPokerPlanningRooms?: Map<string, unknown>;
};

describe("room-store globalThis singleton", () => {
  it("stores rooms on globalThis.__smartPokerPlanningRooms", () => {
    const { room } = createRoom({
      name: "Singleton",
      deck: "fibonacci",
      hostName: "Host",
      hostAvatar: { type: "emoji", value: "👑" },
      secrets: {
        aiProvider: "openai",
        aiApiKey: "k",
        jiraSite: "https://x.atlassian.net",
        jiraEmail: "h@x.com",
        jiraToken: "t",
      },
    });

    const g = globalThis as RoomsGlobal;
    expect(g.__smartPokerPlanningRooms).toBeInstanceOf(Map);
    expect(g.__smartPokerPlanningRooms?.get(room.code)).toBeDefined();
    expect(getRoom(room.code)).toBe(g.__smartPokerPlanningRooms?.get(room.code));
  });

  it("clears the same Map reference on _resetStoreForTests", () => {
    createRoom({
      name: "Reset",
      deck: "tshirt",
      hostName: "Host",
      hostAvatar: { type: "emoji", value: "👑" },
      secrets: {
        aiProvider: "openai",
        aiApiKey: "k",
        jiraSite: "https://x.atlassian.net",
        jiraEmail: "h@x.com",
        jiraToken: "t",
      },
    });

    const g = globalThis as RoomsGlobal;
    const before = g.__smartPokerPlanningRooms;
    expect(before?.size).toBeGreaterThan(0);

    _resetStoreForTests();

    expect(g.__smartPokerPlanningRooms).toBe(before);
    expect(g.__smartPokerPlanningRooms?.size).toBe(0);
    expect(getRoom(Array.from(before?.keys() ?? [])[0] ?? "NOPE")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the new tests — expect FAIL**

Run:

```bash
npm test -- src/lib/room-store.test.ts
```

Expected: FAIL on `stores rooms on globalThis.__smartPokerPlanningRooms` because `g.__smartPokerPlanningRooms` is `undefined` (module still uses a private `const rooms = new Map()`).

- [ ] **Step 3: Commit the failing tests**

```bash
git add src/lib/room-store.test.ts
git commit -m "$(cat <<'EOF'
test: assert room-store uses globalThis singleton

EOF
)"
```

---

### Task 2: Implement `globalThis` rooms Map

**Files:**
- Modify: `src/lib/room-store.ts` (replace module-level `const rooms = new Map...` and keep `_resetStoreForTests` as `.clear()`)

**Interfaces:**
- Consumes: none new
- Produces: `rooms` bound to `globalThis.__smartPokerPlanningRooms` (`Map<string, StoredRoom>`)

- [ ] **Step 1: Replace the private Map with a globalThis singleton**

In `src/lib/room-store.ts`, after `type StoredRoom = ...`, replace:

```typescript
const rooms = new Map<string, StoredRoom>();
```

with:

```typescript
type RoomsGlobal = typeof globalThis & {
  __smartPokerPlanningRooms?: Map<string, StoredRoom>;
};

function getRoomsMap(): Map<string, StoredRoom> {
  const g = globalThis as RoomsGlobal;
  if (!g.__smartPokerPlanningRooms) {
    g.__smartPokerPlanningRooms = new Map<string, StoredRoom>();
  }
  return g.__smartPokerPlanningRooms;
}

const rooms = getRoomsMap();
```

Leave `_resetStoreForTests` as:

```typescript
export function _resetStoreForTests(): void {
  rooms.clear();
}
```

Do not change any other exported functions.

- [ ] **Step 2: Run room-store tests — expect PASS**

Run:

```bash
npm test -- src/lib/room-store.test.ts
```

Expected: all tests PASS, including the two singleton tests.

- [ ] **Step 3: Run full suite**

Run:

```bash
npm test
```

Expected: all tests PASS (socket handler tests also use `_resetStoreForTests`).

- [ ] **Step 4: Commit**

```bash
git add src/lib/room-store.ts
git commit -m "$(cat <<'EOF'
fix: share room-store Map via globalThis

Next API routes and the Socket.io server were loading separate module
instances; host Jira/GitHub attach saw an empty Map and returned Room not found.
EOF
)"
```

---

### Task 3: Manual verification notes (deploy)

**Files:** none (checklist only)

**Interfaces:**
- Consumes: deployed build that includes Task 2
- Produces: confirmation criteria from the spec

- [ ] **Step 1: Deploy or restart the Render service** on the commit that includes Task 2 so the running process picks up the change.

- [ ] **Step 2: Smoke on Render**

1. Create a room as host (with Jira + optional GitHub token filled at create).
2. Confirm voting/presence still work.
3. Import a Jira issue from the story panel — must **not** show “Sala não encontrada ou expirada.”
4. Attach a GitHub repo URL and load the tree — same expectation.
5. Optional: open the invite link in another browser/profile while the host session is still live — join should succeed if the process did not sleep/restart.

- [ ] **Step 3: Commit nothing** unless you documented results somewhere the team wants in-repo (YAGNI: skip).

---

## Spec coverage (self-review)

| Spec item | Task |
|-----------|------|
| `globalThis.__smartPokerPlanningRooms` singleton | Task 2 |
| Public API unchanged | Task 2 (no signature changes) |
| `_resetStoreForTests` clears in place | Task 1 test + Task 2 |
| No API route / handler / UI changes | File map |
| Unit test for shared Map | Task 1 |
| Manual Render attach while room live | Task 3 |
| Non-goals (Redis, Bitbucket, hibernation) | Explicitly out of plan |

No placeholders remaining. Types/key name consistent across tasks.
