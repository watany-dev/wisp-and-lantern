# Tasks: Trial 2, The Locked Shed

One task per branch and per pull request (`AGENTS.md`). Branch `05-trial-grant-tools/<task>`, cut from
`main` after the previous task is merged. Every task leaves the game working and passes `npm run check`;
tasks 6.1, 7.1 and 8.1 also pass `npm run build` followed by `npm run smoke`. Sized for review on a
phone: aim for a few hundred changed lines, tests included. A task that is larger says why in its pull
request.

Status: `[ ]` open, `[x]` done. A task fills its **Result** line in its own pull request, with what it
ran and what it saw. Nothing is recorded as run unless it was run.

How the order keeps each step shippable (REQ-5.15): 2.1 adds the rules and nothing reaches them; 3.1
checks them; 4.1 adds the words without using them; 5.1 adds the screen's logic without drawing it
(knip counts the tests as users); 6.1 draws it and adds the title's button, the only task that makes the
shed reachable; 7.1 plays it with real taps; 8.1 records it. Nothing reaches the child before 6.1, and
trial 1 is untouched until then.

The smoke runs on Chromium with the iPhone 13 touch profile in the authoring sandbox (WebKit cannot
start there); CI runs the real WebKit pass and counts. The review rubrics of the `reviewer` and
`kid-reader` agents are applied by hand when the agents cannot be run, and each pull request says which
it was.

## Tests of the old behavior that this spec replaces (REQ-5.15.1)

No existing test is expected to change: the shed events are new, trial 1's events keep their behavior
in trial 1, and the new guard (`trial` is 1) is true for every state the old tests reach. If one does
need to change, it is named here with its new test and why trial 1's guarantee is not weaker.

| old test | file | replaced in | by | why trial 1 is not weaker |
|---|---|---|---|---|
| (none) | | | | |

## 1. Spec

- [x] 1.1 Write `requirements.md` with its Japanese translation, and add a scope note at the top of the
      02 and 04 requirements (and their `jp/` copies). Past lines are not edited.
  - Requirements: REQ-5.1, REQ-5.2, REQ-5.3, REQ-5.4, REQ-5.5, REQ-5.6, REQ-5.7, REQ-5.8, REQ-5.9, REQ-5.10, REQ-5.11, REQ-5.12, REQ-5.13, REQ-5.14, REQ-5.15
  - Tests: none (documents). `npm run check` includes `check-trace` and the Japanese-text gate (specs
    are on the allowlist).
  - Result: `npm run check` passes on Node 26.13.0 (after `git add`, since `check-submission.sh` reads
    `git ls-files`; `check-trace: 15 invariants, 0 without tests`). Pull request #60: all required CI
    checks green (`actions`, `static`, `test`, `mutation`, `sast`, `perf`, `build`, `smoke`, `secrets`,
    `guard`); merged. Nothing outside `.kiro/specs/` changed.

- [x] 1.2 Write `design.md` and this file, with the Japanese translation.
  - Requirements: REQ-5.1, REQ-5.2, REQ-5.3, REQ-5.4, REQ-5.5, REQ-5.6, REQ-5.7, REQ-5.8, REQ-5.9, REQ-5.10, REQ-5.11, REQ-5.12, REQ-5.13, REQ-5.14, REQ-5.15
  - Tests: none (documents)
  - Result: `npm run check` passes on Node 26.13.0 (`check-trace: 15 invariants, 0 without tests`; no
    `REQ-5.n` is left out of this file, so its warnings are gone). Pull request #61: all required CI checks
    green; merged. Nothing outside `.kiro/specs/` changed.

## 2. Domain: the shed rules

