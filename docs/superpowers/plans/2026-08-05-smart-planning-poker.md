# Smart Planning Poker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a real-time Planning Poker web app with Jira import, GitHub path selection, multi-provider AI suggestions (summary on reveal + deep analysis on demand), ephemeral in-memory rooms, and a free one-service deploy path.

**Architecture:** Next.js App Router UI + HTTP APIs and a custom Node server that mounts Socket.io beside Next. Room state lives in a process-local `Map`; host secrets stay server-side; clients keep identity in `sessionStorage` and rejoin by `roomCode` + `playerId`. Host HTTP calls authenticate with a `hostToken` issued at room creation.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Socket.io, Vitest, custom `server.ts` via `tsx`, Tenor API, Jira REST, GitHub REST, OpenAI/Gemini/Claude HTTP APIs.

## Global Constraints

- No database — in-memory rooms only; restart clears sessions
- Host-only: story/repo/reveal/AI/config
- Deck: Fibonacci or T-shirt at room create
- AI: host chooses `openai` | `gemini` | `claude` + API key
- AI timing: short summary on reveal; deep analysis on host button
- Visual identity: white, purple, medium-dark gray; expressive fonts (not Inter/Roboto/Arial/system)
- Repo attach: GitHub URL + selected paths; caps 40 files / 40KB each / 200KB total prompt text
- Host auth for HTTP: `hostToken` (random 32-byte hex) stored in room secrets; client keeps it in `sessionStorage` only for host
- Copy/UI language: Portuguese (Brazil)
- Spec: `docs/superpowers/specs/2026-08-05-smart-planning-poker-design.md`

---

## File map

| Path | Responsibility |
|------|----------------|
| `package.json` | Scripts: `dev` (tsx server), `build`, `start`, `test` |
| `tsconfig.json` | TypeScript + path alias `@/*` → `src/*` |
| `next.config.ts` | Next config; `output` default (Node server) |
| `server.ts` | HTTP server + Next handler + Socket.io |
| `vitest.config.ts` | Unit test config |
| `src/lib/types.ts` | Shared domain types |
| `src/lib/decks.ts` | Deck card lists |
| `src/lib/room-store.ts` | In-memory room CRUD + game transitions |
| `src/lib/room-snapshot.ts` | Safe client snapshot (hide secrets/votes) |
| `src/lib/host-auth.ts` | `assertHost(roomCode, hostToken)` |
| `src/lib/session-client.ts` | Browser `sessionStorage` helpers |
| `src/lib/jira/adf.ts` | ADF → plain text |
| `src/lib/jira/client.ts` | Fetch issue from Jira |
| `src/lib/github/parse-url.ts` | Parse GitHub repo URL |
| `src/lib/github/client.ts` | Tree + file contents with caps |
| `src/lib/ai/prompts.ts` | System/user prompts |
| `src/lib/ai/parse.ts` | Parse/validate AI JSON |
| `src/lib/ai/providers.ts` | OpenAI / Gemini / Claude callers |
| `src/lib/tenor/client.ts` | Tenor search |
| `src/lib/socket/handlers.ts` | Socket event registration |
| `src/lib/socket/client.ts` | Browser socket singleton |
| `src/app/globals.css` | Design tokens + base styles |
| `src/app/layout.tsx` | Root layout + fonts |
| `src/app/page.tsx` | Landing |
| `src/app/create/page.tsx` | Create room form |
| `src/app/room/[code]/page.tsx` | Join gate + game room |
| `src/app/api/**/route.ts` | Tenor, Jira, GitHub, AI routes |
| `src/components/**` | UI components |
| `src/lib/**/*.test.ts` | Vitest unit tests |
| `README.md` | Local run + free deploy (Render/Railway) |

---

