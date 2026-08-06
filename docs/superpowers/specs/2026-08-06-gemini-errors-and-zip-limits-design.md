# Gemini model update + clearer AI errors; smarter zip limits — Design Spec

**Date:** 2026-08-06  
**Status:** Approved for implementation  
**Related:** AI providers, local zip attach

## Part A — Gemini / AI errors (priority)

### Goal
Fix empty AI summary on vote reveal when using Gemini: app called shut-down `gemini-2.0-flash` (shutdown 2026-06-01). Surface real provider errors instead of generic “Não foi possível concluir a operação.”

### Decisions
| Topic | Choice |
|-------|--------|
| Gemini model | `gemini-2.5-flash` (verify against Google docs at implement time; use current recommended flash if id differs) |
| Error detail | Include HTTP status + short provider message in thrown Error |
| translateError | Map 401/403, 404, 429 for AI; stop classifying accent-free Portuguese as English-only generic |

### Non-goals (A)
- Host-selectable model list
- Changing OpenAI/Claude model ids (only shared error helper if trivial)

### Success (A)
1. Reveal with valid Gemini key produces summary (or a specific PT-BR error).
2. Invalid key / quota show actionable messages, not only the generic fallback.

## Part B — Zip size / memory

### Goal
Allow larger archives (e.g. ~200MB compressed) without loading every file’s text into memory before path selection. Prefer listing zip entries first; decode text only for selected paths (and/or after selection). Skip `node_modules`, `.git`, build dirs early.

### Decisions
| Topic | Choice |
|-------|--------|
| Max compressed zip | Raise to **200MB** |
| Parse strategy | Two-phase: list paths (skip filtered) → read contents for selected paths only when saving / for pending selection set |
| UX | Hint: zip without node_modules/.git; folder picker remains |

### Success (B)
1. A ~180MB zip that is mostly skippable junk can list paths without the old 50MB hard fail (if under 200MB).
2. Selecting a few source files does not require keeping all unzipped texts in a Map.

## Testing
- Unit: translateError AI status cases; Gemini model string constant
- Unit: zip list vs read-selected; size limit 200MB
- Manual: reveal with Gemini; attach large-ish zip
