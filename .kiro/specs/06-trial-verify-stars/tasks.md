# Tasks: Trial 3, The Wisp Field

One task per branch and per pull request (`AGENTS.md`). Branch `06-trial-verify-stars/<task>`, cut from
`main` after the previous task is merged. Every task leaves the game working and passes `npm run check`;
tasks that connect input to the screen also pass `npm run build` followed by `npm run smoke`. Sized for
review on a phone: aim for a few hundred changed lines, tests included. A task that is larger says why in its
pull request.

**Revision 2.** The first build of this spec was made in one session, on one branch and in one pull request
(`06-trial-verify-stars/trial-3`, pull request #70), and it was played three times in the preview. It did not
teach (see the table at the top of `requirements.md`), so the spec, the code and the tests were rebuilt. The rebuild
was first pushed onto the same branch as #70. This branch (`06-trial-verify-stars/clean`) carries the same tree on
top of `main` in four commits (spec; source and unit tests; smoke; records), without the first build's commits, so
the history reads in one piece. The first build's tasks and results are in the history of this file on the #70
branch (commit `9a69287`) and are not repeated: those results described a design that is gone.

Status: `[ ]` open, `[x]` done. A task fills its **Result** line with what it ran and what it saw. Nothing
is recorded as run unless it was run.

How the order keeps each step shippable (REQ-6.14): 2.1 adds the rules and nothing reaches them; 3.1 checks
them; 4.1 adds the words without using them; 5.1 adds the screen's logic without drawing it (knip counts the
tests as users); 6.1 draws it and changes the title, the only task that makes the field reachable; 7.1 plays it
with real taps; 8.1 records it. Nothing reaches the child before 6.1, and trials 1 and 2 are untouched until
then. The commits are grouped (spec; source and unit tests; smoke; records) because the tree
only builds once the domain, the view and the scenes agree on the events.

The smoke runs on Chromium with the iPhone 13 touch profile in the authoring sandbox (WebKit cannot start
there); CI runs the real WebKit pass and counts. The review rubrics of the `reviewer` and `kid-reader`
agents are applied by hand when the agents cannot be run, and the pull request says which it was.

## Tests of the old behavior that this spec replaces (REQ-6.14.1)

No test of trial 1 or trial 2 changed. Everything below belongs to revision 1 of this spec, was never merged,
and is replaced together with the behavior it described.

| old test (revision 1, never merged) | replaced by | why trials 1 and 2 are not weaker |
|---|---|---|
| `field.test.ts`, `field.pbt.test.ts`, `field.model.test.ts` (check, keep, round table) | the same files, rewritten for look, verdict, seed, clear and leave | they tested only the field; trial 1 and 2 tests are untouched, and INV-3, INV-4, INV-31 and INV-32 still run over sequences that contain the lane and shed events |
| `reducer.test.ts`, the field cases at the end | the field cases at the end, rewritten | the cases above them (trials 1 and 2) are byte for byte the same; the file was cut at the first field line and the new cases appended |
| `field-content.test.ts`, `field-view.test.ts`, `field-layout.test.ts`, `route.test.ts` (`StartField` now needs a seed) | rewritten; the `route.test.ts` change is the added `seed: 0` | the shed's and the lane's view, layout and content tests are not touched; `shed-layout.test.ts` still checks that the shed button is below `titleArtBottom` |
| `smoke.mobile.field.spec.ts`, `smoke.desktop.field.spec.ts`, `field-helpers.ts` | rewritten | the trial 1, trial 2 and score-attack smokes are not touched and pass unchanged (19 tests) |

`shed-helpers.ts` lost the `export` on `brightness` (nothing else used it now; knip). `e2e/helpers.ts` has the new
`field` shape in its `GameState` type.

## 1. Spec

- [x] 1.1 Write `requirements.md` (revision 2) with its Japanese translation, and keep the scope note at the top
      of the 05 requirements (and its `jp/` copy). Past lines of other specs are not edited.
  - Requirements: REQ-6.1, REQ-6.2, REQ-6.3, REQ-6.4, REQ-6.5, REQ-6.6, REQ-6.7, REQ-6.8, REQ-6.9, REQ-6.10, REQ-6.11, REQ-6.12, REQ-6.13, REQ-6.14
  - Tests: none (documents). `npm run check` includes `check-trace` and the Japanese-text gate (specs
    are on the allowlist).
  - Result: `npm run check` passes on Node 26.13.0 (see 8.1 for the figures). The English requirements were rewritten first, then
    the Japanese translation (`jp/requirements.md`) from the final English text. The scope note at the top of the 05
    requirements (and its `jp/` copy) from revision 1 is unchanged. Every `REQ-6.n` appears in this file, so
    `check-trace` raises no warning for it.

