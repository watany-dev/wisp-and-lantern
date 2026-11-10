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

- [x] 1.1 Write `requirements.md` with its Japanese translation, and add a scope note at the top of the
      05 requirements (and its `jp/` copy). Past lines are not edited.
  - Requirements: REQ-6.1, REQ-6.2, REQ-6.3, REQ-6.4, REQ-6.5, REQ-6.6, REQ-6.7, REQ-6.8, REQ-6.9, REQ-6.10, REQ-6.11, REQ-6.12, REQ-6.13, REQ-6.14
  - Tests: none (documents). `npm run check` includes `check-trace` and the Japanese-text gate (specs
    are on the allowlist).
  - Result: `npm run check` passes on Node 26.13.0 (after `git add`, since `check-submission.sh` reads `git ls-files`).
    The English requirements were written first (commit `2da5536`) and the Japanese translation was added
    after the implementation, in the same pull request, once the English text had stopped changing. Nothing
    outside `.kiro/specs/` changed in that commit; the 05 note is the only edit to an earlier spec.

- [x] 1.2 Write `design.md` and this file, with the Japanese translation.
  - Requirements: REQ-6.1, REQ-6.2, REQ-6.3, REQ-6.4, REQ-6.5, REQ-6.6, REQ-6.7, REQ-6.8, REQ-6.9, REQ-6.10, REQ-6.11, REQ-6.12, REQ-6.13, REQ-6.14
  - Tests: none (documents)
  - Result: `npm run check` passes (`check-trace: 30 invariants, 0 without tests`; every `REQ-6.n` is in this
    file). The design was revised once after the build to match what was built (the start and closing-line
    wording, the title art's `titleArtBottom` of 606, the model check's record and 1,968 states, the break
    list) and the Japanese copies follow that final text.

## 2. Domain: the field rules