### Task 1: Scaffold Next.js project + Vitest

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.gitignore`, `.env.example`
- Test: smoke that `npm test` runs

**Interfaces:**
- Produces: runnable Next app scripts; `@/*` path alias

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "smart-poker-planning",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch server.ts",
    "build": "next build",
    "start": "NODE_ENV=production tsx server.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "^15.4.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "socket.io": "^4.8.1",
    "socket.io-client": "^4.8.1",
    "nanoid": "^5.1.5"
  },
  "devDependencies": {
    "@types/node": "^22.15.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "tsx": "^4.20.0",
    "typescript": "^5.8.0",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore`, minimal app shell**

`tsconfig.json` — `"paths": { "@/*": ["./src/*"] }`, `"strict": true`.

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node" },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

`.gitignore`: `node_modules`, `.next`, `.env`, `.env.local`, `coverage`.

`.env.example`:

```
TENOR_API_KEY=
PORT=3000
```

`src/app/layout.tsx` — import fonts from `next/font/google` using **Outfit** (UI) + **Fraunces** (display). Set CSS variables. Brand title in metadata: `Smart Planning Poker`.

`src/app/globals.css` — tokens:

```css
:root {
  --color-bg: #ffffff;
  --color-purple: #6d28d9;
  --color-purple-soft: #ede9fe;
  --color-gray: #3f3f46;
  --color-gray-muted: #71717a;
  --font-sans: var(--font-outfit), sans-serif;
  --font-display: var(--font-fraunces), Georgia, serif;
}
```

`src/app/page.tsx` — temporary “Smart Planning Poker” heading (replaced in Task 8).

- [ ] **Step 3: Install and verify tests harness**

Run: `npm install && npm test`  
Expected: Vitest exits 0 with “No test files found” **or** add `src/lib/smoke.test.ts`:

```ts
import { expect, test } from "vitest";
test("harness works", () => expect(1 + 1).toBe(2));
```

Run: `npm test` → PASS

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts vitest.config.ts .gitignore .env.example src
git commit -m "chore: scaffold Next.js app with Vitest"
```

---

### Task 2: Domain types, decks, room store (TDD)

**Files:**
- Create: `src/lib/types.ts`, `src/lib/decks.ts`, `src/lib/room-store.ts`, `src/lib/room-snapshot.ts`, `src/lib/room-store.test.ts`

**Interfaces:**
- Produces:
  - `createRoom(input): { room, hostToken, player }`
  - `joinRoom(code, input): { room, player } | error`
  - `castVote(code, playerId, value)`
  - `revealVotes(code, hostToken)`
  - `resetVotes(code, hostToken)`
  - `setStory / setRepos / touchRoom / getRoom / purgeExpired`
  - `toClientSnapshot(room, viewerId): ClientRoomSnapshot`
  - `assertHost(room, hostToken): boolean`

- [ ] **Step 1: Write failing tests in `src/lib/room-store.test.ts`**

```ts
import { describe, expect, it, beforeEach } from "vitest";
import {
  createRoom,
  joinRoom,
  castVote,
  revealVotes,
  resetVotes,
  rejoinRoom,
  getRoom,
  _resetStoreForTests,
} from "./room-store";
import { toClientSnapshot } from "./room-snapshot";

beforeEach(() => _resetStoreForTests());

describe("room-store", () => {
  it("creates a room with host and hostToken", () => {
    const { room, hostToken, player } = createRoom({
      name: "Sprint 12",
      deck: "fibonacci",
      hostName: "Ana",
      hostAvatar: { type: "emoji", value: "🎯" },
      secrets: {
        aiProvider: "openai",
        aiApiKey: "sk-test",
        jiraSite: "https://acme.atlassian.net",
        jiraEmail: "ana@acme.com",
        jiraToken: "jira-token",
        githubToken: undefined,
      },
    });
    expect(room.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(hostToken).toHaveLength(64);
    expect(player.isHost).toBe(true);
    expect(getRoom(room.code)?.players.size).toBe(1);
  });

  it("joins, votes hidden until reveal, then resets", () => {
    const created = createRoom({
      name: "R",
      deck: "fibonacci",
      hostName: "Host",
      hostAvatar: { type: "emoji", value: "👑" },
      secrets: {
        aiProvider: "gemini",
        aiApiKey: "k",
        jiraSite: "https://x.atlassian.net",
        jiraEmail: "h@x.com",
        jiraToken: "t",
      },
    });
    const joined = joinRoom(created.room.code, {
      name: "Bob",
      avatar: { type: "emoji", value: "🐸" },
    });
    if ("error" in joined) throw new Error(joined.error);
    castVote(created.room.code, created.player.id, "5");
    castVote(created.room.code, joined.player.id, "8");

    const hidden = toClientSnapshot(getRoom(created.room.code)!, joined.player.id);
    expect(hidden.players.find((p) => p.id === created.player.id)?.vote).toBeNull();
    expect(hidden.players.find((p) => p.id === joined.player.id)?.vote).toBe("8");
    expect(hidden.revealed).toBe(false);

    const revealed = revealVotes(created.room.code, created.hostToken);
    expect(revealed.ok).toBe(true);
    const shown = toClientSnapshot(getRoom(created.room.code)!, joined.player.id);
    expect(shown.revealed).toBe(true);
    expect(shown.players.find((p) => p.id === created.player.id)?.vote).toBe("5");

    resetVotes(created.room.code, created.hostToken);
    expect(getRoom(created.room.code)!.revealed).toBe(false);
    expect(getRoom(created.room.code)!.players.get(created.player.id)!.vote).toBeNull();
  });

  it("rejoins by playerId", () => {
    const created = createRoom({
      name: "R",
      deck: "tshirt",
      hostName: "Host",
      hostAvatar: { type: "emoji", value: "👑" },
      secrets: {
        aiProvider: "claude",
        aiApiKey: "k",
        jiraSite: "https://x.atlassian.net",
        jiraEmail: "h@x.com",
        jiraToken: "t",
      },
    });
    const again = rejoinRoom(created.room.code, created.player.id);
    expect(again.ok).toBe(true);
    expect(again.player?.isHost).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm test src/lib/room-store.test.ts`  
Expected: FAIL (modules missing)

- [ ] **Step 3: Implement types, decks, store, snapshot**

`src/lib/types.ts` — copy domain types from the spec; add:

```ts
export type AiProvider = "openai" | "gemini" | "claude";
export type RoomSecrets = {
  hostToken: string;
  aiProvider: AiProvider;
  aiApiKey: string;
  jiraSite: string;
  jiraEmail: string;
  jiraToken: string;
  githubToken?: string;
};
export type ClientPlayer = Omit<Player, never> & { hasVoted: boolean };
export type ClientRoomSnapshot = {
  code: string;
  name: string;
  deck: DeckType;
  hostId: string;
  players: Array<{
    id: string;
    name: string;
    avatar: Player["avatar"];
    isHost: boolean;
    connected: boolean;
    hasVoted: boolean;
    vote: string | null; // null for others when !revealed
  }>;
  story: Story | null;
  repos: RepoAttachment[];
  revealed: boolean;
  suggestions: AiSuggestion[];
  deckCards: string[];
};
```

`src/lib/decks.ts`:

```ts
export const FIBONACCI = ["0", "1", "2", "3", "5", "8", "13", "21", "?", "☕"];
export const TSHIRT = ["XS", "S", "M", "L", "XL", "?", "☕"];
export function cardsFor(deck: "fibonacci" | "tshirt") {
  return deck === "fibonacci" ? FIBONACCI : TSHIRT;
}
```

`src/lib/room-store.ts` — module-level `Map<string, RoomState & { secrets: RoomSecrets }>`. Room codes: 6 chars `A-Z0-9` via `nanoid` custom alphabet. `hostToken`: `randomBytes(32).toString("hex")`. Soft max 20 players. `purgeExpired(now)` drops rooms idle > 2h. Export `_resetStoreForTests` clearing the Map.

`src/lib/room-snapshot.ts` — `toClientSnapshot(room, viewerId)` omits secrets; for each player, if `!room.revealed && player.id !== viewerId`, set `vote: null` and expose `hasVoted: player.vote !== null`.

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm test src/lib/room-store.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/decks.ts src/lib/room-store.ts src/lib/room-snapshot.ts src/lib/room-store.test.ts
git commit -m "feat: add in-memory room store and client snapshots"
```

---

### Task 3: Custom server + Socket.io handlers

**Files:**
- Create: `server.ts`, `src/lib/socket/handlers.ts`, `src/lib/host-auth.ts`
- Test: extend room tests if needed; manual smoke later

**Interfaces:**
- Produces: Socket events from spec (`room:create`, `room:join`, `vote:*`, `story:set`, `repo:set`, `ai:deep:request` triggers client→server which kicks HTTP internally or client calls API)
- Decision: AI summary triggered inside `vote:reveal` handler (server calls AI helper asynchronously and emits `ai:summary`); deep analysis via HTTP `POST /api/ai/deep` then broadcast through `getIO().to(room).emit("ai:deep", ...)` — export `setIO`/`getIO` from `server.ts` or `src/lib/socket/io.ts`

- [ ] **Step 1: Implement `src/lib/host-auth.ts`**

```ts
import { getRoom } from "./room-store";

export function assertHost(roomCode: string, hostToken: string): boolean {
  const room = getRoom(roomCode);
  return Boolean(room && room.secrets.hostToken === hostToken);
}
```

- [ ] **Step 2: Implement `src/lib/socket/handlers.ts`**

Register on `Server` from `socket.io`:

- `room:create` → `createRoom` → join socket to `room.code` → ack `{ room: snapshot, player, hostToken }`
- `room:join` → join/rejoin → ack snapshot
- `vote:cast` / `vote:reveal` / `vote:reset` / `story:set` / `repo:set` / `player:update` / `room:leave`
- On disconnect: mark `connected: false`, broadcast snapshot
- After successful `vote:reveal`, fire-and-forget summary generation (stub emit `{ status: "pending" }` until Task 6 wires real AI)

Broadcast helper: `io.to(code).emit("room:state", toClientSnapshot(room, /* per-socket viewer */))` — because votes are viewer-specific, either emit personalized state to each socket or emit a public state + let each client merge own vote. **Chosen approach:** keep a `socket.data = { roomCode, playerId }` and emit personalized `room:state` to each socket in the room via loop `for (const s of await io.in(code).fetchSockets())`.

- [ ] **Step 3: Implement `server.ts`**

```ts
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./src/lib/socket/handlers";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer, { path: "/api/socket" });
  registerSocketHandlers(io);
  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