- [x] 1.2 Write `design.md` (the Decisions included) and this file, with the Japanese translation, and revise the
      trial 3 row of `docs/learning-design.md`.
  - Requirements: REQ-6.1, REQ-6.2, REQ-6.3, REQ-6.4, REQ-6.5, REQ-6.6, REQ-6.7, REQ-6.8, REQ-6.9, REQ-6.10, REQ-6.11, REQ-6.12, REQ-6.13, REQ-6.14
  - Tests: none (documents)
  - Result: `npm run check` passes. The design was written after the code had been seen on screen and was revised twice after
    that to match what was built (the lens and button positions, the removal of the `ready` message, the button lock
    and the touch guard, after the review in 8.1). The Japanese copies of the design and of this file follow the final
    English text. The trial 3 row of `docs/learning-design.md` now says what the trial does: the visible clue, the
    verdict, the retry without limit, the two rounds, the result screen and the way back.

## 2. Domain: the field rules

- [x] 2.1 Rewrite `field.ts` (`Field` with `seed`, `sorted`, `looking`, `note`; `fakesOf`, `shineOf`, `markOf`,
      `noteWasRight`, `isReady`, `keptStars`, `isLastRound`, `reduceField`), the events `StartField { seed }`,
      `InspectStar`, `SortStar`, `KeepStars`, `RetryField` and `LeaveField`, and the reducer cases with the `trial`
      guards (`reduceFieldTrial`). Revise the invariants in `domain-invariants.md`: retire 25, reword 26 to 32, add
      33 to 39, each with its property test in the same pull request.
  - Requirements: REQ-6.3, REQ-6.4, REQ-6.5, REQ-6.7, REQ-6.8, REQ-6.12
  - Invariants: INV-26 to INV-39; INV-3 and INV-4 re-run with the field events
  - Tests:
    - `field.test.ts`: every event in each stage; `fakesOf` pinned for seeds 0 to 3, 1 or 2 fakes each, neighbouring
      rounds differ in size, no star is always real, a negative or fractional seed; the clue (`shineOf`) in every
      stage; a look, a right and a wrong verdict for a real and a fake star, a verdict with no star in the lens, a
      wrong verdict repeated; a keep when complete and the clear; the lock after the keep; the retry and the wrap.
    - `reducer.test.ts` (new cases only): `StartField` from the title and nowhere else, with a seed (and a stray seed
      made whole); the field events outside the field; the other trials' events and `Tick` in the field; `Start`
      and `SetLang` in the field; the leave from the cleared trial and nowhere else; `lane`, `run` and `shed`
      untouched.
    - `field.pbt.test.ts`: INV-3 and INV-4 over sequences with the field events; INV-26 to INV-39 each by
      `checkProperty`; a coverage test that the generator looks, gives right and wrong verdicts, uses a bad index,
      keeps early, keeps, clears, leaves, goes to the next round and wraps.
  - Done when: `npm run check` passes with no surviving mutant, `check-trace` reports every invariant tested, and each
    new property and unit case is shown to fail on a deliberately broken reducer.
  - Result: `npm run check` passes on Node 26.13.0: 668 tests in all, coverage 100% on every metric, no surviving mutant (see 8.1).
    `field.test.ts` has 26 tests, `field.pbt.test.ts` 18 (INV-3 and INV-4 over the field events, INV-26 to INV-39
    each by `checkProperty`, and the coverage test), and the new cases at the end of `reducer.test.ts` 20 (81
    `it` blocks against 61 on `main`). The
    existing cases of `reducer.test.ts` were not edited: the file was cut at the first field line and the new
    cases appended. `reduceTrial` reached a complexity of 18 with the field cases, and lint allows 15, so they moved
    to `reduceFieldTrial`. **Deliberate breaks** (each applied to `field.ts` or `reducer.ts`, `npx vp test run
    src/domain` run, then restored): 36 in all, and every one failed at least one test. Among them: a verdict that
    works with no star in the lens; a wrong verdict that sorts the star; a right verdict that sorts nothing or
    every star; the verdict inverted; the lens left open or the note dropped after a wrong verdict; a look that
    accepts a sorted star or an index of 5; a keep with four sorted; the last round not clearing, or every round
    clearing, or a run of three rounds; the retry keeping the round, not wrapping, working while sorting or
    forgetting the seed; a round with no, three or always one fake star; fakes that ignore the seed or the round; a
    fake star that shines normally or a clue shown only after sorting; the keep taking the fake stars; the leave
    working before the clear, keeping the field or the trial; field events acting outside trial 3; `StartField`
    from any phase, dropping the seed or keeping a stray one; `Tick` running the clock in the field; `PickCard`
    acting in the field. The first version of the `StartField` break did not apply, because the formatter had
    reflowed the line; it was applied by hand and failed 17 tests.

