# Tasks: Trial 3, The Wisp Field

One task per branch and per pull request (`AGENTS.md`). Branch `06-trial-verify-stars/<task>`, cut from
`main` after the previous task is merged. Every task leaves the game working and passes `npm run check`;
tasks 6.1, 7.1 and 8.1 also pass `npm run build` followed by `npm run smoke`. Sized for review on a phone:
aim for a few hundred changed lines, tests included. A task that is larger says why in its pull request.

**This spec was built in one session, on one branch and in one pull request**
(`06-trial-verify-stars/trial-3`), with one commit per task, because the request asked for the whole
trial in one change. The tasks below are still the order of the commits and the unit of review. The
pull request says so under Decisions.

Status: `[ ]` open, `[x]` done. A task fills its **Result** line with what it ran and what it saw. Nothing
is recorded as run unless it was run.

How the order keeps each step shippable (REQ-6.14): 2.1 adds the rules and nothing reaches them; 3.1
checks them; 4.1 adds the words without using them; 5.1 adds the screen's logic without drawing it (knip
counts the tests as users); 6.1 draws it and adds the title's button, the only task that makes the field
reachable; 7.1 plays it with real taps; 8.1 records it. Nothing reaches the child before 6.1, and trials 1
and 2 are untouched until then.

The smoke runs on Chromium with the iPhone 13 touch profile in the authoring sandbox (WebKit cannot start
there); CI runs the real WebKit pass and counts. The review rubrics of the `reviewer` and `kid-reader`
agents are applied by hand when the agents cannot be run, and the pull request says which it was.

## Tests of the old behavior that this spec replaces (REQ-6.14.1)

No existing test is expected to change: the field events are new, the other trials' events keep their
behavior in their own trials, and every guard already tests its own trial number. If one does need to
change, it is named here with its new test and why trials 1 and 2 are not weaker.

| old test | file | replaced in | by | why trials 1 and 2 are not weaker |
|---|---|---|---|---|
| (none) | | | | |

## 1. Spec

- [ ] 1.1 Write `requirements.md` with its Japanese translation, and add a scope note at the top of the
      05 requirements (and its `jp/` copy). Past lines are not edited.
  - Requirements: REQ-6.1, REQ-6.2, REQ-6.3, REQ-6.4, REQ-6.5, REQ-6.6, REQ-6.7, REQ-6.8, REQ-6.9, REQ-6.10, REQ-6.11, REQ-6.12, REQ-6.13, REQ-6.14
  - Tests: none (documents). `npm run check` includes `check-trace` and the Japanese-text gate (specs
    are on the allowlist).
  - Result:

- [ ] 1.2 Write `design.md` and this file, with the Japanese translation.
  - Requirements: REQ-6.1, REQ-6.2, REQ-6.3, REQ-6.4, REQ-6.5, REQ-6.6, REQ-6.7, REQ-6.8, REQ-6.9, REQ-6.10, REQ-6.11, REQ-6.12, REQ-6.13, REQ-6.14
  - Tests: none (documents)
  - Result:

## 2. Domain: the field rules

- [ ] 2.1 Add `field.ts` (the round table, `Field`, `reduceField`, `fakesOf`, `isFake`, `markOf`,
      `fieldOutcome`, `keptStars`), the events `StartField`, `CheckStar`, `KeepStars` and `RetryField`,
      `GameState.field` and `trials.field`, and the reducer cases with the `trial` guards. Add INV-25 to
      INV-32 to `domain-invariants.md` with their property tests, in the same pull request. Nothing in
      `src/game/` calls the new code, so the game does not change.
  - Requirements: REQ-6.3, REQ-6.4, REQ-6.5, REQ-6.7, REQ-6.8, REQ-6.12
  - Invariants: INV-25 to INV-32 (new); INV-3 and INV-4 re-run with the field events
  - Tests:
    - `field.test.ts`: every event in each stage; the round table (1 or 2 fakes, four different sets,
      the first after the last); `markOf` for a real and a fake star; a recheck; an index out of range;
      an early keep; a keep when complete (the kept stars are the real ones, every round); the lock after
      the keep; the retry before and after; the wrap after four rounds.
    - `reducer.test.ts` (new cases only): `StartField` from the title and nowhere else; the field events
      outside the field; the other trials' events and `Tick` in the field; `Start` and `SetLang` in the
      field; `lane`, `run` and `shed` untouched.
    - `field.pbt.test.ts`: INV-3 and INV-4 over sequences with the field events; INV-25 to INV-32 each by
      `checkProperty`; a coverage test that the generator checks every star, rechecks, uses an index out
      of range, keeps early, keeps when complete, retries after the keep, and goes round the whole table.
  - Done when: `npm run check` passes with no surviving mutant, `check-trace` reports 30 invariants with
    none untested, and each new property and unit case is shown to fail on a deliberately broken reducer
    (recorded below).
  - Result:

## 3. Model check