- [x] 2.1 Add `shed.ts` (tools, `Shed`, `reduceShed`, `opensDoor`, `shedOutcome`, `triedTool`,
      `canGive`), the events `StartShed`, `PickTool`, `GiveTool` and `RetryShed`, `GameState.shed` and
      `trials`, and the reducer cases with the `trial` guards. Add INV-18 to INV-24 to
      `domain-invariants.md` with their property tests, in the same pull request. Nothing in
      `src/game/` calls the new code, so the game does not change.
  - Requirements: REQ-5.3, REQ-5.4, REQ-5.5, REQ-5.6, REQ-5.7, REQ-5.9, REQ-5.13
  - Invariants: INV-18 to INV-24 (new); INV-3 and INV-4 re-run with the shed events
  - Tests:
    - `shed.test.ts`: every event in each stage; each of the three tools gives the result in the design's
      table; a pick replaced; picking is not handing over; `GiveTool` with none picked; the lock after a
      hand-over; the retry; `opensDoor` for every tool.
    - `reducer.test.ts` (new cases only): `StartShed` from the title and nowhere else; the shed events outside
      the shed; `Ask`, `PickCard`, `Retry` and `Tick` in the shed; `Start` and `SetLang` in the shed;
      `lane` and `run` untouched.
    - `shed.pbt.test.ts`: INV-3 and INV-4 over sequences with the shed events; INV-18 to INV-24 each by
      `checkProperty`; a coverage test that the generator hands over every tool, replaces a pick,
      retries after both kinds of result, and replays after a success.
  - Done when: `npm run check` passes with no surviving mutant, `check-trace` reports 22 invariants with
    none untested, and each new property and unit case is shown to fail on a deliberately broken reducer
    (recorded below).
  - Result: `npm run check` passes on Node 26.13.0: 351 tests (54 new on 297: 26 in `shed.test.ts`, 14 in
    `shed.pbt.test.ts`, 14 in `reducer.test.ts`), coverage 100% on every metric, mutation score 100%
    (485 mutants, none survived; the first run had none either), `check-trace: 22 invariants, 0 without
    tests`, size budget ok. No existing test was edited: the change to `reducer.test.ts` is appended cases.
    **Deliberate breaks** (each applied to `shed.ts` or `reducer.ts`, the four test files run, then
    restored; the list is every break I made): the hammer opens the door too fails 4 tests (INV-20 and
    3 unit); `GiveTool` always tries the key fails 8 (INV-19, the unit cases per tool, the coverage test);
    `PickTool` also replaces after a try fails 4 (INV-21); `PickTool` changes the tried tool fails 3
    (INV-21); `RetryShed` keeps the tool as the pick fails 7 (INV-21, INV-22); shed events act outside
    trial 2 fails 2 (INV-23); `Tick` runs the clock in the shed fails 3 (INV-24); `PickCard` acts in the
    shed fails 2 (INV-24); `GiveTool` with nothing picked tries the key fails 4 (INV-18, INV-19);
    `StartShed` from any phase fails 1 (unit); `StartShed` that also starts the run fails 2 (unit). One
    gap I noticed: `StartShed` that restarts the run leaves INV-24 green, because `restartRun` of the
    initial run equals the initial run; the unit tests catch it. INV-3 and INV-4 were run over the new
    events and pass. Nothing in `src/game/` changed, so no smoke was needed for this task (the existing 11
    were not re-run here).

## 3. Model check

- [ ] 3.1 Add `shed.model.test.ts`: the entrance from the title and the shed after it, with the alphabet,
      invariants, goals and witnesses in the design, and the deliberate breaks with their counterexamples.
      The trial 1 model checks are not changed.
  - Requirements: REQ-5.6, REQ-5.13
  - Tests: `shed.model.test.ts`: the number of reached states; invariants hold; goals 1 to 3; a key
    `open`, a broom `shut` and a hammer `shut` are each reachable (shortest trace); a `shut` result leads
    back to a fresh choosing; each deliberate break fails with its counterexample.
  - Done when: `npm run check` passes; the Result lists the state count and the counterexamples.
  - Result: filled in the task's pull request

## 4. Content

