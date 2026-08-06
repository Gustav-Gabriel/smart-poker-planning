# Local zip/folder code attach + remove Bitbucket — Design Spec

**Date:** 2026-08-06  
**Status:** Approved for implementation planning  
**Related:** `2026-08-05-smart-planning-poker-design.md`, Bitbucket attach specs (superseded for Bitbucket)

## Goal

1. Remove Bitbucket Cloud integration (API, UI, secrets, provider).
2. Keep GitHub URL attach and Jira.
3. Let the host attach **local** code via **.zip** or **folder** for deep analysis without any git host token: list and select paths in the browser; send only selected file texts to the server on deep analysis.

## Decisions

| Topic | Choice |
|-------|--------|
| Bitbucket | Remove from product |
| GitHub | Keep (optional `gitToken` for private) |
| Local attach | Zip **or** folder (`webkitdirectory`) |
| Where listing happens | Browser only |
| Where file bodies live | Host browser memory until deep analysis |
| Server room state | Metadata only (`provider: "local"`, label, selectedPaths) |
| Deep payload | Client POSTs selected local file contents with roomCode/hostToken |
| Caps | Same as GitHub: 40 files / 40KB / 200KB total |

## Non-goals

- Persisting zip/folder on the server or disk
- Re-adding Bitbucket
- Binary/asset analysis beyond text caps
- Guaranteeing folder upload on every browser (document limitation; zip is fallback)

## Architecture

### Remove Bitbucket

- Delete or stop shipping: `src/lib/bitbucket/**`, `src/app/api/bitbucket/**`
- Remove `bitbucket` from `RepoAttachment.provider`
- Remove `bitbucketUsername` from `RoomSecrets`, validation, create-room form, deep/github routes wiring
- Strip Bitbucket-specific copy from README, room-ui translations (or leave harmless unused strings — prefer remove clutter)
- Host controls: no Bitbucket URL detection path

### Local attach (host UI)

- Host controls section: tabs or toggle — **GitHub** | **Local**
- Local: file input accept `.zip` + directory input (`webkitdirectory`)
- Client library (e.g. `src/lib/local-repo/`):
  - Parse zip in browser (use a small dependency such as `fflate` or `jszip` — prefer lightweight)
  - Read folder via `FileList` from directory picker
  - Build path list; skip `.git/`, `node_modules/`, common binaries by extension
- Same path picker UX as GitHub tree
- On save: `repos:set` with  
  `provider: "local"`, `url: ""` or synthetic, `owner: "local"`, `repo: <archive or folder name>`, `ref: "local"`, `selectedPaths`
- Keep a host-only in-memory map: `localRepoId → Map<path, string content>` for selected files (or full text cache of selected paths after selection). Clear on leave/reload.

### Deep analysis

- Extend `POST /api/ai/deep` body:

```ts
{
  roomCode: string;
  hostToken: string;
  localFiles?: { repository: string; files: { path: string; content: string }[] }[];
}
```

- Server: for each `room.repos` entry:
  - `github` → fetch via GitHub client + `gitToken` (unchanged)
  - `local` → take matching `localFiles` from request; apply caps; do **not** trust unbounded payloads (enforce caps server-side)
- Reject if local repo is attached but required selected contents missing / empty (clear PT-BR error asking to re-attach)
- Merge into existing `repositories` array for `runDeepAnalysis`

### Errors / UX

- Reload warning near local attach: “Código local fica só neste navegador; após atualizar a página, anexe de novo para análise profunda.”
- Zip corrupt / too large client-side: inline error before save
- Optional soft client limit on zip size before parse (e.g. 20–50MB) to avoid tab freeze

### Testing

- Unit: local path filtering helpers; deep route merges localFiles + github; rejects oversized local payload
- Unit: provider type no longer includes bitbucket; validation without bitbucketUsername
- Remove or skip Bitbucket-specific tests with the deleted modules
- Manual: attach zip, select files, deep analysis; GitHub path still works; create room has no Bitbucket username field

## Success criteria

1. No Bitbucket flows or secrets in create/attach UI.
2. Host can attach zip or folder, select paths, run deep analysis with that code + Jira + votes.
3. GitHub attach unchanged in spirit (token field GitHub-only copy).
4. Server never stores the full zip; caps enforced on deep POST.
5. `npm test` green without Bitbucket suites.
