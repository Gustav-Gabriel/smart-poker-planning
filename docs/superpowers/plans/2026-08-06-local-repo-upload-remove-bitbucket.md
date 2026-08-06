# Local repo upload + remove Bitbucket — Implementation Plan

> **For agentic workers:** Use subagent-driven-development or executing-plans. Checkboxes for tracking.

**Goal:** Remove Bitbucket; keep GitHub + Jira; add browser-side zip/folder attach with path selection; send selected file texts only on deep analysis POST.

**Architecture:** Client parses zip/folder, stores selected file texts in host memory, room only keeps `provider:"local"` metadata. Deep route merges `localFiles` from body with GitHub fetches. Delete Bitbucket modules.

**Tech Stack:** Existing Next/React/Socket; add `fflate` for zip in browser; Vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-06-local-repo-upload-remove-bitbucket-design.md`
- Caps: 40 files / 40KB / 200KB (reuse github client constants or shared module)
- No server-side zip storage
- PT-BR UI copy
- `gitToken` = GitHub only in labels

---

### Task 1: Remove Bitbucket

Delete `src/lib/bitbucket/**`, `src/app/api/bitbucket/**`. Strip `bitbucket` provider, `bitbucketUsername`, create-form field, deep/host bitbucket branches, README Bitbucket, obsolete tests/translations.

### Task 2: Local repo client helpers (TDD)

`src/lib/local-repo/`: filter paths, read FileList from folder, unzip via fflate, apply skip rules, extract selected contents with caps helper for client+server.

### Task 3: Host UI + deep wiring

Host-controls: GitHub | Local modes; zip + directory inputs; path picker; save local attachment; keep contents in module-level or React ref map keyed by `local/owner/repo`.

Game-room `handleDeepAnalysis`: include `localFiles` from that map for local repos.

Deep route: handle `provider==="local"` from `body.localFiles`; enforce caps; error if missing.

### Task 4: Tests + README + commit

`npm test` green. Commit logically.