- [ ] 4.1 Add the `shed` group to both string files, regenerate the subset font, and add
      `shed-content.test.ts`. Nothing reads the new keys yet. The closing line's wording is decided here
      with the kid-reader rubric.
  - Requirements: REQ-5.1, REQ-5.6, REQ-5.8, REQ-5.12; inherited REQ-2.9, REQ-2.13, REQ-3.6
  - Tests: `shed-content.test.ts`: same keys in both languages; `{0}` once in `ready`, `open`, `shut` and
    `lesson` and nowhere else; the Japanese rules for every tool name in all four; English lines at most
    24 characters (messages) and 20 (closing line); no blame words; no claims about real AI, real keys or
    passwords; the closing line shares no sentence with the open message; `ready` and `pick` do not
    suggest a second tool. `npm run kid` and `npm run font` pass.
  - Done when: `npm run check`, `npm run kid` and `npm run font` pass; the kid-reader table is in the pull
    request and says whether it is the agent or the manual rubric.
  - Result: filled in the task's pull request

## 5. View and layout

- [ ] 5.1 Add `shed-layout.ts`, `shed-view.ts` and `route.ts`, with unit tests. Nothing in a scene calls
      them yet.
  - Requirements: REQ-5.2, REQ-5.3, REQ-5.4, REQ-5.5, REQ-5.6, REQ-5.8, REQ-5.9, REQ-5.10; inherited REQ-2.10
  - Tests: `shed-view.test.ts` (per stage and language: message, button, armed, tools, marks, picture,
    lesson only on open, wisp target, the tool name in the message equals the tried tool, all three tools);
    `shed-layout.test.ts` (inside the canvas, no overlap per stage, targets at least 80, the hero strip
    free, the probes inside the picture); `route.test.ts` (`sceneFor` for every phase and trial).
  - Done when: `npm run check` passes with no surviving mutant.
  - Result: filled in the task's pull request

## 6. Scene and entrance

- [ ] 6.1 Draw the shed (`ui/shed-art.ts`, `ui/cat.ts`, `ui/tools.ts`, `ui/tool-card.ts`,
      `shed-palette.ts`), add `ShedScene`, register it, and add the title's shed button with the
      "press hit no object" guard and `sceneFor`.
  - Requirements: REQ-5.1, REQ-5.2, REQ-5.5, REQ-5.9, REQ-5.10, REQ-5.11; inherited REQ-4.9, REQ-4.11
  - Tests: scenes are excluded from unit tests (ADR 0003). `npm run check`, `npm run build` and the
    existing 11 smoke tests pass (trial 1 and the score attack are unchanged). The built page is driven
    by real taps and looked at in screenshots in both languages and all three tools.
  - Done when: the above, and the screenshots were read.
  - Result: filled in the task's pull request

## 7. Smoke

- [ ] 7.1 Add the shed smoke: `e2e/shed-helpers.ts`, `smoke.mobile.shed.spec.ts`,
      `smoke.desktop.shed.spec.ts`, and the `shed` field in the `GameState` type of `e2e/helpers.ts`.
  - Requirements: REQ-5.1, REQ-5.3, REQ-5.4, REQ-5.5, REQ-5.6, REQ-5.7, REQ-5.8, REQ-5.9, REQ-5.10, REQ-5.12, REQ-5.14; inherited REQ-2.12
  - Tests: mobile, real taps: no tool and a tap on the wisp; broom, hand over, shut, retry, key, open,
    key name, closing line; hammer, hand over, shut, retry, key, open, closing line; a pick replaced; the
    lock while a result shows; a replay after a success; the pixels of the door, the cat, the tool names
    and the closing line; ja and en screenshots; offline in both languages. Desktop, mouse: the same
    path, and a held press on a tool does not move the hero.
  - Done when: `npm run check`, `npm run build` and `npm run smoke` pass (Chromium here; CI runs
    WebKit); the new tests are shown to fail when the scene is broken on purpose.
  - Result: filled in the task's pull request

## 8. Final integration

- [ ] 8.1 Record the change: `CHANGELOG.md`, the trial 2 row in `docs/learning-design.md`, and the
      Result lines of this file; run everything once more on the merged `main`.
  - Requirements: REQ-5.13, REQ-5.14, REQ-5.15; inherited REQ-2.15, REQ-3.9, REQ-4.8
  - Tests: `npm run check`, `npm run build`, `npm run smoke`, `npm run mutation`; the trial 1 smoke
    (including the score attack) unchanged and green.
  - Done when: CI's `smoke` (WebKit) is green on the final pull request. Until then the work is not
    called done.
  - Result: filled in the task's pull request
