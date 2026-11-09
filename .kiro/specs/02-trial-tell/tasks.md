# Tasks: Trial 1, The Dark Lane

One task per branch and per pull request (`AGENTS.md`). Branch `02-trial-tell/<task>`; each branch is
cut from the one before, and each pull request targets the previous task's branch until that one is
merged. Every task passes `npm run check`; tasks 7 and 8 also pass `npm run build` and `npm run smoke`.
Sized for review on a phone: aim for under 300 changed lines, tests included.

Status: `[ ]` open, `[x]` done. A task fills its **Result** line in its own pull request, with what it
ran and what it saw.

## 1. Spec

- [x] 1.1 Write `requirements.md`, `design.md` and this file.
  - Requirements: all (REQ-2.1 to REQ-2.15)
  - Tests: none (documents). `npm run check` includes `check-trace`, which reads these ids.
  - Result: `npm run check` passes on Node 26.13.0 (see the pull request for the run).

## 2. Domain rules

- [x] 2.1 Add `lane.ts` (types, `initialLane`, `isColor`, `isComplete`, `wishAt`, `outcome`), `lane` in
      `GameState`, `wishes` in `balance.ts`, the events `PickCard`, `Ask`, `Retry`, and the reducer cases. `Start`
      sets `trial` to 1. Update `reducer.test.ts` and `balance.test.ts`; the existing property, model and
      perf files are not touched in this task and still pass unchanged.
  - Requirements: REQ-2.1, REQ-2.2, REQ-2.3, REQ-2.4, REQ-2.5, REQ-2.6, REQ-2.7
  - Tests: `reducer.test.ts` (one case per event, branch and boundary: replace, same card twice,
    ask with 0, 1 and 2 cards, ask twice, pick after ask, retry after wrong and after right, the
    wish wraps, lane events in the title, `Start` twice).
  - Done when: `npm run check` passes with no surviving mutant.
  - Result: `npm run check` passes on Node 26.13.0: 92 tests, 100% coverage on `src/domain`, mutation
    score 100%. A first run left one mutant alive (`Start` in a trial); `Start` is now one expression
    with no branch, because `trial` is already 1 there.

## 3. Property tests

- [x] 3.1 Add INV-5, INV-6 and INV-7 to `domain-invariants.md` with property tests in
      `reducer.pbt.test.ts`; add the lane events to the event arbitrary so INV-1 to INV-4 cover them.
  - Requirements: REQ-2.3, REQ-2.4, REQ-2.5, REQ-2.14
  - Tests: `reducer.pbt.test.ts` (INV-1 to INV-7). Each new property is shown to fail on a
    deliberately broken reducer before it is kept (recorded in the pull request).
  - Done when: `npm run check` passes and `check-trace` reports every INV as tested.
  - Result: `npm run check` passes: 95 tests, mutation score 100%, `check-trace: 7 invariants, 0
    without tests`. Sabotage runs of `lane.ts`, each restored afterwards: Ask without the
    completeness check fails INV-6 and INV-7; picking allowed after a search fails INV-7; the second
    pick searching by itself fails INV-5. A Retry that keeps the pick passes all INV (it is not an
    invariant) and fails two unit tests in `reducer.test.ts`.

## 4. Model check

- [x] 4.1 Extend `reducer.model.test.ts` with the lane alphabet: state invariants, "right result
      reachable from every state" and "choosing reachable from every state". Record the reached
      state count in the test.
  - Requirements: REQ-2.8, REQ-2.14
  - Tests: `reducer.model.test.ts`. The new check is shown to report a soft-lock when `Retry` is
    removed from the alphabet (a case in the test).
  - Done when: `npm run check` passes.
  - Result: `npm run check` passes. The lane model reaches 220 states (4 title, 216 trial), holds
    all four state invariants, and the right result and "choosing" are reachable from every one.
    Without `Retry` in the alphabet the same check reports a soft-lock whose trace ends in `Ask`
    on a wrong result.

## 5. Content

- [x] 5.1 Add the `kind` field and the two object cards to `cards.json`, the `lane` strings to both
      string files, regenerate the subset font (`npm run font`) and add `src/content/__tests__/lane-content.test.ts`.
  - Requirements: REQ-2.9, REQ-2.10, REQ-2.13
  - Tests: card ids and kinds equal the domain's `colors` and `things`; every color has a distinct
    shape and pattern; every message with every item name obeys the Japanese rules; ja and en have
    the same keys. `npm run kid` and `check-font-coverage` pass.
  - Done when: `npm run check` passes.
  - Result: `npm run check` passes (`npm run kid` ok, `check-font-coverage` ok; `npm run font` left the
    subset font byte-identical because every new character is kana or ASCII already in it). The
    content test renders the wrong-result message with all 6 Japanese item names; the longest line
    is 9 characters. kid-reader table in the pull request.

## 6. Game logic modules

- [x] 6.1 Add `lane-layout.ts`, `lane-view.ts` and `pattern.ts` with unit tests.
  - Requirements: REQ-2.2, REQ-2.3, REQ-2.4, REQ-2.5, REQ-2.6, REQ-2.7, REQ-2.10, REQ-2.11
  - Tests: `src/game/__tests__/lane-layout.test.ts` (inside the canvas, no overlaps, at least 80 px,
    hero start clear of every object), `lane-view.test.ts` (message, button, armed, lit slot and
    result mark in both languages for every stage), `pattern.test.ts`.
  - Done when: `npm run check` passes with no surviving mutant.
  - Result: `npm run check` passes: 142 tests, 100% coverage, mutation score 100%. The layout test
    caught a design error: the 56 px button broke the 80 px target rule, so the button is now
    300 x 80 and the wisp, message and button moved up to keep the hero strip free (design table
    updated). A first mutation run left one mutant in the message text (`asked && complete` vs
    `||`); the item name is now inserted only when a lit item exists. `canAsk(lane)` moved into the
    domain so the reducer and the view share one condition.

