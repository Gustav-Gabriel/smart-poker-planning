# Dark mode toggle — Design Spec

**Date:** 2026-08-06  
**Status:** Approved for implementation  
**Related:** existing `globals.css` token system

## Goal

Add a dark mode toggle so users can switch the app between light and dark themes. Preference persists across visits.

## Decisions

| Topic | Choice |
|-------|--------|
| Mechanism | CSS variables on `:root` / `[data-theme="dark"]` on `<html>` |
| Default | Light (current brand); if no saved preference, optionally follow `prefers-color-scheme` once on first visit |
| Persistence | `localStorage` key `smart-poker-theme` = `light` \| `dark` |
| Control | Button in compact site headers and landing header (sun/moon or “Claro/Escuro” text — accessible `aria-label`) |
| Scope | Global app chrome via tokens; replace hard-coded light colors in `globals.css` with tokens where needed for dark readability |

## Non-goals

- Per-room theme
- Multiple accent themes
- Changing brand purple identity (keep purple accents)

## Success criteria

1. Toggle switches entire visible UI between light and dark without full reload.
2. Reload keeps the chosen theme.
3. Contrast remains readable on forms, room panels, and buttons.
4. No flash of wrong theme if a tiny inline script sets `data-theme` before paint (preferred).
