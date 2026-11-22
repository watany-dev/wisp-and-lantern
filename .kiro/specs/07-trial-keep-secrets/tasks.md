# Tasks: Trial 4, The Listening Shadows

One task per branch and per pull request (`AGENTS.md`). This spec was built in one session on one branch
(`07-trial-keep-secrets/trial-4`) and goes into one pull request, because the user asked for the spec and the whole
trial together, and because the tree only builds once the domain, the view and the scenes agree on the events. The
pull request says so. Every task leaves the game working and passes `npm run check`; tasks that connect input to the
screen also pass `npm run build` followed by `npm run smoke`.

Status: `[ ]` open, `[x]` done. A task fills its **Result** line with what it ran and what it saw. Nothing is
recorded as run unless it was run.

How the order keeps each step shippable (REQ-7.14): 2.1 adds the rules and nothing reaches them; 3.1 checks them; 4.1
adds the words without using them; 5.1 adds the screen's logic without drawing it (knip counts the tests as users);
6.1 draws it and changes the title, the only task that makes trial 4 reachable; 7.1 plays it with real taps; 8.1
records it. Nothing reaches the child before 6.1, and trials 1 to 3 are untouched until then.

The authoring sandbox runs Node 22 by default and the repository needs Node 26 (`.nvmrc`), so every result below was
produced on the pinned Node 26.13.0 that `scripts/setup-session.sh` installs into `.cache/node`. WebKit cannot start
here, so the mobile smoke ran on Chromium with the iPhone 13 touch profile through a local config in `.cache/` that is
not committed; CI's WebKit run is what counts. The review rubrics of the `reviewer` and `kid-reader` agents were
applied by hand (the agents were not run), and the pull request says so.

## Tests of the old behavior that this spec changes (REQ-7.14.1)

No test of trials 1 to 3 was deleted or loosened. The ones below changed, each because something they pinned moved on
purpose.

| old test | new test | why trials 1 to 3 are not weaker |
|---|---|---|
| `field-layout.test.ts`, "puts the stars, the wisp and the title's button where the design says": `titleArt` pinned to the wisp at y 538 and the hero at y 548 | the same test, pinned to y 448 and y 458 | The title's art moved up 90 pixels so that three buttons fit (REQ-7.1.1). The tests next to it (the art ends above the buttons, below trial 1's card, inside the canvas; the card holds its prompt and rule and touches no button; the field button is 8 or more above the shed button) are relations and still pass unchanged. The field's and the shed's buttons are pinned where they were |
| `title-view.test.ts`, "gives the title's words in each language", "puts the 60 seconds in ...", "says in each button's caption ..." | the same tests with the third button's label and caption added to each | They only gained expectations: the three buttons' captions have the 60 seconds, no label has a number, none says "no timer" |
| `reducer.test.ts`, `over-view.test.ts`, `route.test.ts` | the same files with trial 4's cases appended | The cases above are byte for byte the same; the new `describe` blocks follow them |
| `e2e/helpers.ts`, the `GameState` type | the same type with the `shadows` field | A type only |

`ui/field-buttons.ts` changed (its `ButtonView` type moved to `button-view.ts`, and its icon drawing became a table with
two more entries). The field's pictures and behavior are unchanged, and the field's smoke passes.

## 1. Spec

- [x] 1.1 Write `requirements.md`, `design.md` and `tasks.md`, with their Japanese translations in `jp/`, and add the
      scope note at the top of the 06 requirements (and its `jp/` copy). Past lines of other specs are not edited.
  - Requirements: REQ-7.1, REQ-7.2, REQ-7.3, REQ-7.4, REQ-7.5, REQ-7.6, REQ-7.7, REQ-7.8, REQ-7.9, REQ-7.10, REQ-7.11, REQ-7.12, REQ-7.13, REQ-7.14
  - Tests: none (documents). `npm run check` includes `check-trace` and the Japanese-text gate (specs are on the
    allowlist).
  - Result: `npm run check` passes (see 8.1). The English files were written first and the Japanese translations from
    the final English text. `check-trace` reports 49 invariants, none without a property test.

## 2. Domain: the rules