```

- [ ] **Step 4: Verify server starts**

Run: `npm run dev`  
Expected: log `Ready on http://localhost:3000`; open `/` shows landing shell. Stop after check.

- [ ] **Step 5: Commit**

```bash
git add server.ts src/lib/socket/handlers.ts src/lib/host-auth.ts src/lib/socket/io.ts
git commit -m "feat: add Socket.io server and room event handlers"
```

---

### Task 4: Jira ADF + client (TDD) and API route

**Files:**
- Create: `src/lib/jira/adf.ts`, `src/lib/jira/adf.test.ts`, `src/lib/jira/client.ts`, `src/app/api/jira/issue/route.ts`

**Interfaces:**
- Produces: `adfToPlainText(node: unknown): string`, `fetchJiraIssue({ site, email, token, issueKeyOrUrl }): Story`, `POST /api/jira/issue` body `{ roomCode, hostToken, issueKeyOrUrl }`

- [ ] **Step 1: Failing ADF tests**

```ts
import { describe, expect, it } from "vitest";
import { adfToPlainText } from "./adf";

describe("adfToPlainText", () => {
  it("flattens paragraphs and text", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello " },
            { type: "text", text: "world" },
          ],
        },
      ],
    };
    expect(adfToPlainText(doc)).toBe("Hello world");
  });

  it("returns string descriptions unchanged", () => {
    expect(adfToPlainText("plain")).toBe("plain");
  });
});
```

