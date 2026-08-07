# Expandable table view for participants/cards — Design Spec

**Date:** 2026-08-06  
**Status:** Approved for implementation  
**Related:** game-room layout, Participants, VoteDeck

## Goal

Let anyone in the room expand the right-rail participants/votes into a centered **table view**: horizontal rows (avatar + name | large card), with a compact vote deck at the bottom and a host-only Reveal control. A Back control restores the classic sidebar layout.

## Decisions

| Topic | Choice |
|-------|--------|
| Mechanism | Local `tableView` state on `game-room` |
| Left column in table mode | Hidden (story, host controls, suggestions, main VoteDeck) |
| Table rows | Avatar + name left; large vote card right |
| Pre-reveal card | Face-down / `…` if not voted; face-down mark if voted |
| Post-reveal | Show vote value large |
| Footer | Compact VoteDeck + Reveal (host, if not revealed) + Back |
| Persistence | None (refresh returns to sidebar) |

## Non-goals

- Separate route/URL for table mode
- Reset votes button in table mode (host can go back)
- Changing deep analysis / story UI in this mode

## Design

### Entry / exit
- Button on Participants panel heading: “Expandir mesa” → `setTableView(true)`
- In table mode header/footer: “Voltar” → `setTableView(false)`

### Components
- Extend `Participants` with `variant?: "sidebar" | "table"` (or separate `TableView` composition in game-room that maps players the same way)
- Prefer `variant="table"` on Participants for DRY stats + list logic; CSS modifiers `participants--table`, `participant--table`, `participant__vote--xl`
- `game-room` when `tableView`: render `room room--table` with Participants table + footer VoteDeck + host Reveal calling existing `handleReveal`

### Styling
- Large cards (~96–120px min height), clear face-down vs revealed
- Horizontal row layout, comfortable gap; scroll if many players
- Respect light/dark tokens

### Testing
- Optional: unit not required for CSS; smoke that Reveal/Vote handlers still wired (manual)
- Keep existing Participants stats tests if any

## Success criteria

1. Expand shows full-width horizontal player+card rows with large cards.
2. Vote deck works in table footer; host can Reveal without leaving table view.
3. Back restores sidebar layout with main column visible again.
4. Works before and after reveal.