- [x] 2.1 Add `field.ts` (the round table, `Field`, `reduceField`, `fakesOf`, `isFake`, `markOf`,
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
  - Result: `npm run check` passes on Node 26.13.0: 531 tests (58 new on 473: 28 in `field.test.ts`, 17 in
    `field.pbt.test.ts`, 13 in `reducer.test.ts`), coverage 100% on every metric, mutation score 100%
    (714 mutants, 0 survived; 115 of them new), `check-trace: 30 invariants, 0 without tests`, size budget
    ok (359.3 KB of 1,024 KB). No existing test was edited: the change to `reducer.test.ts` is appended
    cases. `reduce` reached a complexity of 20 with the four new cases and lint allows 15, so the trial
    events moved to a second switch (`reduceTrial`); no behavior changed. **Deliberate breaks** (each applied
    to `field.ts` or `reducer.ts`, the three test files run, then restored; 30 in all): 29 failed at least
    one test, for example a second tap that unchecks a star (INV-25), an index of 5 or -1 or 0.5 that
    counts as a star (INV-25), a keep with a star unchecked or with only four checked (INV-27, INV-28), a
    keep that takes the fake stars or only the fake ones (INV-27, INV-28, INV-30), a retry that skips a round
    or does not wrap or keeps the marks (INV-30), a round with no fake star or three or two rounds alike
    (INV-26), a flipped truth (INV-25 to INV-30), field events that act outside trial 3 (INV-31), `Tick`
    that runs the clock in the field and `PickTool` that acts in the field (INV-32), and a `StartField` from
    any phase or one that starts the run (unit). One break stayed green: `Ask` acting in the field, because
    with no card picked `Ask` changes nothing anyway, so it cannot be seen; `PickCard` acting in the field
    fails 3 tests (INV-32) and stands in for it. INV-3 and INV-4 were run over the new events and pass.
    Nothing in `src/game/` changed, so no smoke was needed for this task.

## 3. Model check

- [x] 3.1 Add `field.model.test.ts`: the entrance from the title and the field after it, with the
      alphabet, invariants, goals and witnesses in the design, and the deliberate breaks with their
      counterexamples. The model checks of trials 1 and 2 are not changed.
  - Requirements: REQ-6.5, REQ-6.7, REQ-6.12
  - Tests: `field.model.test.ts`: the number of reached states; invariants hold; goals 1 to 3; a fake
    found, a real found, the kept result and the second kept result are each reachable (shortest trace);
    a kept result leads to a fresh next round; each deliberate break fails with its counterexample.
  - Done when: `npm run check` passes; the Result lists the state count and the counterexamples.
  - Result: `npm run check` passes: 547 tests (16 new, all in `field.model.test.ts`), coverage 100%, mutation score
    100% (714 mutants, none survived; this task changes no source), size budget ok (359.3 KB). **The model
    reaches 1,968 states**: the title (2 languages x 2 hero positions) and the field (2 x 2 for each of 6
    rounds in progress with 81 states each and 5 kept results; the count of kept results so far is part of the
    identity). All seven invariants hold in all of them, and goals 1 (the kept result is reachable), 2 (a
    fresh round is reachable) and 3 (a second kept result is reachable) hold from every one of them, the
    title included. **Evidence of reach** (shortest traces): a real star found `StartField, CheckStar 0`, a
    fake found `StartField, CheckStar 3`, the kept result in 7 events (`StartField`, five checks in order,
    `KeepStars`), a second kept result in 14 (`... RetryField`, five checks, `KeepStars`); from a kept result
    one `RetryField` reaches a fresh next round (round 1) and changes nothing else, and the replay reaches the
    kept result again in 7 events. **Deliberate breaks**, each a `step` around the real `reduce`:
    `KeepStars` that works with a star unchecked breaks the kept-too-early invariant (`StartField,
    KeepStars`); `CheckStar` that also checks the next star breaks the checked-stars invariant (`StartField,
    CheckStar 0`); a second `CheckStar` that unchecks the star breaks it too (`StartField, CheckStar 0,
    CheckStar 0`); `CheckStar` that moves to the next round breaks the round and truth invariants
    (`StartField, CheckStar 0`); `KeepStars` ignored leaves goal 1 stuck in every state (counterexample: the
    start, trace empty); `RetryField` ignored leaves goal 1 green and makes goal 2 stuck after one check
    (`StartField, CheckStar 0`) and goal 3 stuck from the start (trace empty; from the kept result itself,
    also empty); `Tick` that runs the clock in the field breaks the run invariant (`StartField, Tick 1000`).
    **Source breaks against the model**: 13 applied to `field.ts` and `reducer.ts`; 11 failed at least one
    model test (for example a keep with four checks: 10 tests). Two stayed green, field events acting outside
    trial 3 and `withField` always copying, because the field's model never leaves the field's trial (the
    other trials' entrances have their own model checks); the property and unit tests catch both. Two
    things went wrong while writing it (see `docs/evidence/didnt-work.md`): the record of checked stars was an
    ordered list, which made 10,228 states, and a deliberately broken game ran past the 100,000-state limit
    until the broken checks got a looser state identity. The model checks of trials 1 and 2 were not touched
    and still pass.

## 4. Content

- [x] 4.1 Add the `field` group to both string files, regenerate the subset font, and add
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
  - Result: `npm run check`, `npm run kid` and `npm run font` pass: 567 tests (20 new in `field-content.test.ts`),
    coverage 100%, mutation score 100% (no source changed), size budget ok (359.6 KB). `npm run font` left the
    subset font byte-identical (352 code points already cover the new strings). **The kid-reader pass was the
    manual rubric** of `.kiro/agents/kid-reader.md`, not the agent (it cannot be run from this session); the
    table is in the pull request. It changed two Japanese strings: `start` (the first draft did not say to
    tap, which the English did) and the first line of `lesson` (the direction repeated the guide's first
    line); the verdict for `うけとる` in the guide and the buttons, `にせもの`, and `ウィスプも まちがえるよ` is
    "playtest". **The new tests against 26 deliberate breaks** (each applied to a string file and restored),
    all caught: the wisp tricked you, lied, or did it on purpose (2 to 3 tests each), no mix-up in the fake
    message, no number or two numbers in the kept message, a number in the guide, "always" or "robot" or a
    friend or a name in a message, a guide without the check or in the wrong order, a closing line that
    repeats the guide or the kept message or does not look back, a 26-character English line, a star label
    that says bad or differs from the message, a button without "Keep" or a next button that says "again", a
    start message without a tap in either language, and a kanji, a Latin letter or a 13-character line in
    Japanese (these three also fail `npm run kid`; the other 23 pass the gate and only the content test sees
    them).

## 5. View and layout

- [x] 5.1 Add `field-layout.ts`, `field-view.ts` and the `field` scene in `route.ts`, with unit tests.
      Nothing in a scene calls them yet.
  - Requirements: REQ-6.2, REQ-6.3, REQ-6.4, REQ-6.5, REQ-6.6, REQ-6.7, REQ-6.8, REQ-6.9; inherited REQ-2.10
  - Tests: `field-view.test.ts` (per stage and language: message, button, stars, labels, ticks, alpha,
    lesson only when kept, the message follows the star checked last, the keep button only when all are
    checked); `field-layout.test.ts` (inside the canvas, no overlap per stage, targets at least 80, the
    hero strip free, the probes inside their slots, the title's two buttons apart and below the art);
    `route.test.ts` (`sceneFor` for every phase and trial, added cases).
  - Done when: `npm run check` passes with no surviving mutant.
  - Result: `npm run check` passes: 625 tests (58 new: 38 in `field-view.test.ts`, 17 in `field-layout.test.ts`, 3 in
    `route.test.ts`), coverage 100%, mutation score 100% (817 mutants, none survived; 2 mutants, the
    `strings = {}` ones, crash their module and are reported as errors, not survivors), size budget ok (359.6
    KB). The first run had 2 survivors in `justChecked` (a redundant `after.last !== null` and a `?? null` that
    star 0 could not tell from `&& null`); the function lost the redundant test and the test repeats stars 3
    and 4. `StarView` is not exported (knip). The title's layout changed here: `titleArtBottom` in
    `shed-layout.ts` went from 660 to 606 (no test pinned 660; `shed-layout.test.ts` checks that the shed
    button is below it and still passes). **30 deliberate breaks** in `field-view.ts`, `field-layout.ts` and
    `route.ts` (each applied, the `src/game` tests run, restored): 29 failed at least one test (the message
    ignoring the star checked last 7, swapped messages 9, the keep button before all are checked 9, a fake
    star drawn solid 6, a tick on a fake star 6, real stars fading 4, the closing line while checking 8, trial
    3 showing the lane 2, the field button overlapping the shed button 2, and so on). One stayed green:
    `field.last ?? null` for a kept field, because a kept field has no `last` at run time (TypeScript rejects
    it). Nothing in a scene calls the new modules, so the game is unchanged; the smoke was not run for this
    task.

## 6. Scene and entrance

- [x] 6.1 Draw the field (`ui/star-card.ts`, `ui/field-art.ts`), add `FieldScene`, register it, and add
      the title's field button with the title art moved up.
  - Requirements: REQ-6.1, REQ-6.2, REQ-6.3, REQ-6.4, REQ-6.5, REQ-6.8, REQ-6.9, REQ-6.10; inherited REQ-4.9, REQ-4.11; REQ-5.2 (what the shed shows) is the model for REQ-6.2
  - Tests: scenes are excluded from unit tests (ADR 0003). `npm run check`, `npm run build` and the
    existing smoke tests pass (trials 1 and 2 and the score attack are unchanged). The built page is
    driven by real taps and looked at in screenshots in both languages and every stage.
  - Done when: the above, and the screenshots were read.
  - Result: `npm run check` passes: 625 tests, coverage 100%, mutation score 100% (817 mutants, none survived), size
    budget ok (361.0 KB gzip of 1,024 KB; 359.6 KB before this task). `npm run build` then the existing
    smoke: **19 passed** (desktop 6 on Chromium; mobile 13 on Chromium with the iPhone 13 touch profile,
    through a local config in `.cache/` because WebKit cannot start in this sandbox; the browser had to be
    installed with `PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright npx playwright install chromium`, since the
    one in the image is the wrong revision). Trials 1 and 2 and the score attack are unchanged. **Looked at,
    not only tested:** a throwaway Playwright script (kept in `.cache/`, not committed) entered the field with
    a real tap on the title's button, then checked a fake star, a real star, all five, kept them and played the
    next round, in `?lang=ja` and `?lang=en`, and I read the title, the start, the all-checked and kept screens
    in English and the fake-found and kept screens in Japanese. Seen: the title shows the two gold buttons
    under the wisp and the hero (the star above the key), nothing overlapping; the field shows five identical
    gold stars on lit slots, in two rows, with the guide above and the wisp message below; a real star gets a
    gold frame, a tick and the word "real"; a fake star becomes a dark slot with a dashed hollow outline, pale
    rings and the word "fake"; with five checked the keep button shows; after the keep the fake star is faded,
    the message names 4, the closing line panel and "Next stars" show in order without overlap, in both
    languages (the Japanese two-line message sits close above the closing line panel). Two things I noticed
    and left: the lit slots' halos touch between the two rows, and the title wisp's faint halo reaches the top
    of the field button (the button is drawn over it). The state after the title tap was `trial` 3, the run
    untouched (60,000 ms), the lane and the shed initial.

## 7. Smoke

- [x] 7.1 Add the field smoke: `e2e/field-helpers.ts`, `smoke.mobile.field.spec.ts`,
      `smoke.desktop.field.spec.ts`, and the `field` field in the `GameState` type of `e2e/helpers.ts`.
  - Requirements: REQ-6.1, REQ-6.3, REQ-6.4, REQ-6.5, REQ-6.6, REQ-6.7, REQ-6.8, REQ-6.9, REQ-6.11, REQ-6.13; inherited REQ-2.12
  - Tests: mobile, real taps: the title's button; one star checked, a fake found, a second tap on the
    same star; all five checked, the keep button appears; keep; the closing line; the next round with a
    different set; the round table repeating; the pixels of every star and the closing line; ja and en
    screenshots; offline in both languages. Desktop, mouse: the same path, and a held press on a star
    does not move the hero.
  - Done when: `npm run check`, `npm run build` and `npm run smoke` pass (Chromium here; CI runs
    WebKit); the new tests are shown to fail when the scene is broken on purpose.
  - Result: `npm run check` passes (625 tests, coverage 100%, mutation 100%, size budget ok). `npm run build` then
    the smoke on **Chromium with the iPhone 13 touch profile** (WebKit cannot start here) and desktop
    Chromium: **26 passed** (mobile 18: 13 existing and 5 new; desktop 8: 6 existing and 2 new); the mobile run
    twice (default workers, and `--workers=1`) and the desktop run once. Mobile, real taps: the title's button
    opens the field with `trial` 3, the run at 60,000 ms and not counting down, the lane and the shed
    initial; five identical stars are read from the pixels, no button and no closing line; a real star gets
    its tick and the message changes; a fake star becomes hollow and the message changes again; a second tap on
    a checked star changes nothing; a `KeepStars` sent too early (dispatched, since no button offers it)
    changes nothing and no button shows; the fifth check shows the keep button and keeps nothing; keeping
    shows the closing line and leaves the fake star dark and the real ones ticked; the closing line changes
    when the language changes, and stays after a star tap, a 60 s `Tick` and 1 s; "Next stars" starts round
    1 with other fake stars; the whole table of four rounds is played, checking from the last star to the
    first, and round 0 comes back after four; a tap elsewhere on the title starts trial 1 and not the field;
    the whole path works offline in ja and en with no request. Desktop, mouse: the same path, a held press on
    a star does not move the hero, and a held press on the floor does. Screenshots were written for the
    Japanese title, start, real, fake, ready and kept screens, and for the English kept, fake and last-round screens. **The new tests against 8 deliberate
    breaks** in the scene (each applied, built, the field tests run, restored): a fake star drawn solid fails
    1 mobile and 1 desktop test; the tick never shown 1 and 1; the closing line never shown 1 and 1; the keep
    button shown from the start fails 1 mobile test; a press on a star that walks the hero fails 1 desktop
    test (a tap is too short to walk the hero, as in trial 1); a star tap that checks the next star fails 1
    and 2; the title button that starts trial 1 fails 1 and 2; the title button that opens the shed fails 1 and
    2. **CI's `smoke` job** (real WebKit for the mobile project) is recorded in the pull request, since a
    record cannot contain its own result.

## 8. Final integration

- [x] 8.1 Record the change: `CHANGELOG.md`, the trial 3 row in `docs/learning-design.md`, the
      checklists, and the Result lines of this file; run everything once more.
  - Requirements: REQ-6.12, REQ-6.13, REQ-6.14; inherited REQ-2.15, REQ-3.9, REQ-4.8, REQ-5.15
  - Tests: `npm run check`, `npm run build`, `npm run smoke`, `npm run mutation`; the smoke of trials 1 and
    2 (including the score attack) unchanged and green.
  - Done when: CI's `smoke` (WebKit) is green on the pull request. Until then the work is not called done.
  - Result: On the final tree of the branch `06-trial-verify-stars/trial-3`: `npm run check` passes on Node 26.13.0
    (625 tests, coverage 100% on every metric, mutation score 100% with 817 mutants and none survived,
    `check-trace: 30 invariants, 0 without tests`, size budget 361.0 KB of 1,024 KB); `npm run bench` runs
    (1 benchmark); `npm run build` then the smoke on Chromium (mobile with the iPhone 13 touch profile through
    a local config, desktop with the project's own): 26 passed (trials 1 and 2 and the score attack unchanged,
    19 of them; the field, 7). The first final `npm run check` failed at `check-submission`, because
    `docs/evidence/didnt-work.md` held Japanese text (hard rule 1); the row now describes the string in
    English. `CHANGELOG.md` has the entry, `docs/learning-design.md` row 3 says what the trial does and that
    the one-tap check is a staging device, `docs/device-checklist.md` gets two playtest lines for trial 3, and
    `docs/evidence/didnt-work.md` gets six things that did not work. The CI of the pull request is not
    recorded here, since a record cannot contain its own result; it is in the pull request. **Still not
    verified:** no real phone, no real child (the weekly pass in `docs/device-checklist.md` and the next
    playtest do that); real WebKit (CI's `smoke` job); the `reviewer` and `kid-reader` agents were never run,
    only their rubrics applied by hand; the field has no way back to the title (reload), as the shed.