## 3. Model check

- [x] 3.1 Rewrite `field.model.test.ts`: the entrance from the title with two seeds, the field after it and the
      leave, with the independent record, the invariants, the four goals and the witnesses in the design, and the
      deliberate breaks with their counterexamples. The model checks of trials 1 and 2 are not changed.
  - Requirements: REQ-6.5, REQ-6.7, REQ-6.12
  - Tests: `field.model.test.ts`: the number of reached states; invariants hold; goals 1 to 4; a wrong verdict, the
    cleared trial and the way back are each reachable (shortest trace); the leave and the next run; each deliberate
    break fails with its counterexample.
  - Done when: `npm run check` passes; the Result lists the state count and the counterexamples.
  - Result: `npm run check` passes (see 8.1). **The model reaches 19,356 states.** All seven invariants hold in all of them, and
    goals 1 (the cleared trial is reachable), 2 (the title), 3 (a fresh round) and 4 (a second cleared trial) hold
    from every one of them. **Evidence of reach** (shortest traces): a wrong verdict in 3 events (`StartField`, a look,
    a verdict); the cleared trial after the entrance, 10 events for round 0 (five looks and five verdicts), the keep,
    the retry, 10 for round 1 and the keep; the title after the clear in one more event, `LeaveField`. From the
    cleared trial one `RetryField` reaches a fresh round and one `LeaveField` the title. **Deliberate breaks**, each a
    `step` around the real `reduce`: a wrong verdict that sorts the star, and a verdict that works with no star in
    the lens, and a wrong verdict that leaves the star in the lens, each make the field differ from the record;
    `KeepStars` that works with a star unsorted breaks the finished-too-early invariant (`StartField`,
    `KeepStars`); a last round that does not clear breaks the record at the keep; `LeaveField` that works before the
    clear breaks the place invariant (`StartField`, `LeaveField`); `KeepStars` ignored leaves goal 1 stuck from the
    start (trace empty); `RetryField` ignored leaves goal 1 stuck from the start (the second round is unreachable)
    and goal 3 stuck after one look (`StartField`, a look); `LeaveField` ignored leaves goal 2 stuck as soon as
    the field is entered; `Tick` that runs the clock breaks the run invariant (`StartField`, `Tick`). Two things went
    wrong while writing it (see `docs/evidence/didnt-work.md`): the first broken-game runs passed 100,000
    states, because the broken game and the record together have far more states than the real game (fixed with a
    small alphabet and a collapsed identity for states that already break an invariant), and the first version of the
    "fresh round" goal counted a state with a star in the lens. The model checks of trials 1 and 2 were not touched
    and still pass.

## 4. Content

- [x] 4.1 Rewrite the `field` group in both string files, add `noClock`, regenerate the subset font, and rewrite
      `field-content.test.ts`. Nothing reads the new keys until 5.1. The wording is decided here with the kid-reader
      rubric.
  - Requirements: REQ-6.1, REQ-6.4, REQ-6.6, REQ-6.11; inherited REQ-2.9, REQ-2.13, REQ-3.6
  - Tests: `field-content.test.ts`: same keys in both languages; `{0}` once in `kept` and nowhere else; the Japanese
    rules for every string and for the number inserted; English lines at most 28 characters; no blame words, no word
    that makes the wisp a liar, no word that calls a wrong verdict a mistake; no claims about real AI; the guide
    names both steps; the clue words in `look`; the miss messages say what happened and ask for another look; the
    closing line shares no sentence with the kept message or the guide; the title caption. `npm run kid` and
    `npm run font` pass.
  - Done when: `npm run check`, `npm run kid` and `npm run font` pass; the kid-reader table is in the pull request and
    says whether it is the agent or the manual rubric.
  - Result: `npm run check`, `npm run kid` and `npm run font` pass. `npm run font` left the subset font byte-identical (352
    code points already cover the new strings). `field-content.test.ts` has 26 tests. **The kid-reader pass was the
    manual rubric** of `.kiro/agents/kid-reader.md`, not the agent (it cannot be run from this session); the table is
    in the pull request. It changed these strings while they were written: `ready` used `ぜんぶ` / "All", which the claim
    list rejects (a different word was used, and the string was later removed, see 8.1); the miss messages avoid
    `ちがった` and "wrong" on purpose. The verdict for `うけとる`,
    `ふち` and `にせもの` is "playtest". **The content tests against deliberate breaks** (each applied to a string file
    and restored; see also 5.1): a no-timer caption that says 60 seconds, a miss message that says "Wrong!", a fake
    message that says the wisp lied, and a 13-character Japanese line were all caught by the content tests (the last
    also fails `npm run kid`).