- [ ] **Step 2: Implement recursive ADF walker + Jira client**

`fetchJiraIssue`: parse key from URL with regex `/([A-Z][A-Z0-9]+-\d+)/`; `GET {site}/rest/api/3/issue/{key}?fields=summary,description,status,issuetype,labels`; Basic auth `Buffer.from(`${email}:${token}`).toString("base64")`. Map to `Story`. Throw typed errors for 401/404.

- [ ] **Step 3: API route**

Validate `assertHost`; load secrets from room; call `fetchJiraIssue`; return JSON Story. Do **not** call `story:set` here — client emits `story:set` after success (keeps socket as source of truth).

- [ ] **Step 4: `npm test src/lib/jira/adf.test.ts` → PASS; commit**

```bash
git add src/lib/jira src/app/api/jira
git commit -m "feat: add Jira issue import via REST API"
```

---

### Task 5: GitHub parse URL, tree, contents (TDD) + API routes

**Files:**
- Create: `src/lib/github/parse-url.ts`, `src/lib/github/parse-url.test.ts`, `src/lib/github/client.ts`, `src/app/api/github/tree/route.ts`, `src/app/api/github/contents/route.ts`

**Interfaces:**
- Produces: `parseGithubUrl(url) => { owner, repo }`, `listRepoTree(...)`, `fetchSelectedContents(paths) => { files: {path, content}[], omitted: string[] }`
- Caps: max 40 files, 40_960 bytes/file, 204_800 bytes total

- [ ] **Step 1: Failing parse-url tests**

```ts
import { expect, it } from "vitest";
import { parseGithubUrl } from "./parse-url";

it("parses https github urls", () => {
  expect(parseGithubUrl("https://github.com/acme/api")).toEqual({
    owner: "acme",
    repo: "api",
  });
});

it("strips .git suffix", () => {
  expect(parseGithubUrl("https://github.com/acme/api.git").repo).toBe("api");
});
```

- [ ] **Step 2: Implement client**

