---
inclusion: always
---

# Domain invariants

Properties of `reduce(state, event)` in `src/domain/` that hold for every event sequence starting
from `initialState`.

`scripts/check-trace.mjs` reads every `INV-n` id in this file and fails CI (from
2026-11-07 00:00 JST; a warning before that) when the id does not appear in
`src/domain/__tests__/*.pbt.test.ts`. So:

- Add an invariant and its property test in the same PR. Put the id in the test name
  (`it("INV-<n>: ...")`) and run it through `checkProperty`.
- Every `INV-` followed by digits in this file counts as an invariant, including in examples and
  prose. Write `INV-<n>` when you mean the pattern.
- Never reuse or renumber an id. When an invariant no longer applies, delete its line and its test
  together, and say why in the PR.
- A soft-lock check (the goal is always still reachable) belongs in the trial's `*.model.test.ts`;
  give it an id here only if a property test also covers it.
- Only list rules a child depends on (caps, scoring, no soft-lock, determinism). Do not add
  confirmation-only invariants.

The reducer is still the scaffold stub; `.kiro/specs/01-core-loop` replaces it and should revise
INV-1 and INV-2 to match the real state.

| id | invariant | test |
|---|---|---|
| INV-1 | `phase` is always `"title"` or `"trial"`. | `reducer.pbt.test.ts` |
| INV-2 | `trial` is always an integer and never negative. | `reducer.pbt.test.ts` |
| INV-3 | `reduce` never mutates the state it is given. | `reducer.pbt.test.ts` |
| INV-4 | `reduce` is deterministic: the same events from the same state give an equal state. | `reducer.pbt.test.ts` |
| INV-5 | The helper never searches unprompted: `lane.asked` turns true only on an `Ask` event, so it is false after any sequence that has none. | `reducer.pbt.test.ts` |
| INV-6 | `Ask` with a card missing, or after a search, returns the same state: a missing card is not a search. | `reducer.pbt.test.ts` |
| INV-7 | After a search the pick is complete and only `Retry` changes the lane: what was asked cannot change. | `reducer.pbt.test.ts` |