## 5. View, clue and layout

- [x] 5.1 Add `field-look.ts` (the clue as data), `field-layout.ts`, `field-view.ts`, `seed.ts`, `title-layout.ts`,
      `title-view.ts`, and the `field` scene in `route.ts`, with unit tests. Nothing in a scene calls them yet.
  - Requirements: REQ-6.1, REQ-6.2, REQ-6.3, REQ-6.4, REQ-6.5, REQ-6.6, REQ-6.7, REQ-6.8, REQ-6.9; inherited REQ-2.10
  - Tests: `field-look.test.ts` (the fake star's body, halo and reach are brighter in a grayscale measure; the rims
    differ in kind; the dots do not touch; exact values of the halo); `field-view.test.ts` (per stage and language:
    message, buttons, stars, labels, ticks, alpha, lens, clear panel only when cleared, the message follows the last
    verdict; the flourish helpers); `field-layout.test.ts` (inside the canvas, no overlap per stage, targets at least
    80, the hero strip free, the probes where they say and clear of the star's points, the title's card and
    buttons apart); `title-view.test.ts`; `seed.test.ts`; `route.test.ts` (`sceneFor`).
  - Done when: `npm run check` passes with no surviving mutant.
  - Result: `npm run check` passes: 668 tests in all (the new ones: 12 in `field-look.test.ts`, 29 in `field-layout.test.ts`,
    32 in `field-view.test.ts`, 2 in `title-view.test.ts`, 2 in `seed.test.ts`, 5 in `button-lock.test.ts`, 3 more in
    `route.test.ts`), coverage 100%, no surviving mutant. The first run had 7 survivors: 6 were killed by new tests
    (the probes' exact positions; the edge of the halo's last circle; the brightness mix) and 1 equivalent mutant in
    `starViews` got a `// Stryker disable next-line ConditionalExpression` with its reason. The title's layout changed here:
    `titleArtBottom` in `shed-layout.ts` is 606 (no test pinned 660; `shed-layout.test.ts` still passes). **30 deliberate
    breaks** in `field-view.ts`, `field-look.ts`, `field-layout.ts`, `seed.ts`, `title-view.ts`, `title-layout.ts` and the
    string files (each applied, `npx vp test run src/game src/content` run, restored): 30 of 30 failed at least one
    test. Among them: swapped miss messages (2 tests), the look message never shown (4), verdict buttons shown with
    no star in the lens (8), the keep button before all are sorted (4), the clear panel after the first round (4), a fake
    star without a fade or with a tick (4 each), every star framed (4), a calm lens star for a fake one (4), a fake halo as
    dim as a real one (4), a fake rim that is a line (1), a fake body as dark as a real one (1), dots that touch (2), a
    button over the hero (1), the lens over the message (5), a star smaller than 80 (4), a seed that is always the same (1),
    the 60 seconds on the buttons (2).

## 6. Scene and entrance