- [x] 2.1 Add `src/domain/shadows.ts` (the items, their kinds, `itemAt`, the decision and its grading, `heardItem`,
      `choiceOf`, `reduceShadows`), the four events, `GameState.shadows`, `trials.shadows` and the reducer's
      `startShadows`, `leaveShadows`, `decide`, with `Tick` running in trial 4 and `Start` dropping it. Add INV-46 to
      INV-53 to `.kiro/steering/domain-invariants.md` and widen INV-15 to INV-17.
  - Requirements: REQ-7.3, REQ-7.5, REQ-7.7, REQ-7.8, REQ-7.12.1
  - Tests: `shadows.test.ts` (23 tests: the items and kinds, the four orders pinned for seeds 0 to 4, 9, 23, 24 and
    2^32 - 1, no repeat and no three in a row for 100 seeds from seven starts, each event in each stage, grading,
    what the shadow heard); `reducer.test.ts` (trial 4's entry, events, clock, score, leave and isolation, and that
    pressing the same button every time scores 450 against 1,900 for eight right decisions); `shadows.pbt.test.ts`
    (18 tests: INV-1 to INV-4 and INV-15 to INV-17 with the new events, INV-46 to INV-53, and a check that the
    generator reaches all four decisions, a second decision, an early next, round 6 and beyond, every item, the end
    screen, play again and both leaves)
  - Result: all pass. `shadows.ts`, `reducer.ts` and `state.ts` are at 100% statements, branches, functions and lines.
    Stryker found two surviving mutants in the first version (a redundant `stage === "decided"` guard that gave the
    same answer with or without it); `heardItem` now goes through a tested `choiceOf`, and a Stryker run on
    `shadows.ts` and `shadows-view.ts` alone gave 100.00 before the full run. The guard is the first row added to
    `docs/evidence/didnt-work.md` for this spec.

## 3. Model check

- [x] 3.1 Add `shadows.model.test.ts`: the real reducer wrapped with an independent record of what the child did.
  - Requirements: REQ-7.3, REQ-7.7.7, REQ-7.12.4
  - Tests: `shadows.model.test.ts` (20 tests)
  - Result: all pass in about 1.2 s. The model has 2,664 states with two seeds, both decisions, the leave, both
    languages, two hero places, a short and a run-ending `Tick`, `Start` in a run and the events of trials 1 to 3 that
    must do nothing here. No state is dropped. From every state a right and a wrong decision, each of the four kinds,
    the title and the end screen are reachable; with neither the clock nor the leave, a fresh round, the next round and
    a second right decision are too. The shortest traces are two events for each kind of decision, three for the next
    round and four for a second right decision. Eight deliberate breaks each fail the check meant to notice them, with
    the shortest trace, and the dead-end check passes with the clock or the leave allowed, which is why the check for
    it takes both away (the same finding as the shed's and the field's).

## 4. Content

- [x] 4.1 Add the `shadows` group to `strings.ja.json` and `strings.en.json`, with the content test; run `npm run kid`
      and `npm run font`.
  - Requirements: REQ-7.1.6, REQ-7.4, REQ-7.6, REQ-7.11, REQ-2.9, REQ-2.10, REQ-2.13, REQ-3.6
  - Tests: `shadows-content.test.ts` (21 tests)
  - Result: all pass; `npm run kid` passes. `npm run font` left the subset font file as it was: it already covers every
    character the new Japanese strings use (`check-font-coverage` passes). The content test caught one real defect
    before the view existed: the Japanese `keptSecret` message repeated a line of the closing line, so the message was
    changed to say that the item was kept instead of that it is a secret. The kid-reader rubric was applied by hand
    (words, reading with spaces at phrase breaks, one idea each, the same meaning in both languages, tone, no color).

## 5. View and layout

- [x] 5.1 Add `shadows-view.ts`, `shadows-layout.ts` and `button-view.ts`; add the title's third button and caption,
      the end screen's trial 4 actions and the scene choice; move the title's art up.
  - Requirements: REQ-7.1, REQ-7.2, REQ-7.3, REQ-7.7.4, REQ-7.8.2, REQ-7.9, REQ-7.11.4
  - Tests: `shadows-view.test.ts` (27 tests), `shadows-layout.test.ts` (23 tests), `title-view.test.ts`,
    `over-view.test.ts`, `route.test.ts`, `field-layout.test.ts` (its one pinned number, above)
  - Result: all pass; `shadows-view.ts`, `shadows-layout.ts`, `route.ts`, `over-view.ts` and `title-view.ts` are at 100%
    coverage and have no surviving mutant. The layout test checks the canvas bounds and the absence of overlap in the
    deciding and the decided stages, targets of 80 x 80 or more, the order from the top, the hero's strip, the
    badges' places and the probes, and the title's three buttons, card and art. `button-view.ts` has no executable
    code and shows as 0 of 0 in the coverage table.