Use GitHub REST: repo → default_branch; `git/trees/{sha}?recursive=1`; contents API or raw blob for files. Honor optional `Authorization: Bearer ${token}`. Apply caps; push overflow paths to `omitted`.

- [ ] **Step 3: Routes**

- `GET /api/github/tree?roomCode&hostToken&url`
- `POST /api/github/contents` `{ roomCode, hostToken, url, ref, paths: string[] }`

Both require `assertHost`.

- [ ] **Step 4: Tests PASS; commit**

```bash
git add src/lib/github src/app/api/github
git commit -m "feat: add GitHub tree listing and capped file fetch"
```

---

### Task 6: AI prompts, parse, providers + API + reveal hook

**Files:**
- Create: `src/lib/ai/prompts.ts`, `src/lib/ai/parse.ts`, `src/lib/ai/parse.test.ts`, `src/lib/ai/providers.ts`, `src/app/api/ai/summary/route.ts`, `src/app/api/ai/deep/route.ts`
- Modify: `src/lib/socket/handlers.ts` (call summary after reveal)

**Interfaces:**
- Produces: `parseAiJson(text) => AiSuggestion["payload"]`, `runSummary(...)`, `runDeepAnalysis(...)`
- System prompt must instruct: prioritize repository code evidence; Jira = intent; vote spread = uncertainty; answer in Portuguese; return JSON only

- [ ] **Step 1: Failing parse tests**

```ts
import { expect, it } from "vitest";
import { parseAiJson } from "./parse";

it("parses fenced json", () => {
  const raw = "```json\n{\"consensusNote\":\"ok\",\"discussionPoints\":[\"a\"]}\n```";
  const parsed = parseAiJson(raw, "summary");
  expect(parsed.consensusNote).toBe("ok");
  expect(parsed.discussionPoints).toEqual(["a"]);
});
```

- [ ] **Step 2: Implement providers**

Shared `chatCompletion({ provider, apiKey, system, user })`:

- openai: `POST https://api.openai.com/v1/chat/completions` model `gpt-4o-mini`
- gemini: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=`
- claude: `POST https://api.anthropic.com/v1/messages` model `claude-3-5-haiku-latest`, header `anthropic-version: 2023-06-01`

Deep route: load room secrets + story + votes; `fetchSelectedContents` for `room.repos`; build prompt; parse; append to `room.suggestions`; broadcast `ai:deep`.

Summary: lighter prompt without repo bodies; append suggestion; broadcast `ai:summary`. On failure emit `{ error: string }` without throwing to clients' vote state.

- [ ] **Step 3: Wire reveal → summary** in socket handler (async, catch errors).

- [ ] **Step 4: Tests PASS; commit**

```bash
git add src/lib/ai src/app/api/ai src/lib/socket/handlers.ts
git commit -m "feat: add multi-provider AI summary and deep analysis"
```

---

### Task 7: Tenor proxy + session helpers + socket client

**Files:**
- Create: `src/lib/tenor/client.ts`, `src/app/api/tenor/search/route.ts`, `src/lib/session-client.ts`, `src/lib/socket/client.ts`

**Interfaces:**
- Produces: `searchTenor(q)`, `saveSession / loadSession / clearSession`, `getSocket()`

- [ ] **Step 1: Implement Tenor client**

`GET https://tenor.googleapis.com/v2/search?q=&key=&limit=16&media_filter=gif`  
Route: `GET /api/tenor/search?q=` using `process.env.TENOR_API_KEY`. If missing, return `503` with Portuguese message.

- [ ] **Step 2: `session-client.ts`**

Keys: `spp:roomCode`, `spp:playerId`, `spp:hostToken`, `spp:name`, `spp:avatar`.

- [ ] **Step 3: `socket/client.ts`**

```ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
export function getSocket() {
  if (!socket) {
    socket = io({ path: "/api/socket", autoConnect: true });
  }
  return socket;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/tenor src/app/api/tenor src/lib/session-client.ts src/lib/socket/client.ts
git commit -m "feat: add Tenor proxy, session storage, and socket client"
```

---

### Task 8: Landing + create room UI

**Files:**
- Modify: `src/app/page.tsx`, `src/app/globals.css`, `src/app/layout.tsx`
- Create: `src/app/create/page.tsx`, `src/components/create-room-form.tsx`, `src/components/ui/button.tsx`, `src/components/ui/field.tsx`

**Interfaces:**
- Consumes: `room:create` via socket; saves session; navigates to `/room/[code]`

