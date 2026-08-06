# Room store singleton — Design Spec

**Date:** 2026-08-06  
**Status:** Approved for implementation planning  
**Related:** `2026-08-05-smart-planning-poker-design.md`

## Goal

Fix false “Sala não encontrada ou expirada” when the host attaches Jira issues or GitHub repos while the Socket.io room is still active (voting and presence work). Root cause: Socket.io (loaded via `tsx` / `server.ts`) and Next.js App Router API routes each get a separate module instance of `room-store`, so each has its own empty-or-populated `Map`. HTTP routes call `getRoom` on an empty Map and return `"Room not found"`.

## Non-goals

- External persistence (Redis, database)
- Surviving Render free-tier hibernation / process restart
- Multi-instance sticky sessions
- Bitbucket (or non-GitHub) repository providers
- Changing public HTTP/Socket APIs or client UI copy
- Moving Jira/GitHub/AI calls onto Socket.io events

## Problem (confirmed)

| Path | Uses | Sees room? |
|------|------|------------|
| Create / join / vote / reveal | Socket handlers → `room-store` (tsx graph) | Yes |
| Import Jira, list GitHub tree, AI proxy | App Router `/api/*` → `room-store` (Next bundle) | No (empty Map) |

Symptom on Render: room stays live in the UI; only host HTTP attach/AI calls fail with translated `"Room not found"`.

Invite-link failures after hibernation/restart are a separate lifecycle issue and are out of scope for this fix.

## Decision

Store the rooms `Map` on `globalThis` so every load of `room-store` in the same Node process shares one instance.

| Topic | Choice |
|-------|--------|
| Mechanism | `globalThis` singleton for the rooms `Map` |
| Public API | Unchanged (`getRoom`, `createRoom`, `purgeExpired`, …) |
| Call sites | No changes to API routes or socket handlers |
| Tests | `_resetStoreForTests` clears the shared Map in place |

## Design

### Room store

In `src/lib/room-store.ts`:

1. Define typed global key `__smartPokerPlanningRooms` holding `Map<string, StoredRoom>`.
2. On module init: if the key exists, reuse it; otherwise create a new `Map` and assign it.
3. All existing store functions continue to read/write that Map.
4. `_resetStoreForTests()` calls `.clear()` on the shared Map (does not replace the reference), so vitest suites keep isolating state without breaking the singleton contract.

Out of scope for this change: applying the same `globalThis` pattern to `src/lib/socket/io.ts` (optional follow-up; not required to fix attach).

### Data flow (after fix)

```
Browser
  ├─ Socket.io ──► handlers ──► globalThis rooms Map ──► create/join/vote
  └─ HTTP /api/* ─► getRoom  ──► same globalThis rooms Map ──► Jira/GitHub/AI
```

### Error handling

- Unknown/expired room (truly missing from the shared Map): unchanged — `"Room not found"` → “Sala não encontrada ou expirada.”
- Invalid GitHub URL / Bitbucket URL: unchanged parse/client errors (not this bug).
- Process restart / Render sleep: rooms still lost (accepted MVP constraint).

### Testing

- Unit: after `createRoom`, a second access path to the store (or asserting the Map is the `globalThis` instance) finds the room; `_resetStoreForTests` empties it for subsequent tests.
- Existing room-store and socket handler tests should keep passing with clear-in-place reset.
- Manual on Render: create room → stay connected → attach Jira issue and GitHub repo → expect success while votes still sync.

## Success criteria

1. Host in an active room can import a Jira issue without “Sala não encontrada ou expirada.”
2. Host can attach a GitHub repo tree the same way.
3. Socket gameplay behavior unchanged.
4. Unit tests for room-store still pass in isolation.
)