## 6. Scene and entrance

- [x] 6.1 Add `ShadowsScene`, the item and shadow art and the widgets, the title's entrance (the padlock button) and
      the end screen's two buttons for trial 4; register the scene.
  - Requirements: REQ-7.1, REQ-7.2, REQ-7.3, REQ-7.7, REQ-7.9, REQ-7.10, REQ-4.9, REQ-4.11
  - Tests: none of its own (scenes and `ui/` are outside coverage and mutation, ADR 0003); the smoke in 7.1
  - Result: `npm run build` passes. The first screenshots were judged by eye: the layout, the shadow, the bubble and the
    badges read well, and the house key looked like a birdhouse on a pole, so it was redrawn as a ring bow with a
    house inside and looked at again. Lint holds the scene and `ui/` to 30 lines a function and complexity 5; `create`
    stays within it because the title's three entrances are made in their own method.

## 7. Smoke

- [x] 7.1 Play trial 4 with real taps and clicks, and read the picture from the pixels.
  - Requirements: REQ-7.1.3, REQ-7.1.6, REQ-7.2, REQ-7.3, REQ-7.7, REQ-7.9.3, REQ-7.9.5, REQ-7.10, REQ-7.13
  - Tests: `smoke.mobile.shadows.spec.ts` (9 tests: entry and the screen in Japanese; the four kinds of decision with a
    quick second tap in English; the order and the streak; time up, play again, the title button from a run and from
    the end screen; grayscale and silence; the title's three buttons in both languages and trial 1 still starting;
    offline in both languages) and `smoke.desktop.shadows.spec.ts` (2 tests: the mouse path, and a held press on a
    button leaving the hero still while a press on the floor walks it)
  - Result: on Chromium with the iPhone 13 touch profile and on desktop Chromium, all 43 smoke tests pass (32 existing
    plus 11 new) with one worker (6.2 min). With the default two workers 41 pass and 2 fail: the trial 1 test
    "REQ-3.7: finishes offline after the first load" in ja and en timed out at the 30 s limit while waiting for the lit
    slot; run alone, or as its whole file, they pass in about 12 s each, and on a clean `main` the same two-worker run
    passes all 32 (3.6 min). So the failure appeared with the new tests present, and it appears only when the two
    workers are busy; no test was changed or given more time, and CI should be watched for it. The readings are
    measured: a badge's disc reads 212 against 44 without it; a quiet bubble reads 28 at all three dots and an item
    bubble never has all three below 90 (its lowest-reading set has a probe at 119 or more); the corner of the bubble
    reads 239 with a bubble and 13 without. Two defects were found by the smoke and not by the unit tests: the tick's
    gold frame passed through the padlock's first probe, and the desktop test pressed a button inside the 450 ms lock
    (`docs/evidence/didnt-work.md`). Not run: WebKit, a real phone, the weekly device pass.

## 8. Final integration

- [x] 8.1 Record trial 4 in the changelog, the learning design, the checklists, the evidence and the steering
      invariants; run the whole check.
  - Requirements: REQ-7.14, REQ-4.9, REQ-4.11, REQ-2.12, REQ-2.15, REQ-3.9, REQ-5.15, REQ-6.14
  - Tests: `npm run check`
  - Result: `npm run check` passes on Node 26.13.0 (exit 0): format, lint and types pass; knip passes; 47 test files,
    1,041 tests; coverage 100% statements (532 of 532), branches (374 of 374), functions (175 of 175) and lines (465
    of 465); `npm run verify` (licenses, kid strings, font coverage, evidence, trace with 49 invariants and none
    without a property test) passes; Stryker: 1,360 killed, 1 timed out, 0 survived, 7 Stryker errors, all in files this
    spec did not change (6 in `field-view.ts`, 1 in `shed-view.ts`; Stryker was not run on `main` here, so they are
    not compared with it), 15 minutes 49 seconds; the production build
    passes and the gzip JS is 368.1 KB of 1,024 KB. ShellCheck was skipped by `lint-shell.sh` because the sandbox has
    neither the binary nor Docker (CI runs it). Not run here: `npm audit`, Semgrep, gitleaks, zizmor, zghalint and the
    `perf` job (they need the network, Docker or the base branch), and the CI smoke on WebKit. The work is not called
    done before CI's smoke is green.
