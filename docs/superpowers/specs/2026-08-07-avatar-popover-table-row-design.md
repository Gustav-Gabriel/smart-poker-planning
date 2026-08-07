# Avatar popovers, GIF limit, table row layout — Design Spec

**Date:** 2026-08-07  
**Status:** Approved for implementation

## Goal

1. Harden create-form autocomplete off for room name and git token.
2. Curated ~120 emoji picker in a scrollable popover (create + join); GIF results (48) in the same style popover.
3. Table view: participants in a horizontal row; avatar+name above each large card; fit viewport with shrink; horizontal scroll last resort. Sidebar unchanged.

## Decisions

| Topic | Choice |
|-------|--------|
| Autocomplete | form `autoComplete="off"`; roomName `off`; gitToken `new-password` |
| Emoji set | Curated ~100–150 common emoji |
| GIF page size | `per_page: 48` |
| Picker UI | Popover/modal panel with max-height + internal scroll |
| Table layout | Row of columns: avatar/name on top, card below |

## Success criteria

Create/join avatar pickers don't break page layout; more GIFs; table fits side-by-side; sidebar unchanged; tests green.
