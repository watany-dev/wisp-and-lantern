# Tasks: Trial 5, The Flickering Lantern

One task per branch and per pull request (`AGENTS.md`). This spec is built in one session on one branch
(`08-trial-tell-whats-wrong/trial-5`) and goes into one pull request, because the user asked for the spec and the whole
trial together, and because the tree only builds once the domain, the view and the scenes agree on the events. The
pull request says so. Every task leaves the game working and passes `npm run check`; tasks that connect input to the
screen also pass `npm run build` followed by `npm run smoke`.

Status: `[ ]` open, `[x]` done. A task fills its **Result** line with what it ran and what it saw. Nothing is recorded
as run unless it was run.

How the order keeps each step shippable (REQ-8.16): 2.1 adds the rules and nothing reaches them; 3.1 checks them; 4.1
adds the words without using them; 5.1 adds the screen's logic without drawing it (knip counts the tests as users); 6.1
draws it and changes the title, the only task that makes trial 5 reachable; 7.1 plays it with real taps; 8.1 records
it. Nothing reaches the child before 6.1, and trials 1 to 4 are untouched until then.

The authoring sandbox runs Node 22 by default and the repository needs Node 26 (`.nvmrc`), so every result below was
produced on the pinned Node 26.13.0 that `scripts/setup-session.sh` installs into `.cache/node`. WebKit cannot start
here, so the mobile smoke ran on Chromium with the iPhone 13 touch profile through a local config in `.cache/` that is
not committed; CI's WebKit run is what counts. The review rubrics of the `reviewer` and `kid-reader` agents were
applied by hand (the agents were not run), and the pull request says so.

## Tests of the old behavior that this spec changes (REQ-8.16.1)

No test of trials 1 to 4 was deleted, and no threshold or invariant changed. The ones below changed: the first four
because something they pinned moved on purpose, the last because it was flaky on `main` and the full check of this
spec hit it. That last change narrows which generated steps three properties judge; the reviewer should weigh it.