## 7. Scene

- [x] 7.1 Add `LaneScene.ts` and `ui/art.ts`; hand off from `TitleScene`; register in `boot.ts`. Keep
      the hero drag for presses outside every object.
  - Requirements: REQ-2.1, REQ-2.2, REQ-2.3, REQ-2.5, REQ-2.6, REQ-2.7, REQ-2.10, REQ-2.11, REQ-2.12
  - Tests: no new test file (scenes are excluded, ADR 0003); the existing mobile and desktop smoke
    must still pass unchanged.
  - Done when: `npm run check`, `npm run build` and `npm run smoke` pass; the lane in both languages
    has been looked at on a build.
  - Result: `npm run check` passes (146 tests, mutation score 100%, build and size budget ok). The
    existing smokes pass unchanged on the production build: desktop Chromium, and the mobile test
    on Chromium with the iPhone 13 touch profile (this sandbox cannot start WebKit; CI runs the
    real WebKit project). A scripted tap-only run on the build, in ja and en, went title, pick red
    and lantern, ask, different result, retry, pick yellow and lantern, ask, right result, with no
    page or console errors. Looking at the screenshots found two defects, both fixed: the wisp's
    placeholder square covered the lit item (the lit item and star are now drawn above it), and the
    lantern's caps were invisible on the dark lane (mid-tone caps). I looked at the
    screenshots in the session; they are not attached because this sandbox cannot upload images and
    `e2e/screenshots` is git-ignored. The smoke in CI writes its own screenshots.

## 8. Smoke and docs

- [ ] 8.1 Add the mobile smoke that plays trial 1 with real taps (ja: missing card does nothing,
      wrong item, retry, right item; en: again, offline), and the desktop mouse smoke. Widen the
      state type in `e2e/helpers.ts`. Update `CHANGELOG.md` and the trial 1 line of
      `docs/learning-design.md` only if it now disagrees with the game.
  - Requirements: REQ-2.1, REQ-2.3, REQ-2.4, REQ-2.5, REQ-2.6, REQ-2.7, REQ-2.8, REQ-2.9, REQ-2.11,
    REQ-2.12, REQ-2.14, REQ-2.15
  - Tests: `e2e/smoke.mobile.spec.ts`, `e2e/smoke.desktop.spec.ts`.
  - Done when: `npm run check`, `npm run build` and `npm run smoke` pass.
  - Result:

## Traceability

Filled in as tasks land: each row names the test file that fails when the requirement breaks.

| requirement | task | test | result |
|---|---|---|---|
| REQ-2.1 play from start to retry | 2.1, 7.1, 8.1 | `reducer.test.ts`, `smoke.mobile.spec.ts` | 2.1: `reducer.test.ts` passes |
| REQ-2.2 pick two cards | 2.1, 6.1 | `reducer.test.ts`, `lane-view.test.ts` | 2.1: `reducer.test.ts` passes; 6.1: picked and locked cards in `lane-view.test.ts` |
| REQ-2.3 asked only when asked | 2.1, 3.1 | `reducer.pbt.test.ts` INV-5 | 3.1: holds over random sequences of up to 40 events; fails when a pick searches by itself |
| REQ-2.4 missing card is not a search | 2.1, 3.1, 6.1, 8.1 | `reducer.pbt.test.ts` INV-6, `smoke.mobile.spec.ts` | 3.1: holds; fails when Ask skips the completeness check |
| REQ-2.5 searches exactly what was asked | 2.1, 3.1 | `reducer.pbt.test.ts` INV-7, `lane-view.test.ts` | 3.1: holds; fails when a pick changes after a search |
| REQ-2.6 right result | 2.1, 6.1, 8.1 | `reducer.test.ts`, `smoke.mobile.spec.ts` | 2.1: `lane.test.ts`, `reducer.test.ts` pass |
| REQ-2.7 different request not blamed | 2.1, 5.1, 6.1, 8.1 | `lane-content.test.ts`, `smoke.mobile.spec.ts` | 5.1: no blame word in either language; message says the wisp did as asked |
| REQ-2.8 can always finish | 4.1, 8.1 | `reducer.model.test.ts` | 4.1: 220 states, no violation; soft-lock found without Retry |
| REQ-2.9 Japanese and English | 5.1, 8.1 | `lane-content.test.ts`, `smoke.mobile.spec.ts` | 5.1: same keys in both languages |
| REQ-2.10 color is never the only signal | 5.1, 6.1 | `lane-content.test.ts`, `pattern.test.ts` | 5.1: each color has its own shape and pattern; 6.1: stripes, dots and plain marks and the item art |
| REQ-2.11 portrait, one finger, mouse | 6.1, 8.1 | `lane-layout.test.ts`, both smokes | 6.1: every target at least 80 x 80, all inside 390 x 844, no overlap, hero start clear |
| REQ-2.12 offline after first load | 7.1, 8.1 | `smoke.mobile.spec.ts` (offline run) | 7.1: no request in the scripted run after boot (offline smoke lands in 8.1) |
| REQ-2.13 text in content | 5.1 | `lane-content.test.ts`, `npm run kid` | 5.1: `npm run kid` ok; all item names fit 12 x 2 |
| REQ-2.14 pure rules, checked three ways | 3.1, 4.1, 8.1 | PBT, model check, mobile smoke | |
| REQ-2.15 no gate gets weaker | every task | `npm run check` diff shows no config change | |
