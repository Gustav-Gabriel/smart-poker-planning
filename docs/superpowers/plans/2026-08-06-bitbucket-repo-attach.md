# Bitbucket Cloud Repo Attach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let hosts attach Bitbucket Cloud repos (tree + path select + deep AI) using the same UX as GitHub, with a shared `gitToken` Bearer secret.

**Architecture:** Parallel Bitbucket modules (`parse-url`, `client`, `/api/bitbucket/*`) mirroring GitHub. `RepoAttachment.provider` discriminates. Rename `githubToken` → `gitToken` across secrets/UI/validation.

**Tech Stack:** TypeScript, Next.js App Router, Vitest, Bitbucket REST API 2.0, existing Socket.io room flow.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-06-bitbucket-repo-attach-design.md`
- Bitbucket Cloud only; repository URLs only; no username+app-password
- Caps: 40 files / 40KB / 200KB (reuse GitHub constants or duplicate same numbers)
- Copy/UI: Portuguese (Brazil)
- Auth: optional `Authorization: Bearer <gitToken>`

---

## File map

| Path | Responsibility |
|------|----------------|
| `src/lib/bitbucket/parse-url.ts` | Parse workspace/repo from bitbucket.org URLs |
| `src/lib/bitbucket/parse-url.test.ts` | Parser tests |
| `src/lib/bitbucket/client.ts` | Tree + contents + errors |
| `src/lib/bitbucket/client.test.ts` | Mocked fetch tests |
| `src/app/api/bitbucket/tree/route.ts` | Host tree API |
| `src/app/api/bitbucket/contents/route.ts` | Host contents API (parity with GitHub) |
| `src/lib/types.ts` | `provider` + `gitToken` |
| `src/lib/validation.ts` + tests | `gitToken` |
| `src/components/create-room-form.tsx` + test | Field rename |
| `src/components/room/host-controls.tsx` | Provider detect + API path |
| `src/app/api/ai/deep/route.ts` | Provider-aware fetch |
| `src/app/api/github/*` | Use `gitToken` |
| `src/lib/room-ui.ts` | Bitbucket PT-BR errors |
| `README.md` | Bitbucket note |

---

### Task 1: parseBitbucketUrl (TDD)

**Files:** Create `src/lib/bitbucket/parse-url.ts`, `src/lib/bitbucket/parse-url.test.ts`

- [ ] Tests: parse `https://bitbucket.org/acme/api`, `.git` strip, dotted repo, reject `https://bitbucket.org/acme` (workspace-only), reject github URL
- [ ] Implement `parseBitbucketUrl(url) => { workspace, repo }` throwing `Invalid Bitbucket repository URL`
- [ ] Commit: `feat: parse Bitbucket Cloud repository URLs`

### Task 2: Bitbucket client (TDD)

**Files:** Create `src/lib/bitbucket/client.ts`, `src/lib/bitbucket/client.test.ts`

- [ ] Mirror GitHub error classes (`BitbucketAuthError`, `BitbucketNotFoundError`)
- [ ] `listRepoTree` / `listRepoTreeFromUrl` via API 2.0 repo + paginated `src/{ref}/?max_depth=`
- [ ] `fetchSelectedContents` raw file GETs + same caps
- [ ] Commit: `feat: add Bitbucket tree and contents client`

### Task 3: API routes + gitToken rename + provider wiring

**Files:** types, validation, create form, github routes, bitbucket routes, host-controls, deep route, room-ui, README, room-store tests secrets

- [ ] Rename secret to `gitToken`; add `provider` on `RepoAttachment`
- [ ] Add `/api/bitbucket/tree` and `/contents`
- [ ] Host UI detects bitbucket.org vs github.com
- [ ] Deep AI branches on `provider`
- [ ] PT-BR translations + README
- [ ] `npm test` green
- [ ] Commit: `feat: attach Bitbucket Cloud repos with shared git token`

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| parse URL | 1 |
| client tree/contents/caps/auth | 2 |
| API routes, UI, deep AI, gitToken, provider | 3 |
| Non-goals (Server, OAuth, GIF, dark) | out of plan |