- [ ] **Step 1: Landing composition**

First viewport: brand “Smart Planning Poker” (display font, hero-level), one short supporting sentence about AI-assisted planning with repos/Jira, CTA group “Criar sala” / “Entrar com código”, atmospheric white→purple/gray gradient background (no card grid, no stat strips).

- [ ] **Step 2: Create form fields**

Room name, deck select, AI provider + API key, Jira site/email/token, optional GitHub token, host name + emoji default avatar. On submit → socket `room:create` → persist session including `hostToken` → `router.push(/room/${code})`.

- [ ] **Step 3: Manual check `npm run dev`** — form submits and lands on room URL (join UI may still be stub).

- [ ] **Step 4: Commit**

```bash
git add src/app src/components
git commit -m "feat: add landing and create-room flow"
```

---

### Task 9: Join gate (name + emoji/GIF) + game room UI

**Files:**
- Create: `src/components/avatar-picker.tsx`, `src/components/join-panel.tsx`, `src/components/room/participants.tsx`, `src/components/room/vote-deck.tsx`, `src/components/room/story-panel.tsx`, `src/components/room/host-controls.tsx`, `src/components/room/suggestions-panel.tsx`, `src/components/room/game-room.tsx`
- Modify: `src/app/room/[code]/page.tsx`

**Interfaces:**
- Consumes: socket events + HTTP APIs from Tasks 4–7
- Produces: full playable room UX in PT-BR

- [ ] **Step 1: Join panel**

If no session player for this code → show name + `AvatarPicker` (emoji grid + Tenor search). Emit `room:join`. Offer rejoin banner when `sessionStorage` has same code+playerId.

- [ ] **Step 2: Game room**

- Participants with vote status
- Story panel + host Jira import input
- Host repo URL → fetch tree → multi-select paths → `repo:set`
- Vote deck from `deckCards`
- Host Reveal / Nova rodada / Análise profunda
- Suggestions panel for summary + deep sections
- Errors inline (Jira/AI/GitHub) without blocking votes

- [ ] **Step 3: Two-browser manual test**

Create room → join second profile → vote → reveal → see summary pending/error without key → with key see points. Deep analysis with public repo paths.

- [ ] **Step 4: Commit**

```bash
git add src/app/room src/components
git commit -m "feat: add join gate and real-time planning poker room UI"
```

---

### Task 10: README + deploy polish + room TTL sweep

**Files:**
- Create: `README.md`
- Modify: `server.ts` (interval `purgeExpired` every 10 min), `.env.example`

- [ ] **Step 1: TTL sweep in `server.ts`**

```ts
setInterval(() => {
  purgeExpired(Date.now());
}, 10 * 60 * 1000);
```

- [ ] **Step 2: Write README (PT-BR)** covering:

1. `npm install`, set `TENOR_API_KEY`, `npm run dev`
2. How host pastes AI/Jira/GitHub keys in UI
3. Deploy on **Render** or **Railway**: connect repo, build `npm install && npm run build`, start `npm start`, env `TENOR_API_KEY`, instance must stay awake for WebSockets
4. Why not Vercel-only for MVP
5. Security note: keys live only in server memory for the room lifetime

- [ ] **Step 3: Final verification**

Run: `npm test && npm run build`  
Expected: tests pass; Next build succeeds.

- [ ] **Step 4: Commit**

```bash
git add README.md server.ts .env.example
git commit -m "docs: add local setup and free deploy guide"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Next + Socket.io monolith | 1, 3 |
| In-memory rooms + sessionStorage rejoin | 2, 7, 9 |
| Fibonacci / T-shirt | 2, 8 |
| Host-only controls | 2, 3, 9 |
| Jira REST import | 4, 9 |
| GitHub URL + path select + caps | 5, 9 |
| Multi-provider AI | 6 |
| Summary on reveal + deep on button | 6, 9 |
| Tenor GIFs + emoji | 7, 9 |
| White/purple/gray brand landing | 8 |
| Errors non-blocking | 6, 9 |
| README free deploy | 10 |
| Room TTL ~2h | 2, 10 |
| No DB | Global / store |

**Resolved open details:** `hostToken` auth; hand-rolled ADF flatten; caps 40 / 40KB / 200KB.

**Placeholder scan:** none intentional.  
**Type consistency:** `AiSuggestion`, `Story`, `RepoAttachment`, `ClientRoomSnapshot` shared from `types.ts`.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-05-smart-planning-poker.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