- [ ] 3.1 Add `field.model.test.ts`: the entrance from the title and the field after it, with the
      alphabet, invariants, goals and witnesses in the design, and the deliberate breaks with their
      counterexamples. The model checks of trials 1 and 2 are not changed.
  - Requirements: REQ-6.5, REQ-6.7, REQ-6.12
  - Tests: `field.model.test.ts`: the number of reached states; invariants hold; goals 1 to 3; a fake
    found, a real found, the kept result and the second kept result are each reachable (shortest trace);
    a kept result leads to a fresh next round; each deliberate break fails with its counterexample.
  - Done when: `npm run check` passes; the Result lists the state count and the counterexamples.
  - Result:

## 4. Content

- [ ] 4.1 Add the `field` group to both string files, regenerate the subset font, and add
      `field-content.test.ts`. Nothing reads the new keys yet. The wording is decided here with the
      kid-reader rubric.
  - Requirements: REQ-6.1, REQ-6.4, REQ-6.6, REQ-6.11; inherited REQ-2.9, REQ-2.13, REQ-3.6
  - Tests: `field-content.test.ts`: same keys in both languages; `{0}` once in `kept` and nowhere else;
    the Japanese rules for every string and for the number inserted; English lines at most 24
    characters; no blame words and no word that makes the wisp a liar; no claims about real AI; the
    closing line shares no sentence with the kept message; the fake message says the wisp mixed it up;
    the guide names both steps. `npm run kid` and `npm run font` pass.
  - Done when: `npm run check`, `npm run kid` and `npm run font` pass; the kid-reader table is in the pull
    request and says whether it is the agent or the manual rubric.
  - Result:

## 5. View and layout

- [ ] 5.1 Add `field-layout.ts`, `field-view.ts` and the `field` scene in `route.ts`, with unit tests.
      Nothing in a scene calls them yet.
  - Requirements: REQ-6.2, REQ-6.3, REQ-6.4, REQ-6.5, REQ-6.6, REQ-6.7, REQ-6.8, REQ-6.9; inherited REQ-2.10
  - Tests: `field-view.test.ts` (per stage and language: message, button, stars, labels, ticks, alpha,
    lesson only when kept, the message follows the star checked last, the keep button only when all are
    checked); `field-layout.test.ts` (inside the canvas, no overlap per stage, targets at least 80, the
    hero strip free, the probes inside their slots, the title's two buttons apart and below the art);
    `route.test.ts` (`sceneFor` for every phase and trial, added cases).
  - Done when: `npm run check` passes with no surviving mutant.
  - Result:

## 6. Scene and entrance

- [ ] 6.1 Draw the field (`ui/star-card.ts`, `ui/field-art.ts`), add `FieldScene`, register it, and add
      the title's field button with the title art moved up.
  - Requirements: REQ-6.1, REQ-6.2, REQ-6.3, REQ-6.4, REQ-6.5, REQ-6.8, REQ-6.9, REQ-6.10; inherited REQ-4.9, REQ-4.11
  - Tests: scenes are excluded from unit tests (ADR 0003). `npm run check`, `npm run build` and the
    existing smoke tests pass (trials 1 and 2 and the score attack are unchanged). The built page is
    driven by real taps and looked at in screenshots in both languages and every stage.
  - Done when: the above, and the screenshots were read.
  - Result:

## 7. Smoke

- [ ] 7.1 Add the field smoke: `e2e/field-helpers.ts`, `smoke.mobile.field.spec.ts`,
      `smoke.desktop.field.spec.ts`, and the `field` field in the `GameState` type of `e2e/helpers.ts`.
  - Requirements: REQ-6.1, REQ-6.3, REQ-6.4, REQ-6.5, REQ-6.6, REQ-6.7, REQ-6.8, REQ-6.9, REQ-6.11, REQ-6.13; inherited REQ-2.12
  - Tests: mobile, real taps: the title's button; one star checked, a fake found, a second tap on the
    same star; all five checked, the keep button appears; keep; the closing line; the next round with a
    different set; the round table repeating; the pixels of every star and the closing line; ja and en
    screenshots; offline in both languages. Desktop, mouse: the same path, and a held press on a star
    does not move the hero.
  - Done when: `npm run check`, `npm run build` and `npm run smoke` pass (Chromium here; CI runs
    WebKit); the new tests are shown to fail when the scene is broken on purpose.
  - Result:

## 8. Final integration

- [ ] 8.1 Record the change: `CHANGELOG.md`, the trial 3 row in `docs/learning-design.md`, the
      checklists, and the Result lines of this file; run everything once more.
  - Requirements: REQ-6.12, REQ-6.13, REQ-6.14; inherited REQ-2.15, REQ-3.9, REQ-4.8
  - Tests: `npm run check`, `npm run build`, `npm run smoke`, `npm run mutation`; the smoke of trials 1 and
    2 (including the score attack) unchanged and green.
  - Done when: CI's `smoke` (WebKit) is green on the pull request. Until then the work is not called done.
  - Result:
