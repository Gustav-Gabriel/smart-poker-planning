# Bitbucket App Password auth + branch URL — Design Spec

**Date:** 2026-08-06  
**Status:** Approved for implementation planning  
**Related:** `2026-08-06-bitbucket-repo-attach-design.md`

## Goal

1. Let hosts authenticate to **private** Bitbucket Cloud repos using **App Passwords** (username + password), which are easier to create than Repository Access Tokens — while still supporting Bearer access tokens.
2. Accept Bitbucket browse URLs that include a branch (`…/src/{branch}/…`) and load that branch’s tree instead of only the default branch.
3. Clarify 404 errors so “private without auth” is not mistaken for a bad URL.

## Problem (confirmed)

- Private repo + empty Git token → Bitbucket API returns **404** (not 401).
- Hosts often cannot find/create Repository Access Tokens.
- App Passwords require **Basic** `username:app_password`; the app previously sent only Bearer.
- URLs like `https://bitbucket.org/useniu/marilena-backend/src/development/` parse the repo correctly today but ignore `development` and always use `mainbranch`.

## Non-goals

- Bitbucket Server / Data Center
- OAuth / SSH
- Changing GitHub auth
- Editing Bitbucket username mid-session (create-room only)
- Listing workspace repos

## Decisions

| Topic | Choice |
|-------|--------|
| Username secret | Optional `bitbucketUsername` on room secrets (create-room) |
| Token field | Existing `gitToken` |
| Auth selection | username+token → Basic; token only → Bearer; neither → unauthenticated |
| Branch in URL | Optional `ref` from `/src/{branch}/`; else default `mainbranch` |
| Error copy | Enrich Bitbucket 404 PT-BR to mention private/unauthenticated |

## Design

### Secrets / create form

- `RoomSecrets.bitbucketUsername?: string`
- Create form: optional “Usuário Bitbucket” + updated Token Git hint (GitHub PAT, Bitbucket Access Token Bearer, or App Password with username).
- Validation clamps username like other secrets.

### Parse URL

`parseBitbucketUrl` returns `{ workspace, repo, ref?: string }`.

- Match `bitbucket.org/{workspace}/{repo}` 
- If path continues with `/src/{branch}/…`, set `ref` to that branch segment (decode URI).
- Reject workspace-only URLs.
- Strip `.git` on repo slug.

### Client

- `bitbucketHeaders({ token?, username? })`:
  - username + token → `Authorization: Basic ${base64(username:token)}`
  - token only → `Authorization: Bearer ${token}`
- `listRepoTree({ workspace, repo, token?, username?, ref? })`:
  - If `ref` provided, use it for `/src/{ref}/…`
  - Else fetch repo metadata for `mainbranch.name`
- `listRepoTreeFromUrl` passes parsed `ref` through; returns `{ owner: workspace, repo, ref, paths }`.
- Same for contents helpers.

### API routes / deep AI

- Pass `room.secrets.bitbucketUsername` into Bitbucket client calls alongside `gitToken`.
- GitHub routes unchanged (ignore username).

### Errors

- Map Bitbucket not found to a PT-BR string that mentions: repo missing **or** private without valid auth (App Password + usuário, or Access Token).

## Testing

- Parse: `/src/development/`, simple URL, dotted repo, reject workspace-only / github.
- Client unit: Basic vs Bearer header construction; uses explicit ref when provided.
- Validation/create-room tests for optional username.
- room-ui translation for enriched 404.

## Success criteria

1. Private Bitbucket repo works with App Password + username filled at create.
2. Bearer-only Access Token still works without username.
3. URL with `/src/development/` loads the `development` tree.
4. Empty token on private repo shows clearer guidance than a bare “não encontrado”.