| old test | new test | why trials 1 to 4 are not weaker |
|---|---|---|
| `field-layout.test.ts`, "puts the stars, the wisp and the title's button where the design says": `titleArt` pinned to the wisp at y 448 and the hero at y 458 | the same test, pinned to y 360 and y 370 | The title's art moved up 88 pixels so that four buttons fit (REQ-8.1.1). The relations next to it (the art ends above the buttons, below trial 1's card, inside the canvas; the card holds its prompt and rule and touches no button) still pass unchanged, and `lantern-layout.test.ts` pins the new name, card, prompt and rule. The shed's, the field's and the shadows' buttons are pinned where they were |
| `title-view.test.ts`, "gives the title's words in each language", "puts the 60 seconds in ...", "says in each button's caption ..." | the same tests with the fourth button's label and caption added | They only gained expectations |
| `reducer.test.ts`, `over-view.test.ts`, `route.test.ts` | the same files with trial 5's cases appended | The cases above are byte for byte the same; the new `describe` blocks follow them |
| `e2e/helpers.ts`, the `GameState` type | the same type with the `lantern` field | A type only |
| `field.pbt.test.ts`, `shed.pbt.test.ts`, `shadows.pbt.test.ts`: INV-15, INV-16 and the trial's scoring invariant (INV-44, INV-40, INV-49) judged every step of a generated sequence | the same properties judge the steps that start or end in their own trial | They were flaky on `main`: the generators open another trial from the title, whose events score and run the clock by that trial's rules (the field's INV-16 and INV-44 failed with seed -2132514310 on a clean `main`; at 3,000 runs the shed's and the shadows' failed the same way). Every step inside the trial is judged as before, and the other trial's steps are judged by that trial's own file. Eight runs of the whole domain suite at 3,000 runs each pass. The seed is in `pbt-regressions.json` |

`button-view.ts` gained the nine looks in `ButtonIcon`, and `ui/field-buttons.ts` merges `ui/look-icons.ts` into its
table. The pictures and behavior of trials 3 and 4 are unchanged, and their smoke passes.

## 1. Spec

- [x] 1.1 Write `requirements.md`, `design.md` and `tasks.md`, with their Japanese translations in `jp/`, and add the
      scope note at the top of the 07 requirements (and its `jp/` copy). Past lines of other specs are not edited.
  - Requirements: REQ-8.1, REQ-8.2, REQ-8.3, REQ-8.4, REQ-8.5, REQ-8.6, REQ-8.7, REQ-8.8, REQ-8.9, REQ-8.10, REQ-8.11, REQ-8.12, REQ-8.13, REQ-8.14, REQ-8.15, REQ-8.16
  - Tests: none (documents). `npm run check` includes `check-trace` and the Japanese-text gate (specs are on the
    allowlist).
  - Result: `npm run check` passes (see 8.1). The English files were written first and changed during the build
    where the build found a better rule (the cards' order and the cycles of sides, REQ-8.5.1, REQ-8.8.4); the
    Japanese translations were written from the final English text. `check-trace` reports 58 invariants, none without a
    property test. It also warns that REQ-7.4 and REQ-7.6 are cited in this spec's requirements (as inherited rules of
    spec 07) and are in neither its tests nor this file; they are listed under 4.1 now.

## 2. Domain: the rules

- [x] 2.1 Add `src/domain/lantern.ts` (the parts and looks, `wishAt`, `faultAt`, `broughtAt`, `flickerOf`, `cardsOf`,
      `fixRight`, `shapeOf`, `reduceLantern`), the five events, `GameState.lantern`, `trials.lantern` and the reducer's
      `startLantern`, `leaveLantern`, `fix`, with `Tick` running in trial 5 and `Start` dropping it. Add INV-54 to INV-62
      to `.kiro/steering/domain-invariants.md` and widen INV-15 to INV-17.
  - Requirements: REQ-8.3, REQ-8.4, REQ-8.5, REQ-8.6, REQ-8.8, REQ-8.9, REQ-8.10, REQ-8.14.1
  - Tests: `lantern.test.ts`, `reducer.test.ts` (trial 5's cases appended), `lantern.pbt.test.ts`
  - Result: all pass: `lantern.test.ts` 29 tests (parts and looks; wishes, fault parts and sides pinned for seeds 0 to
    3, 27, 81, 242, 243 and 2^32 - 1; one differing part, every part changing and the fault moving for 100 seeds; the
    sides never three in a row and on both sides in every six rounds for 100 seeds; each event in each stage; the
    cards; the grading); `reducer.test.ts` 173 tests in all, with trial 5's entry, events, clock, score, leave and
    isolation, and the pinned scores for eight rounds of seed 0: 1,900 for eight right cards, 1,000 for the left card
    first and 1,050 for the right card first; `lantern.pbt.test.ts` 19 tests (INV-1 to INV-4, INV-15 to INV-17, INV-54
    to INV-62, and a check that the generator reaches every kind of point and card, an early next, round 6 and beyond,
    every fault part, the end screen, play again and both leaves). The first generator did not reach round 6; more
    right cards and more "Next" in each attempt fixed it. The full check later found a sequence that left trial 5 and
    scored in trial 4, which INV-16's property had judged as trial 5's; INV-15, INV-16 and INV-58 now judge only the
    steps that start or end in trial 5, and the seed is in `pbt-regressions.json`. `lantern.ts` and `reducer.ts` are at 100% coverage and have
    no surviving mutant (a Stryker run on `lantern.ts`, `lantern-layout.ts` and `lantern-view.ts`).

## 3. Model check

- [x] 3.1 Add `lantern.model.test.ts`: the real reducer wrapped with an independent record of what the child did.
  - Requirements: REQ-8.4, REQ-8.5, REQ-8.9.7, REQ-8.14.4
  - Tests: `lantern.model.test.ts`
  - Result: all 19 pass in about 3 s. The model has 4,996 states with two seeds, a point at every part, a card for
    every look, the leave, both languages, two hero places, a short and a run-ending `Tick`, `Start` in a run and the
    events of trials 1 to 4. No state is dropped. Shortest traces: two events to point or to be told a part is fine,
    three to a lit lantern or a wrong card, four to the next round, six to a second lit lantern; after a wrong card the
    right card is two events away. Eight deliberate breaks each fail the check meant to notice them; the break "a point
    at a steady part opens its cards" runs on trial 5's own events, because with the full alphabet the broken game
    passes 100,000 states (`docs/evidence/didnt-work.md`).

## 4. Content

- [x] 4.1 Add the `lantern` group to `strings.ja.json` and `strings.en.json`, with the content test; run `npm run kid`
      and `npm run font`.
  - Requirements: REQ-8.1.6, REQ-8.7, REQ-8.13, REQ-2.9, REQ-2.10, REQ-2.13, REQ-3.6, REQ-7.4, REQ-7.6
  - Tests: `lantern-content.test.ts`
  - Result: `lantern-content.test.ts` 21 tests pass; `npm run kid` passes. `npm run font` left the subset font file as
    it was: it already covers every character the new strings use, the corner brackets included
    (`check-font-coverage` passes). The English panel label "The wisp's lantern" and the Japanese
    `ウィスプの ランタン` replaced a first "The wisp brought" / `ウィスプが もってきた`, because trial 4's fear list in
    Japanese matches `てき` inside `もってきた`; the list here leaves `てき` in place and the words avoid it. The
    kid-reader rubric was applied by hand (words, phrase breaks, one idea each, the same meaning in both languages,
    tone, no color). REQ-7.4 and REQ-7.6 (the tone and the closing line of trial 4, inherited as REQ-8.7) are checked
    here in their trial 5 form.

## 5. View and layout

- [x] 5.1 Add `lantern-view.ts` and `lantern-layout.ts`; add the title's fourth button and caption, the end screen's
      trial 5 actions and the scene choice; move the title's name, card and art up; add the nine looks to `ButtonIcon`.
  - Requirements: REQ-8.1, REQ-8.2, REQ-8.3, REQ-8.4, REQ-8.5, REQ-8.6, REQ-8.9.4, REQ-8.10.2, REQ-8.11, REQ-8.13.4
  - Tests: `lantern-view.test.ts`, `lantern-layout.test.ts`, `title-view.test.ts`, `over-view.test.ts`,
    `route.test.ts`, `field-layout.test.ts` (its pinned `titleArt`)
  - Result: all pass: `lantern-view.test.ts` 19 tests, `lantern-layout.test.ts` 23 tests, and the changed
    title, end-screen, route and field-layout tests. `lantern-view.ts`, `lantern-layout.ts`, `route.ts`, `over-view.ts`
    and `title-view.ts` are at 100% coverage. Stryker kept two mutants in the first `lantern-view.ts` (stage guards
    that gave the same answer without them); both helpers are switches on the stage now, and a Stryker run on the file
    gave 100.00.

## 6. Scene and entrance

- [x] 6.1 Add `LanternScene`, the lantern art, the look icons and the stage widget, the title's entrance (the lantern
      button) and the end screen's two buttons for trial 5; register the scene.
  - Requirements: REQ-8.1, REQ-8.2, REQ-8.3, REQ-8.4, REQ-8.5, REQ-8.6, REQ-8.9, REQ-8.11, REQ-8.12, REQ-4.9, REQ-4.11
  - Tests: none of its own (scenes and `ui/` are outside coverage and mutation, ADR 0003); the smoke in 7.1
  - Result: `npm run build` passes. The screenshots were judged by eye in both languages: the two panels compare row
    by row, the frame of dots, the solid frame, the tick and the bright light read at a glance, the cards' pictures
    (ring, bow) are clear, and the title's four buttons fit under the art. The first title picture was trial 1's
    lantern drawn in gold, which disappeared on the gold button; it is drawn with an orange glass now. Lint holds the
    scene and `ui/` to 30 lines a function and complexity 5.

## 7. Smoke

- [x] 7.1 Play trial 5 with real taps and clicks, and read the picture from the pixels.
  - Requirements: REQ-8.1.3, REQ-8.1.6, REQ-8.2, REQ-8.3, REQ-8.4, REQ-8.5, REQ-8.6, REQ-8.9, REQ-8.11.3, REQ-8.11.5, REQ-8.12, REQ-8.15
  - Tests: `smoke.mobile.lantern.spec.ts`, `smoke.desktop.lantern.spec.ts`
  - Result: on Chromium with the iPhone 13 touch profile and on desktop Chromium, all 54 smoke tests pass (43 existing
    plus 11 new: 9 mobile, 2 desktop) with one worker, in 10.2 minutes, on the final build. One earlier run failed the
    new desktop hero test, which did not rig the seed and drew one that flickers in the roof it held; it rigs seed 0
    now and passed three runs in a row, then the whole run above. Not run: WebKit, a real phone, the weekly device
    pass, and the default two-worker run.

## 8. Final integration

- [x] 8.1 Record trial 5 in the changelog, the learning design (L5 and the trial 5 row), the product steering, the
      checklists, the evidence and the steering invariants; run the whole check.
  - Requirements: REQ-8.16, REQ-4.9, REQ-4.11, REQ-2.12, REQ-2.15, REQ-3.9, REQ-5.15, REQ-6.14, REQ-7.14
  - Tests: `npm run check`
  - Result: `npm run check` passes on Node 26.13.0 (exit 0): format, lint and types pass; knip passes; 53 test files,
    1,204 tests; coverage 100% statements (672 of 672), branches (446 of 446), functions (220 of 220) and lines (584
    of 584); `npm run verify` (licenses, kid strings, font coverage, evidence, trace with 58 invariants and none
    without a property test) passes; Stryker: 1,649 killed, 1 timed out, 0 survived, 14 Stryker errors, 100.00, in 19
    minutes 11 seconds; the production build passes and the gzip JS is 371.6 KB of 1,024 KB. ShellCheck was skipped
    by `lint-shell.sh` (neither the binary nor Docker here; CI runs it). The first two full runs failed in Stryker's
    initial test run on property tests (trial 5's, then trial 3's on a seed that fails on `main` too); both are fixed
    (above and `docs/evidence/didnt-work.md`). After the passing run only the desktop smoke spec (7.1) and documents
    changed; `vp check` passes on them. Not run here: `npm audit`, Semgrep, gitleaks, zizmor, zghalint and the `perf`
    job (they need the network, Docker or the base branch), and the CI smoke on WebKit. The work is not called done
    before CI's smoke is green.
