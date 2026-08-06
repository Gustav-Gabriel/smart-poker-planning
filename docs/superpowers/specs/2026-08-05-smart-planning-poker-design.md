# Smart Planning Poker — Design Spec

**Date:** 2026-08-05  
**Status:** Approved for implementation planning  
**Working title:** Smart Planning Poker

## Goal

Build a real-time Planning Poker web app (similar in game flow to [wictorChaves/planningPoker](https://github.com/wictorChaves/planningPoker)) with AI-assisted planning review. After votes are revealed, the app surfaces short discussion prompts and, on demand, a deep analysis grounded in attached repository paths and Jira issue context—highlighting risks, gaps, and details teams often miss during estimation.

## Non-goals

- Persistent database or long-term history of sessions
- User accounts / SSO
- Billing or multi-tenant SaaS admin
- Full IDE-style repo browsing
- Automatic writing back to Jira (read-only Jira integration in MVP)

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Architecture | Monolith: Next.js + custom Node server with Socket.io |
| Persistence | In-memory room state only; client identity in `sessionStorage` |
| Room rejoin | Stable room code/link while server process is alive |
| Repo attach | GitHub URL + host selects relevant folders/files |
| Jira | Real REST API (site + email + API token) |
| AI | Multi-provider: OpenAI, Gemini, Claude — host supplies key |
| AI timing | Hybrid: short summary on reveal; deep analysis on host button |
| Permissions | Host-only for story/repo/reveal/AI/config |
| Deck | Fibonacci or T-shirt (host chooses at room create) |
| Avatars | Emoji picker or GIF search via Tenor (Google) |
| Visual identity | White, purple, medium-dark gray |

## Architecture

### Stack

- **Next.js (App Router)** — UI and HTTP API routes (Jira fetch, GitHub tree/content, AI proxy, Tenor proxy)
- **Custom Node server** — boots Next and Socket.io in one process
- **In-memory store** — `Map<roomCode, RoomState>`
- **Client storage** — `sessionStorage` for `playerId`, `roomCode`, display name, avatar, host flag

### Why one process

Keeps deploy simple and free: one Web Service on Render, Railway, or Fly.io. WebSockets and ephemeral room state live together. Restart clears rooms (accepted).

### High-level flow

```
Browser (Next.js UI)
  ├─ Socket.io ──► Room engine (votes, reveal, presence, broadcast)
  └─ HTTP ───────► API routes
                     ├─ Jira REST (host credentials in room memory)
                     ├─ GitHub Contents/Git Trees API
                     ├─ AI provider (OpenAI / Gemini / Claude)
                     └─ Tenor GIF search
```

Host credentials (AI key, Jira token, optional GitHub token) are stored only in server memory for that room and never broadcast to other clients.

## UX / Screens

### Home

- Brand-forward landing (white / purple / medium-dark gray)
- Actions: Create room / Join with code

### Create room (host)

- Room name
- Deck: Fibonacci (`0, 1, 2, 3, 5, 8, 13, 21, ?, ☕`) or T-shirt (`XS, S, M, L, XL, ?, ☕`)
- AI provider + API key
- Jira: site URL, email, API token
- Optional GitHub token (private repos / higher rate limits)
- Result: shareable room code + link

### Join room

- Display name (required)
- Avatar: emoji grid or Tenor GIF search
- Rejoin: if `sessionStorage` has matching `roomCode` + `playerId`, offer resume

### Game room

- Participant list: avatar, name, vote status (waiting / voted); values hidden until reveal
- Active story panel: Jira key, title, description summary, link
- Host controls: import Jira issue, attach repo + select paths, reveal, reset/next round, deep AI analysis
- Player controls: pick a card
- After reveal: face-up votes, average/mode when numeric, short AI summary, entry point to deep suggestions

### Suggestions UI

- Short summary cards always after successful auto-summary
- Deep analysis panel: structured sections (risks, unplanned work, relevant files, open questions, estimate tension notes)
- Failures show actionable errors without blocking the poker flow

## Domain model (in-memory)

```ts
type DeckType = "fibonacci" | "tshirt";

type Player = {
  id: string;
  name: string;
  avatar: { type: "emoji" | "gif"; value: string };
  isHost: boolean;
  connected: boolean;
  vote: string | null;
};

type RepoAttachment = {
  url: string;
  owner: string;
  repo: string;
  ref: string;
  selectedPaths: string[];
};

type Story = {
  jiraKey: string;
  jiraUrl: string;
  title: string;
  description: string;
  labels: string[];
  issueType?: string;
  status?: string;
};

type AiSuggestion = {
  kind: "summary" | "deep";
  createdAt: number;
  payload: {
    consensusNote: string;
    discussionPoints: string[];
    risks?: string[];
    unplannedWork?: string[];
    relevantFiles?: { path: string; reason: string }[];
    openQuestions?: string[];
    estimateTension?: string;
  };
};

type RoomState = {
  code: string;
  name: string;
  deck: DeckType;
  hostId: string;
  players: Map<string, Player>;
  story: Story | null;
  repos: RepoAttachment[];
  revealed: boolean;
  suggestions: AiSuggestion[];
  lastActivityAt: number;
  // secrets kept server-side only, never in client snapshots:
  // aiProvider, aiApiKey, jiraSite, jiraEmail, jiraToken, githubToken
};
```

Client snapshots omit secrets and hide vote values until `revealed === true` (except the player's own vote).

## Realtime protocol (Socket.io)

| Event | Direction | Purpose |
|-------|-----------|---------|
| `room:create` | C→S | Create room with config; returns code + host player |
| `room:join` | C→S | Join/rejoin with name, avatar, optional playerId |
| `room:leave` | C→S | Mark disconnected / remove if intentional leave |
| `room:state` | S→C | Full safe snapshot |
| `player:update` | C→S | Update name/avatar |
| `story:set` | C→S (host) | Set active story from Jira payload |
| `repo:set` | C→S (host) | Set selected repo paths |
| `vote:cast` | C→S | Cast/change vote while hidden |
| `vote:reveal` | C→S (host) | Reveal votes; may trigger summary job |
| `vote:reset` | C→S (host) | Clear votes for next round |
| `ai:summary` | S→C | Broadcast short summary result/error |
| `ai:deep` | S→C | Broadcast deep analysis result/error |

Reconnection: client sends `roomCode` + `playerId`; server restores seat if room still exists.

## HTTP API (Next route handlers)

- `GET /api/tenor/search?q=` — proxy Tenor (server `TENOR_API_KEY`)
- `POST /api/jira/issue` — host session/room auth pattern: body includes `roomCode` + issue key/URL; server uses room Jira credentials
- `GET /api/github/tree` — list repo tree for path picker
- `POST /api/github/contents` — fetch selected file contents (size-capped)
- `POST /api/ai/summary` — short post-reveal analysis
- `POST /api/ai/deep` — deep analysis with repo excerpts + Jira + votes

Room-scoped secret access is validated via Socket-linked host token or short-lived room host capability stored in memory (implementation detail left to plan: prefer host socket session id bound to room).

## Jira integration

- Auth: Atlassian API token + email + site base URL (`https://xxx.atlassian.net`)
- Import by issue key (`PROJ-123`) or browse URL
- Fields used: key, summary, description (ADF→plain text), issuetype, status, labels, optionally acceptance criteria custom field if present as text
- Read-only in MVP

## Repository analysis

1. Host pastes GitHub repo URL
2. Server resolves default branch and file tree
3. Host selects folders/files
4. On deep analysis, server fetches file texts with hard caps:
   - Max files (e.g. 40)
   - Max bytes per file (e.g. 40KB)
   - Max total prompt context (e.g. ~200KB text)
5. Omitted files are listed in the UI warning

Focus of AI system instructions: prioritize repository structure and code evidence; use Jira as intent; use vote dispersion as uncertainty signal.

## AI behavior

### Providers

Host selects one of: `openai` | `gemini` | `claude`, plus API key. Server adapts chat/completions calls per provider.

### On reveal (summary)

Input: story title/description, vote list, deck type.  
Output JSON:

- `consensusNote`
- `discussionPoints` (3–5)

No full repo read.

### Deep analysis (host button)

Input: Jira story, selected repo excerpts, votes, optional prior summary.  
Output JSON:

- `consensusNote`
- `discussionPoints`
- `risks`
- `unplannedWork`
- `relevantFiles[]` (`path`, `reason`)
- `openQuestions`
- `estimateTension`

Poker gameplay must continue if AI calls fail.

## Permissions

- Host: create config, import Jira, attach repos, reveal, reset, trigger deep AI
- Participants: join, set profile, vote, view revealed state and suggestions
- Transfer host: out of scope for MVP (if host disconnects, room remains; host can rejoin via same playerId)

## Limits & lifecycle

- Soft cap ~20 players per room
- Room TTL ~2 hours without activity
- Process restart → all rooms gone; clients see “Sala expirada”
- Rate-limit AI/Jira/GitHub route usage per room to protect free hosts

## Visual identity

- Background: white with subtle purple/gray atmosphere (gradient or soft pattern — not flat-only)
- Accents: purple for primary actions and brand
- Text/secondary surfaces: medium-dark gray (not near-black)
- Expressive typography (avoid Inter/Roboto/Arial/system defaults)
- Brand name hero-level on landing
- Cards used only where they support interaction (vote cards, suggestion result blocks)

## Error handling

| Case | Behavior |
|------|----------|
| Unknown/expired room | Clear message + return home |
| Jira 401/404 | Inline host error; room still usable |
| GitHub 404/403/rate limit | Prompt for token or fewer paths |
| Invalid AI key / quota | Reveal succeeds; suggestion error + retry |
| Oversized repo context | Truncate with explicit omission list |
| Socket drop | Auto-rejoin with sessionStorage identity |

## Testing strategy

- Unit: room state transitions (join, vote, reveal, reset, rejoin)
- Unit: AI JSON parse + prompt assembly guards
- Integration: Socket.io room happy path in-process
- Manual: Jira import, path picker, Tenor search, one provider smoke test

## Deployment (free & practical)

Primary recommendation: **Render** or **Railway** single Web Service.

1. Connect GitHub repo
2. Build: `npm install && npm run build`
3. Start: `npm start` (custom server)
4. Env: `TENOR_API_KEY` (required for GIFs); optional defaults none for AI/Jira (host-provided at runtime)
5. Share the public URL

Document local setup and key acquisition (Jira API token, Tenor, GitHub, AI providers) in README.

**Not recommended for MVP:** Vercel-only deploy (WebSocket + long-lived memory fit poorly).

## Project structure (target)

Repo root (single Next.js app — simplest free deploy):

```
smart-poker-planning/
  server.ts               # Next + Socket.io bootstrap
  package.json
  src/
    app/                  # pages + API routes
    components/
    lib/
      room-store.ts
      socket/
      jira/
      github/
      ai/
      tenor/
  docs/superpowers/specs/ # this document
```

## Success criteria

- Two+ browsers can join one room, vote, reveal, and see the same state
- Host imports a real Jira issue with API token
- Host attaches a GitHub repo, selects paths, runs deep AI analysis
- Suggestions reference concrete files/risks from the repo, not generic agile advice
- No database; refresh/rejoin works while server is up
- README explains a free one-service deploy path

## Open implementation details (resolved in plan, not product questions)

- Exact host capability auth between HTTP AI/Jira routes and Socket room (session token vs socket id)
- ADF→text conversion library choice for Jira descriptions
- Concrete numeric caps finalized during implementation against provider context windows
```
