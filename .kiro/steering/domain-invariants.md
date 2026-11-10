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
- Spec `05-trial-grant-tools` adds 18 to 24 (trial 2, the shed: `shed` in the state, `trial` 2). INV-5 and
  INV-8 to INV-17 describe trial 1's lane and run; they are unchanged and hold for every event sequence,
  including the shed events, because INV-23 and INV-24 keep the shed and trial 1 apart. INV-1 to INV-4 are
  global and are also run over sequences that contain the shed events.
- Spec `06-trial-verify-stars` adds 25 to 32 (trial 3, the field: `field` in the state, `trial` 3). INV-5, INV-8 to
  INV-24 describe trial 1's lane and run and trial 2's shed; they are unchanged and hold for every event
  sequence, including the field events, because INV-31 and INV-32 keep the field and the other trials apart.
  INV-1 to INV-4 are global and are also run over sequences that contain the field events.
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
| INV-18 | Picking a tool only picks it: `PickTool` leaves the shed choosing with exactly that one tool picked, and a later pick replaces the earlier one. A tool is tried only by `GiveTool` with a tool picked, and `GiveTool` with none picked returns the same state. | `shed.pbt.test.ts` |
| INV-19 | The tool tried is the tool picked at the hand-over. It is never changed, corrected or taken from somewhere else. | `shed.pbt.test.ts` |
| INV-20 | Only the key opens the door: a tried key is `open`, a tried broom or hammer is `shut`. | `shed.pbt.test.ts` |
| INV-21 | Once a tool is tried, every event except `RetryShed` leaves the shed equal: the result and the tried tool stay until the retry. | `shed.pbt.test.ts` |
| INV-22 | `RetryShed` after a try returns to choosing with no tool picked and changes nothing else; before a try it returns the same state. | `shed.pbt.test.ts` |
| INV-23 | Shed events return the same state outside trial 2, and in trial 2 change only `shed`. `shed` is the initial shed whenever `trial` is not 2. | `shed.pbt.test.ts` |
| INV-24 | In trial 2 the trial 1 events `Ask`, `PickCard`, `Retry` and `Tick` return the same state, so the lane and the run stay initial: no clock, no score. | `shed.pbt.test.ts` |
| INV-25 | Checking checks one star: `CheckStar` with an unchecked star's index in the field marks exactly that star, sets it as the last one checked, and every other star keeps its mark. An index that is not 0 to 4, a star already checked, or a field already kept returns the same state. | `field.pbt.test.ts` |
| INV-26 | A round has 1 or 2 fake stars out of the 5, and what a check shows is true and steady: a checked star is a fake exactly when it is among the round's fakes, and the round does not change until `RetryField`. | `field.pbt.test.ts` |
| INV-27 | The field reaches the kept result only by `KeepStars`, and only when all five stars are checked. `KeepStars` with any star unchecked returns the same state. | `field.pbt.test.ts` |
| INV-28 | The keep accepts exactly the real stars of the round: none is fake, none is missing, and every one of them was checked before the keep. | `field.pbt.test.ts` |
| INV-29 | Once kept, every event except `RetryField` leaves the field equal: the result stays until the retry. | `field.pbt.test.ts` |
| INV-30 | `RetryField` after the keep starts the next round (the first after the last): nothing checked, and nothing else in the state changes. Before the keep it returns the same state. | `field.pbt.test.ts` |
| INV-31 | Field events (`CheckStar`, `KeepStars`, `RetryField`) return the same state outside trial 3, and in trial 3 change only `field`. `field` is the initial field whenever `trial` is not 3. | `field.pbt.test.ts` |
| INV-32 | In trial 3 the events of the other trials (`Ask`, `PickCard`, `Retry`, `Tick`, `PickTool`, `GiveTool`, `RetryShed`) return the same state, so the lane, the run and the shed stay initial: no clock, no score. | `field.pbt.test.ts` |
