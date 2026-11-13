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
  INV-8 to INV-14 describe trial 1's lane and hold for every event sequence, including the shed events,
  because INV-23 and INV-24 keep the shed and the lane apart. INV-1 to INV-4 are global and are also run over
  sequences that contain the shed events.
- Spec `05-trial-grant-tools`, revision 2 (the shed becomes a 60-second time attack with five puzzles, each
  with its own answer, and a way back to the title; see the spec's "Revision 2"): the shed now has a run, so
  INV-15 to INV-17 are widened to it (the shed's `Tick`, score, end screen, and the new events `StartShed` on
  the end screen and `LeaveShed`). INV-18 to INV-23 keep their numbers and their idea with new wording (a
  puzzle, an answer, the retry that goes on after a freed cat, a hand-over that scores). INV-24 no longer says
  "no clock, no score": it keeps only "the lane stays initial". INV-40 to INV-43 are new. INV-32 now says the
  run keeps its title values in the field, with `best` carried over from a run of the shed. Each of these has
  its property test in `shed.pbt.test.ts` (INV-15 to INV-17 for the shed are there, next to trial 1's in
  `reducer.pbt.test.ts`).
- Spec `06-trial-verify-stars` adds 26 to 39 (trial 3, the field: `field` in the state, `trial` 3; 25 is retired). INV-5, INV-8 to
  INV-24 describe trial 1's lane and run and trial 2's shed; they are unchanged and hold for every event
  sequence, including the field events, because INV-31 and INV-32 keep the field and the other trials apart.
  INV-1 to INV-4 are global and are also run over sequences that contain the field events. Revision 2 of the spec
  (the first build was a tap-to-reveal field, never merged) changed 26 to 32 in wording and retired 25; see the
  next line.
- Spec `06-trial-verify-stars`, revision 2: the child no longer "checks" a star by tapping it; a tap only looks, and
  the child decides "real" or "fake". number 25 ("a check marks exactly one star") described the event `CheckStar`,
  which no longer exists, so it is retired (written without the prefix here) and its job is split between INV-39
  (a tap only looks) and INV-33 to INV-35 (a verdict sorts). INV-26 to INV-30 keep their numbers and their idea (a
  round has 1 or 2 fakes; a round is finished only by the keep; the keep takes exactly the real stars; a finished
  round stays; the retry starts the next one) and say "sorted" where they said "checked", and "finished" (kept or
  cleared) where they said "kept". INV-31 says the leave is the one field event that changes more than `field`.
  INV-32 is unchanged. INV-33 to INV-39 are new.
- Retired numbers, never reused: 6, 7 and 25 (as the note above says). Spec `03-trial-tell-vague-request` retired 6 and 7 (one card
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
| INV-15 | Inside a run the clock only runs down and stays between 0 and 60 seconds. Only a `Start`, a `StartShed` or a `LeaveShed` (from the title or an end screen, or out of the shed) sets it back to 60 seconds. | `reducer.pbt.test.ts`, `shed.pbt.test.ts` |
| INV-16 | Inside a run the score never goes down, and it goes up only on an `Ask` that brings the wish (trial 1) or a `GiveTool` that frees the cat (trial 2). A new run or the way back to the title sets it to 0. | `reducer.pbt.test.ts`, `shed.pbt.test.ts` |
| INV-17 | In a trial the clock is above zero and on the end screen it is zero. The end screen changes only on `Start`, `SetLang` and `MoveHeroTo`, and the last two leave the run and the lane alone; the end screen of the shed also takes `StartShed` (play again) and `LeaveShed` (back to the title). | `reducer.pbt.test.ts`, `shed.pbt.test.ts` |
| INV-18 | Picking a tool only picks it: `PickTool` leaves the shed choosing, in the same round, with exactly that one tool picked, and a later pick replaces the earlier one. A tool is tried only by `GiveTool` with a tool picked, and `GiveTool` with none picked returns the same state. | `shed.pbt.test.ts` |
| INV-19 | The tool tried is the tool picked at the hand-over. It is never changed, corrected or taken from somewhere else. | `shed.pbt.test.ts` |
| INV-20 | A tool frees the cat only when it is the answer to this round's puzzle: a tried answer is `freed`, any other tool is `stuck`, and each puzzle has exactly one answer. | `shed.pbt.test.ts` |
| INV-21 | Once a tool is tried, every event except `RetryShed` (and `LeaveShed`) leaves the shed equal: the result and the tried tool stay until the retry. | `shed.pbt.test.ts` |
| INV-22 | `RetryShed` after a try returns to choosing with no tool picked, in the same round after a `stuck` result and in the next round after a `freed` one, and changes nothing else; before a try it returns the same state. | `shed.pbt.test.ts` |
| INV-23 | Shed events return the same state outside a run of trial 2, and inside one change only `shed` (`GiveTool` also scores, so it changes `run` too). `shed` is the initial shed whenever `trial` is not 2. | `shed.pbt.test.ts` |
| INV-24 | In trial 2 the trial 1 events `Ask`, `PickCard` and `Retry` return the same state, so the lane stays initial. | `shed.pbt.test.ts` |
| INV-26 | A round has 1 or 2 fake stars out of the 5, and they are exactly `fakesOf(seed, round)`: the same seed and round always give the same stars. The seed and the round do not change until `RetryField`. | `field.pbt.test.ts` |
| INV-27 | A round is finished (kept or cleared) only by `KeepStars`, and only when all five stars are sorted. `KeepStars` with any star unsorted returns the same state. | `field.pbt.test.ts` |
| INV-28 | The keep accepts exactly the real stars of the round: none is fake, none is missing, and all five were sorted before it. | `field.pbt.test.ts` |
| INV-29 | Once a round is finished, every event except `RetryField` (and `LeaveField` from a cleared trial) leaves the field equal: the result stays until the child moves on. | `field.pbt.test.ts` |
| INV-30 | `RetryField` after a finished round starts the next round (the first after the last): nothing sorted, nothing in the lens, no note, the same seed, and nothing else in the state changes. Before a round is finished it returns the same state. | `field.pbt.test.ts` |
| INV-31 | `InspectStar`, `SortStar`, `KeepStars`, `RetryField` and `LeaveField` return the same state outside trial 3; in trial 3 the first four change only `field`. `field` is the initial field whenever `trial` is not 3. | `field.pbt.test.ts` |
| INV-32 | In trial 3 the events of the other trials (`Ask`, `PickCard`, `Retry`, `Tick`, `PickTool`, `GiveTool`, `RetryShed`) return the same state, so the lane, the run and the shed stay initial: no clock, no score. | `field.pbt.test.ts` |
| INV-33 | A star is sorted only by a verdict on the star in the lens. `SortStar` with no star in the lens returns the same state, and the only star whose mark can change in one event is the star that was in the lens. | `field.pbt.test.ts` |
| INV-34 | The right verdict sorts exactly the star in the lens: that star becomes sorted, the lens closes, the note says what was said, and every other star keeps its mark. | `field.pbt.test.ts` |
| INV-35 | A wrong verdict sorts nothing and never corrects the star for the child: the lens closes, the note says what was said, and no mark changes. The star can be looked at again and sorted rightly, without limit and at no cost. | `field.pbt.test.ts` |
| INV-36 | The clue is there from the start and never hidden: `shineOf` is `bright` for exactly the fake stars, before any tap, while looking, after sorting and after the keep, and it changes only when the round does. | `field.pbt.test.ts` |
| INV-37 | The trial is cleared only by keeping the last round of a run (the second of each two rounds). `KeepStars` in any other round gives a finished round with more to come. | `field.pbt.test.ts` |
| INV-38 | `LeaveField` from the cleared trial returns to the title (`phase` `title`, `trial` 0, `field` initial) and changes nothing else. Anywhere else it returns the same state. | `field.pbt.test.ts` |
| INV-39 | `InspectStar` only looks: for an unsorted star that exists it changes `looking` and clears the note, and nothing else; for a sorted star, the star already in the lens, a star that does not exist, or a finished round it returns the same state. | `field.pbt.test.ts` |
| INV-40 | A hand-over scores once: `GiveTool` with a tool picked adds the points for the streak and extends the streak when the cat is freed, and ends the streak and adds nothing when it is not. No other event moves the score or the streak, but a new run or the way back to the title. | `shed.pbt.test.ts` |
| INV-41 | The puzzle of a round is `puzzleAt(seed, round)`. The seed holds for the whole run, the round grows only by 1 and only by `RetryShed` after a freed cat, and no puzzle repeats the one before it. | `shed.pbt.test.ts` |
| INV-42 | `LeaveShed` from a run or the end screen of trial 2 goes to the title (`phase` `title`, `trial` 0, `shed` initial, the run restarted with only `best` kept) and changes nothing else. Anywhere else it returns the same state. | `shed.pbt.test.ts` |
| INV-43 | `StartShed` from the title or the end screen of trial 2 begins a run: `phase` `trial`, `trial` 2, round 0 of the seed, a full clock, a score of 0, `best` kept. Anywhere else it returns the same state. | `shed.pbt.test.ts` |
