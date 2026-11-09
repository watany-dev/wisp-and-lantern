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
- Spec `04-score-attack` adds 15 to 17 (the 60-second run) and widens INV-1 to the end screen.
- Retired numbers, never reused: 6 and 7. Spec `03-trial-tell-vague-request` retired them (one card
  is now a valid request) and added 8 to 14. They are written without the `INV-` prefix here so the
  trace check does not count them as live.
- Only list rules a child depends on (caps, scoring, no soft-lock, determinism). Do not add
  confirmation-only invariants.

The reducer is still the scaffold stub; `.kiro/specs/01-core-loop` replaces it and should revise
INV-1 and INV-2 to match the real state.

| id | invariant | test |
|---|---|---|
| INV-1 | `phase` is always `"title"`, `"trial"` or `"over"`. | `reducer.pbt.test.ts` |
| INV-2 | `trial` is always an integer and never negative. | `reducer.pbt.test.ts` |
| INV-3 | `reduce` never mutates the state it is given. | `reducer.pbt.test.ts` |
| INV-4 | `reduce` is deterministic: the same events from the same state give an equal state. | `reducer.pbt.test.ts` |
| INV-5 | The helper never searches unprompted: `lane.asked` turns true only on an `Ask` event, so it is false after any sequence that has none. | `reducer.pbt.test.ts` |
| INV-8 | `Ask` with no card picked, or after a search, returns the same state: no card is not a request. | `reducer.pbt.test.ts` |
| INV-9 | `Ask` with at least one card picked and no search yet starts the search: one card is a request. | `reducer.pbt.test.ts` |
| INV-10 | `Ask` changes only `lane.asked`: the pick stays as the child left it, so a card they did not pick is never filled in for them. | `reducer.pbt.test.ts` |
| INV-11 | What the wisp brings keeps every card the child picked: the picked color is the color brought, and the picked object is the object brought. | `reducer.pbt.test.ts` |
| INV-12 | A request with only one card never brings the wish. | `reducer.pbt.test.ts` |
| INV-13 | A request with both cards brings exactly that pair, the wish or not. | `reducer.pbt.test.ts` |
| INV-14 | After a search the pick has at least one card, and inside a run only `Retry` changes the lane: what was asked cannot change. A new run starts from a clean lane. | `reducer.pbt.test.ts` |
| INV-15 | Inside a run the clock only runs down and stays between 0 and 60 seconds. Only a `Start` from the title or the end screen sets it back to 60 seconds. | `reducer.pbt.test.ts` |
| INV-16 | Inside a run the score never goes down, and it goes up only on an `Ask` that brings the wish. A `Start` from the title or the end screen sets it to 0. | `reducer.pbt.test.ts` |
| INV-17 | In a trial the clock is above zero and on the end screen it is zero. The end screen changes only on `Start`, `SetLang` and `MoveHeroTo`, and the last two leave the run and the lane alone. | `reducer.pbt.test.ts` |
