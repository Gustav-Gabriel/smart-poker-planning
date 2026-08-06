# Host GIF avatar + hide deep analysis UI — Design Spec

**Date:** 2026-08-06  
**Status:** Approved for implementation (user: proceed without questions)

## Goal

1. Allow the host to choose a GIF avatar when creating a room (same AvatarPicker as join).
2. Temporarily hide deep-analysis UI (button + related copy/blocks) because it is too slow; keep backend/code paths, add TODO to revisit.

## Decisions

| Topic | Choice |
|-------|--------|
| Host avatar | Replace emoji `<select>` with `AvatarPicker` (emoji + GIF) |
| Nested forms | AvatarPicker already uses non-form search controls |
| Deep UI | `DEEP_ANALYSIS_UI_ENABLED = false` + TODO; hide host button/errors and suggestions deep section |
| Deep backend | Unchanged (`/api/ai/deep`, handlers, local zip still present) |

## Success criteria

1. Create room can submit gif avatar; room shows GIF for host.
2. No visible deep-analysis CTA or deep suggestion section while flag is false.
3. Reveal summary AI still works.
4. Tests updated / green.
