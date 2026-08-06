# Bitbucket Cloud repo attach — Design Spec

**Date:** 2026-08-06  
**Status:** Approved for implementation planning  
**Related:** `2026-08-05-smart-planning-poker-design.md`, room-store singleton fix

## Goal

Allow the host to attach **Bitbucket Cloud** repositories the same way as GitHub: paste a repository URL, load the file tree, select paths, and use those paths in deep AI analysis. Public repos work without a token; private repos use the room’s shared Git token.

## Non-goals

- Bitbucket Server / Data Center
- Workspace URL browsing / repo picker from `https://bitbucket.org/{workspace}`
- OAuth browser login, SSH keys, or username+app-password Basic auth
- Unifying GitHub and Bitbucket behind a single `/api/repos` layer in this change
- GIF search fixes or dark mode (separate specs)

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Hosting | Bitbucket Cloud (`bitbucket.org`) only |
| Attach input | Repository URL only (`https://bitbucket.org/{workspace}/{repo}`) |
| Auth | Optional shared Git token; Bearer for Bitbucket private repos |
| Secret field | Rename `githubToken` → `gitToken` in types/secrets/UI (no DB; in-memory only) |
| Architecture | Parallel Bitbucket stack (parse + client + `/api/bitbucket/*`) |
| Attachment model | `RepoAttachment.provider: "github" \| "bitbucket"` |
| Caps | Same as GitHub: 40 files / 40KB each / 200KB total text |

## Architecture

### New modules

- `src/lib/bitbucket/parse-url.ts` — parse workspace + repo; strip `.git`; reject non-bitbucket / incomplete URLs
- `src/lib/bitbucket/client.ts` — HTTP client for Bitbucket API 2.0:
  - Resolve default branch / commit ref
  - List file paths (blobs only)
  - Fetch selected file contents with the same size caps as GitHub
  - Typed errors: auth, not found, timeout (mirror GitHub client style)
- `src/app/api/bitbucket/tree/route.ts` — host-authenticated tree listing
- `src/app/api/bitbucket/contents/route.ts` — host-authenticated contents (if still used independently; deep route may call client directly like GitHub)

### Changes to existing

- `RepoAttachment`: add `provider: "github" | "bitbucket"`
- `RoomSecrets`: `githubToken?` → `gitToken?`
- Create-room form + validation: field label “Token Git (GitHub / Bitbucket)”; wire `gitToken`
- Host controls: detect provider from URL hostname; call `/api/github/tree` or `/api/bitbucket/tree`; save attachment with correct `provider` and `owner` (= workspace for Bitbucket)
- Deep AI route: for each attached repo, call GitHub or Bitbucket `fetchSelectedContents` based on `provider`, passing `room.secrets.gitToken`
- Error translations in `room-ui.ts` for Bitbucket messages
- README: note Bitbucket Cloud + Bearer access token

### Data flow

```
Host pastes bitbucket.org/workspace/repo
  → UI detects bitbucket
  → GET /api/bitbucket/tree?roomCode&hostToken&url
  → getRoom + assertHost + rate limit
  → parseBitbucketUrl → Bitbucket API (optional Bearer gitToken)
  → { ref, paths }
  → host selects paths → repos:set with provider: "bitbucket"
  → deep AI → bitbucket.fetchSelectedContents per Bitbucket attachment
```

## Auth semantics

- No `gitToken`: request Bitbucket API without Authorization (public repos only).
- With `gitToken`: `Authorization: Bearer <gitToken>`.
- Document in UI helper text: use a Bitbucket **access token** (repository/workspace/API token that supports Bearer). Username+app-password is out of scope.
- Same token string is sent to GitHub APIs for GitHub attachments (existing behavior).

## Error handling

| Case | Behavior |
|------|----------|
| Invalid / non-repo Bitbucket URL | 400 + PT-BR message |
| 401 from Bitbucket | Token missing/invalid or private without token |
| 404 | Repo not found |
| Timeout | Same pattern as GitHub/KLIPY timeouts |
| Oversized files | Omit path; report in deep `omitted` list |

## Testing

- Unit: `parseBitbucketUrl` — https, www, `.git`, dotted repo names, reject workspace-only and github URLs
- Unit: Bitbucket client with mocked `fetch` — tree listing, contents caps, 401/404 mapping
- Update validation / create-room tests for `gitToken`
- Ensure GitHub path still passes existing tests
- Manual: public Bitbucket repo attach; private with Bearer token if available

## Success criteria

1. Host can attach a public Bitbucket Cloud repo and select paths without a token.
2. Private Bitbucket repo works with `gitToken` Bearer auth.
3. Deep analysis reads Bitbucket-selected files when `provider === "bitbucket"`.
4. GitHub attach/deep flow unchanged aside from the secret rename.
5. Workspace-only URLs are rejected with a clear error.
