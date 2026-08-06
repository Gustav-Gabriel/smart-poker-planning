# GIF avatar search nested-form fix — Design Spec

**Date:** 2026-08-06  
**Status:** Approved for implementation  
**Related:** join avatar picker / KLIPY

## Goal

Fix GIF search in the join flow so clicking “Buscar” runs the KLIPY search instead of submitting/resetting the parent “Entrar na sala” form.

## Problem

`AvatarPicker` renders an inner `<form onSubmit={handleSearch}>` nested inside `JoinPanel`’s `<form onSubmit={handleSubmit}>`. Nested forms are invalid HTML; the browser associates the search submit control with the outer form, which remounts/resets the join UI (emoji tab / cleared fields).

## Decision

Replace the inner search `<form>` with a non-form container. Search triggers via:
- `button type="button"` click
- Enter key on the query input (`onKeyDown`)

Keep KLIPY API client as-is unless tests reveal response parsing bugs. Pipe API errors through `translateError` in the picker.

## Non-goals

- Adding GIF picker to create-room (still emoji `<select>`)
- Switching GIF provider away from KLIPY
- Dark mode

## Success criteria

1. On `/room/[code]` join form, GIF search updates results without resetting name/avatar UI.
2. Selecting a GIF keeps `avatar.type === "gif"` and shows preview.
3. Enter key in the search box still searches.
4. Existing emoji path unchanged.
