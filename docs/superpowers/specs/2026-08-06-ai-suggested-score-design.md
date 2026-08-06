# AI suggested score (summary + deep revise) — Design Spec

**Date:** 2026-08-06  
**Status:** Approved for implementation  
**Related:** AI summary/deep prompts, suggestions panel, decks

## Goal

Every AI processing step returns an explicit **suggested score**: one card from the room’s deck plus a short rationale (1–2 sentences).

- **Summary (on reveal):** based on votes; also use Jira story when present.
- **Deep analysis:** may **revise** the summary suggestion using votes + Jira and/or attached file excerpts when at least one of Jira/files is available; if neither Jira nor files exist, still suggest from votes (and prior summary if any).

## Decisions

| Topic | Choice |
|-------|--------|
| Shape | `suggestedScore: { value: string; rationale: string }` on AI payload |
| Where | Both summary and deep |
| Deep vs summary | Deep may revise; UI shows each block’s own suggestion |
| Deck | `value` must be in `cardsFor(deck)` excluding `?` and `☕` |
| Missing Jira/files | Still required; reason from votes (and note limited evidence) |
| Copy | Portuguese |

## Non-goals

- Auto-casting votes or changing player votes
- Suggesting `?` / `☕` as final score
- Host-configurable model or scoring rules UI

## Design

### Types

Extend `AiSuggestion["payload"]`:

```ts
suggestedScore: {
  value: string; // e.g. "5" or "M"
  rationale: string;
};
```

Required for both `summary` and `deep`.

### Prompts

- `buildSummaryPrompt`: document required JSON including `suggestedScore`; instruct to use only allowed score cards for the deck (pass allowed values explicitly from `cardsFor(deck)` filtered); base on votes; incorporate Jira if `story` present.
- `buildDeepPrompt`: same field; may revise prior summary’s `suggestedScore` when Jira and/or repository files exist; cite evidence briefly in rationale; still only allowed cards.

### Parse

- Require `suggestedScore` object with string `value` and `rationale`.
- Validate `value` against allowed score cards for the deck passed into parse (add `deck` arg to `parseAiJson` or validate in providers after parse).
- If invalid value → throw clear error (treat as bad AI response / optionally retry — YAGNI: fail with PT-BR via existing error path).

### UI

- In `suggestions-panel.tsx`, for summary and deep cards, show a clear “Sugestão de pontuação” with the card value emphasized and rationale below.
- Keep existing consensus/discussion sections.

### Tests

- Prompt builders include `suggestedScore` and allowed cards.
- `parseAiJson` accepts valid score; rejects `?`, `☕`, unknown values, missing field.
- Panel renders score (light unit or snapshot not required if no RTL — optional).

## Success criteria

1. After reveal, summary shows a deck-legal suggested score + rationale.
2. Deep analysis shows its own suggested score (possibly revised) + rationale.
3. Fibonacci vs T-shirt rooms only get values from their deck.
4. Existing AI flows still work with Gemini/OpenAI/Claude JSON mode.