- [x] 6.1 Draw the field (`ui/field-art.ts`, `ui/star-card.ts`, `ui/field-lens.ts`, `ui/field-buttons.ts`), rewrite
      `FieldScene`, rewrite `TitleScene` (trial 1's card, the buttons' captions, the seed, the return lock), and keep
      the title art moved up.
  - Requirements: REQ-6.1, REQ-6.2, REQ-6.3, REQ-6.4, REQ-6.5, REQ-6.7, REQ-6.8, REQ-6.9, REQ-6.10; inherited REQ-4.9, REQ-4.11; REQ-5.2 (what the shed shows) is the model for REQ-6.2
  - Tests: scenes are excluded from unit tests (ADR 0003). `npm run check`, `npm run build` and the existing smoke
    tests pass (trials 1 and 2 and the score attack are unchanged). The built page is driven by real taps and looked
    at in screenshots in both languages and every stage.
  - Done when: the above, and the screenshots were read.
  - Result: `npm run check` passes (see 8.1). `npm run build`, then the existing smoke: trials 1 and 2 and the score attack are
    unchanged and pass (19 tests). **Looked at, not only tested:** a throwaway Playwright script in `.cache/` (not
    committed) entered the field with a real tap on the title's button and played it through in `?lang=ja` and
    `?lang=en`: the start, a star in the lens, a wrong verdict on a real star, the right one, a look at a fake star, all
    five sorted, the kept result, the second round, the cleared trial, and the title after "Title". I read these
    screens. **Seen and fixed because of it:** the message sat close under the lower row (the rows moved up 10 and 14
    pixels); the clear panel's second line ran over the panel's border (the lens place became 124 high and the
    buttons moved); the star's word sat on the frame of a sorted star (the star became radius 20 and the word
    moved); the fake star's halo in the lens covered the message (the halo is shrunk to fit its panel); the tick and the
    ring of dots touched the verdict words (the picture moved left and the word right); the field button's label
    touched its star on the title (the label is 22 px and moved right). **Seen and left:** the lit slots' gold halos
    touch between the two rows; the Japanese two-line message sits close above the clear panel (about 8 px); the
    empty lens is a plain panel with a faint ring.

## 7. Smoke

- [x] 7.1 Rewrite the field smoke: `e2e/field-helpers.ts`, `smoke.mobile.field.spec.ts`,
      `smoke.desktop.field.spec.ts`, and the `field` field in the `GameState` type of `e2e/helpers.ts`.
  - Requirements: REQ-6.1, REQ-6.2, REQ-6.3, REQ-6.4, REQ-6.5, REQ-6.6, REQ-6.7, REQ-6.8, REQ-6.9, REQ-6.10, REQ-6.11, REQ-6.13; inherited REQ-2.12
  - Tests: mobile, real taps: the title's button; the clue on every star before any tap; a star in the lens with both
    buttons; a wrong verdict for a real and for a fake star and the retry; the right verdicts; a keep sent too early; the
    keep button; the second round; the clear panel, the closing line and the buttons; the quick double tap on "Title";
    play again; the grayscale and silent run; the title's card and captions; offline in both languages. Desktop, mouse:
    the same path, and a held press on a star does not move the hero.
  - Done when: `npm run check`, `npm run build` and `npm run smoke` pass (Chromium here; CI runs WebKit); the new tests
    are shown to fail when the scene is broken on purpose.
  - Result: `npm run check` passes (see 8.1). `npm run build` then the smoke on **Chromium with the iPhone 13 touch profile**
    (WebKit cannot start here; through `.cache/pw.config.ts`, which is not committed) and desktop Chromium, with
    `--workers=1`: **29 passed** (mobile 21: 13 existing and 8 new; desktop 8: 6 existing and 2 new). The 19 existing
    tests are the trial 1, trial 2 and score-attack smokes, unchanged. Mobile, real taps: the title's button opens the
    field with `trial` 3, the run at 60,000 ms and not counting down, the lane and the shed initial; the clue is read from
    the pixels on every star before any tap and matches the round's fake stars (halo 93 for a real star and 167 for a fake
    one; rim break about 0 and 99); no button and no clear panel; a tap puts a real star in the lens and sorts nothing;
    both verdict buttons appear; "fake" for a real star and "real" for a fake star each leave the star unsorted, close
    the lens and change the message; the right verdicts tick the real star and sort the fake one; a tap on a sorted star
    changes nothing; a `KeepStars` sent too early changes nothing and no button shows; the fifth sort shows the one wide
    button; a real quick double tap on it keeps once and does not press "Next stars"; the second round has two fake
    stars; the second keep shows the clear panel, its word, the closing line (different in the other language) and the
    two buttons; a long tick changes nothing; a real quick double tap on "Title" returns to the title and does not start
    trial 1, and 0.9 s later a tap elsewhere does; "Play again" starts round 2 for the same seed; on a grayscale screen
    (`canvas { filter: grayscale(1) }`) the clues read the same and the fake halo is more than 40 brighter, and no sound
    call is made during a whole sort; the title shows trial 1's card text and each button's label and caption in both
    languages; the whole path works offline in ja and en with no request. Desktop, mouse: the same path, and a held
    press on a star does not move the hero while a held press on the floor does. Screenshots were written for the
    Japanese start, look, both misses, a sorted fake star, ready, kept and cleared screens and the English cleared,
    run 2 and back screens, and the two titles. **The new tests against 6 deliberate breaks** (each applied, built, the
    field tests run, restored): the fake halo as dim as the real one fails 2 mobile tests; the fake rim as a line 2; a
    wrong verdict that sorts the star 1; the title lock removed 1; the verdict buttons shown with no star in the lens
    1; the button lock set to 0 ms 1 (the double tap on the keep button). **Not run:** the default two workers on the
    final tree. An earlier full run with two workers, on an earlier tree, failed 11 tests: 7 were bugs in the new
    smoke that were fixed afterwards (the button probes, the clear-panel probe, a sort of a star already sorted), and
    4 were trial 1 tests that pass alone and with one worker. I did not find out why those four failed in parallel (a
    loaded sandbox is a guess). The long field tests set their own 90 to 150 s limits; if CI has the same trouble, give
    the trial 1 tests more time rather than shorten the field tests. **CI's `smoke` job** (real WebKit for
    the mobile project) is recorded in the pull request, since a record cannot contain its own result.

