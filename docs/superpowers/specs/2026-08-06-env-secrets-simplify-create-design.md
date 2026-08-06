# Simplify create room via env secrets — Design Spec

**Date:** 2026-08-06  
**Status:** Approved for implementation (user: proceed without further questions)

## Goal

Simplify room creation: AI API keys and Jira credentials come from server environment variables. Create form only selects the AI provider name (Gemini visible; OpenAI/Claude temporarily hidden). Theme toggle shows sun/moon icons.

## Decisions

| Topic | Choice |
|-------|--------|
| AI keys | `GEMINI_API_KEY` (and keep `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` wired for later; UI hides openai/claude) |
| Create AI UI | Provider select showing only Gemini |
| Jira | `JIRA_SITE`, `JIRA_EMAIL`, `JIRA_TOKEN` in env — email required for Atlassian Basic auth, not shown on form |
| Create form fields | Room name, deck, AI provider (Gemini), optional GitHub token, host name/emoji |
| Secrets at create | Server merges env into `RoomSecrets` on `room:create` |
| Theme toggle | Sun icon in dark mode (switch to light); moon icon in light mode (switch to dark) |

## Non-goals

- Multi-tenant per-room Jira/AI keys
- Re-enabling OpenAI/Claude in UI now
- Removing gitToken field (still optional for private GitHub)

## Design

### Env (`.env.example` + README)

```
KLIPY_API_KEY=
GEMINI_API_KEY=
# OPENAI_API_KEY=   # reserved, UI hidden
# ANTHROPIC_API_KEY=
JIRA_SITE=https://your-domain.atlassian.net
JIRA_EMAIL=you@company.com
JIRA_TOKEN=
PORT=3000
```

### Server merge

On `room:create`, after client payload validation of non-secret fields:
- Map `aiProvider` → env key; fail create with clear PT error if missing
- Fill `jiraSite`, `jiraEmail`, `jiraToken` from env; fail if incomplete
- Do not accept client-supplied AI/Jira secrets (ignore if sent)

### Validation

Relax client-facing create validation: secrets from env may be attached server-side before `createRoom`. Export helper `secretsFromEnv(provider)`.

### Theme toggle

Replace text “Claro/Escuro” with accessible SVG (or emoji) sun/moon; keep `aria-label`.

## Success criteria

1. Create room without typing AI key or Jira email/token/site.
2. Only Gemini appears as AI choice.
3. Jira import and AI summary/deep still work when env is set.
4. Theme toggle shows sun/moon.
5. Tests updated; `npm test` green.