## 8. Final integration

- [x] 8.1 Record the change: `CHANGELOG.md`, the trial 3 row in `docs/learning-design.md`, the checklists,
      `docs/evidence/didnt-work.md`, and the Result lines of this file; run everything once more.
  - Requirements: REQ-6.12, REQ-6.13, REQ-6.14; inherited REQ-2.15, REQ-3.9, REQ-4.8, REQ-5.15
  - Tests: `npm run check`, `npm run build`, `npm run smoke`; the smoke of trials 1 and 2 (including the score
    attack) unchanged and green.
  - Done when: CI's `smoke` (WebKit) is green on the pull request. Until then the work is not called done.
  - Result: **Re-measured on the clean branch `06-trial-verify-stars/clean` (the same tree on top of `main`):** `npm run check` exits 0 on
    Node 26.13.0 with the same figures as below (668 tests, mutation score 100% of 1,050 mutants: 1,039 killed, 1 timeout, 4 ignored,
    6 module-crash errors, none survived; `check-trace: 36 invariants, 0 without tests`; size 363.1 KB gzip); `npm run build` then
    the smoke on Chromium with the iPhone 13 touch profile, `--workers=1`: 29 passed. The field was also played by hand-written real
    taps (throwaway script, not committed) in Japanese, in colour and in grayscale: a wrong verdict sorts nothing, a right one sorts the
    star, the keep takes the real stars, the second keep shows the clear panel, and "Title" returns to the title. CI is in the pull
    request. The figures below were first measured on the branch `06-trial-verify-stars/trial-3`: `npm run check` passes on Node 26.13.0 (668 tests,
    coverage 100% on statements, branches, functions and lines, mutation score 100% with 1,050 mutants of which 1,039
    were killed, 1 timed out, 4 were ignored by `Stryker disable` and 6 crashed their module and are reported as
    errors, not survivors; `check-trace: 36 invariants, 0 without tests`; size budget 363.1 KB of 1,024 KB gzip);
    `npm run build` then the smoke on Chromium: 29 passed (see 7.1). `CHANGELOG.md` has the entry,
    `docs/learning-design.md` row 3 says what the trial does, `docs/device-checklist.md` has the trial 3 lines (including
    the title's 60 seconds and the grayscale, silent check), and `docs/evidence/didnt-work.md` has the things that
    did not work. **A semantic review of the diff** (the `semantic_reviewer` sub-agent, not the project's `reviewer`)
    found three things, all fixed: a quick double tap on one button pressed the button that replaced it (the 450 ms
    button lock); the title's `touchmove` guard had been removed on shutdown, which would have left the other scenes
    without it (it is added once and kept); and the message for the fifth star was replaced by a stage message, which
    lost the wisp's "mixed it up" line when the fake star was sorted last (the `ready` message was removed). The
    CI of the pull request is not recorded here, since a record cannot contain its own result; it is in the pull
    request. **Still not verified:** no real phone, no real child (the weekly pass in `docs/device-checklist.md` and the
    next playtest do that); real WebKit (CI's `smoke` job); the `reviewer` and `kid-reader` agents were never run, only
    their rubrics applied by hand.
