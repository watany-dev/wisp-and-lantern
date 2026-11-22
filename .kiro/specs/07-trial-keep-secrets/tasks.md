# Tasks: Trial 4, The Listening Shadows

One task per branch and per pull request (`AGENTS.md`), branch `07-trial-keep-secrets/<task>`. Every task leaves the
game working and passes `npm run check`; tasks that connect input to the screen also pass `npm run build` followed by
`npm run smoke`. Sized for review on a phone: aim for a few hundred changed lines, tests included.

**How this spec was built.** Like the first build of `06-trial-verify-stars` and its revision 3, this spec was built
in one session on one branch (`07-trial-keep-secrets/trial-4`), because the pieces do not build apart: the domain,
the view, the scene and the shared title change together, and the tree only builds once they agree on the events.
The tasks below are the order the work was done in and the order a reviewer should read the diff in. Each Result
line says what was run and what it showed; the figures in 8.1 are from the final tree.

Status: `[ ]` open, `[x]` done. Nothing is recorded as run unless it was run.

How the order keeps each step shippable (REQ-7.14): 2.1 adds the rules and nothing reaches them; 3.1 checks them;
4.1 adds the words without using them; 5.1 adds the screen's logic without drawing it (knip counts the tests as
users); 6.1 draws it and changes the title, the only task that makes the bag reachable; 7.1 plays it with real taps;
8.1 records it. Nothing reaches the child before 6.1, and trials 1 to 3 are untouched until then.

The smoke runs on Chromium with the iPhone 13 touch profile in the authoring sandbox (WebKit cannot start there);
CI runs the real WebKit pass and counts. The `kid-reader` rubric was applied by hand because the agent
cannot be run from this session; the `reviewer` agent was not run, and the pull request says so.

## Tests of the old behavior that this spec changes (REQ-7.14.1)

| old test | file | new | why trials 1 to 3 are not weaker |
|---|---|---|---|
| `titleArt` pinned at wisp (285, 538) and hero (110, 548) | `field-layout.test.ts` | (285, 444) and (110, 454), with a comment naming this spec | the art moved up 94 pixels for the bag's button; every check that the art clears the card and the buttons still runs, now against `titleArtBottom` 512, and `bag-layout.test.ts` adds the same checks for the third button |
| `titleView` equals seven keys | `title-view.test.ts` | nine keys (`bag`, `bagCaption`) | the shed's and the field's words are compared exactly as before |

No other existing test was changed. `reducer.test.ts` gained one import (`isSecretAt`) and new cases at the end;
`route.test.ts`, `over-view.test.ts` and `title-view.test.ts` gained cases at the end. Apart from the two rows above,
no existing case was edited and no line was removed. The smoke of trials 1 to 3 is not touched; `e2e/helpers.ts` only gained `bag` in its `GameState` type.

## 1. Spec

- [x] 1.1 Write `requirements.md` and `design.md` (the Decisions included) and this file, with the Japanese
      translations in `jp/`, and correct the trial 4 row of `docs/learning-design.md`.
  - Requirements: REQ-7.1, REQ-7.2, REQ-7.3, REQ-7.4, REQ-7.5, REQ-7.6, REQ-7.7, REQ-7.8, REQ-7.9, REQ-7.10, REQ-7.11, REQ-7.12, REQ-7.13, REQ-7.14
  - Tests: none (documents). `npm run check` includes `check-trace` and the Japanese-text gate (specs are on the
    allowlist).
  - Result: `npm run check` passes (see 8.1). The English requirements and design were written first, then the code;
    the design was corrected to what was built (the tick probe, the rule card's probe on the pin, the `reduceLaterTrial`
    split). The Japanese copies follow the final English text. The trial 4 row of `docs/learning-design.md` now says
    what the trial does and no longer lists the house key and a name among the safe things (REQ-7.14.4). Every
    `REQ-7.n` appears in this file, so `check-trace` raises no warning for spec 07.

## 2. Domain: the bag rules

- [x] 2.1 Add `bag.ts` (`Bag`, `itemsOf`, `itemAt`, `isSecret`, `isSecretAt`, `newBag`, `givenItems`, `isDone`,
      `handOver`, `reduceBag`), the events `StartBag { seed }`, `GiveItem`, `RetryBag` and `LeaveBag`, `bag` in
      `GameState` and `trials.bag`, and the reducer cases with the `trial` guards (`reduceBagTrial`, `startBag`,
      `leaveBag`, `giveItem`). Add INV-46 to INV-57 to `domain-invariants.md` and widen INV-15 to INV-17, each with
      its property test in the same pull request.
  - Requirements: REQ-7.1.2, REQ-7.3, REQ-7.4, REQ-7.5, REQ-7.7, REQ-7.8, REQ-7.12
  - Invariants: INV-46 to INV-57; INV-15 to INV-17 for the bag; INV-1 to INV-4 re-run with the bag events
  - Tests:
    - `bag.test.ts`: `itemsOf` pinned for seeds 0 to 3; five things, no thing twice, 1 or 2 secrets for 300 seeds;
      the spread over 400 seeds (every place gets secrets, every thing comes up); a negative or fractional seed; a
      safe hand-over; a secret held back, again and again; every secret of every round; a thing already given; bad
      indexes; the order; the last safe thing; a secret never finishes a round; the lock of a done round; the retry
      and the wrap.
    - `reducer.test.ts` (new cases only, at the end): `StartBag` from the title and the bag's end screen only; the
      seed made whole; the other entrances and `Start` in the bag; `Start` on the bag's end screen; the score and the
      streak (100, 150, 200, 250, 300); a stray tap; the done round and `RetryBag`; the bag events outside the bag;
      `Tick` and time up in every stage; `LeaveBag` from a run and the end screen and nowhere else; the other trials'
      events in the bag; the lane, the shed and the field untouched.
    - `bag.pbt.test.ts`: INV-1 to INV-4 over sequences with the bag events; INV-46 to INV-57 and INV-15 to INV-17
      for the bag, each by `checkProperty`; a coverage test that the generators reach a hand-over, a secret, a thing
      given again, a bad index, a done round, the next round, the wrap, the time up, play again, trial 1 from the
      end screen and the leave.
  - Done when: `npm run check` passes with no surviving mutant, `check-trace` reports every invariant tested, and each
    rule is shown to fail a test when broken on purpose.
  - Result: `bag.test.ts` has 18 tests, `bag.pbt.test.ts` 19, and `reducer.test.ts` 16 new `it` blocks (124 against
    108 on `main`). `reduceTrial` would have passed the lint limit of 15 with two more cases, so its default branch
    goes to `reduceLaterTrial`, which sends the field's and the bag's events on (no behavior change: the field's tests
    pass unchanged). `check-trace: 53 invariants, 0 without tests`. **22 deliberate breaks** of `bag.ts` and
    `reducer.ts` (each applied, `npx vp test run src/domain` run, the file restored; the failing-test count in
    brackets): a secret handed over (19); a safe tap that hands over nothing (28); a round never done (21); a round
    done at the first hand-over (29); a thing given twice (14); an index that is not a thing taken (13); `RetryBag`
    keeping the round (15), working while giving (16), not wrapping (18); the things ignoring the round (12) or the
    seed (13); one secret in every round (17); a secret tap that scores (15); a hand-over that ends the streak (23);
    `Tick` not running in the bag (23); `LeaveBag` working anywhere (2) or keeping the bag (13); `StartBag` from any
    phase (16) or dropping the seed (15); `Start` keeping the bag (1); the bag events outside a run of trial 4 (20);
    `GiveItem` acting in the field (2). The first run of "`Start` keeps the bag" failed only one unit test and no
    property: the generators never reached `Start` on the bag's end screen. A "time up, then `Start`" ending was added
    to the round generator and to the coverage test, and the break then failed INV-53 too.

## 3. Model check

- [x] 3.1 Add `bag.model.test.ts`: the entrance from the title with two seeds, the bag after it and the leave, with the
      independent record, the invariants, the goals and the witnesses in the design, and the deliberate breaks with
      their counterexamples. The model checks of trials 1 to 3 are not changed.
  - Requirements: REQ-7.4.1, REQ-7.5, REQ-7.7.7, REQ-7.12.4
  - Tests: `bag.model.test.ts`: the number of reached states; every invariant in every state; the six goals from every
    state, and two without the clock and the way back; the shortest traces; each deliberate break fails with its
    counterexample.
  - Done when: `npm run check` passes; the Result lists the state count and the counterexamples.
  - Result: 25 tests pass. **The model reaches 1,442 states**, and all eight invariants hold in every one of them (no
    secret is ever handed over; the bag equals the record; the clock agrees; the score moves only on a safe
    hand-over). From every state a done round, the title, the end screen, a fresh round, a score and a second done
    round are reachable, and a done round and a second done round stay reachable without `Tick` and the three
    leaves. **Shortest traces:** a secret tap in 2 events (`StartBag`, `GiveItem 1`); a score in 2; a done round in 5
    (the entrance and the four safe things of seed 0); the end screen in 2; the title in 1 from a run and from the
    end screen; the next round in 1 from a done round. **10 deliberate breaks**, each a `step` around the real
    `reduce`: a secret tap that hands the secret over breaks "no secret is ever handed over" after
    `[StartBag, GiveItem 1]`; a safe tap that hands over nothing, and a tap that hands over the next thing, break "the
    bag holds exactly what the child did" after `[StartBag, GiveItem 0]`; a round done with a safe thing left breaks
    "a round is done only after every safe thing" after `[StartBag, GiveItem 0]`; a secret tap that scores breaks the
    score invariant after 2 events, and one that keeps the streak after 3 (`[StartBag, GiveItem 0, GiveItem 1]`);
    `RetryBag` ignored leaves the second done round unreachable from the start (a fresh round stays reachable by the
    leave); `LeaveBag` ignored leaves the title unreachable once the bag is entered; `Tick` ignored in the bag leaves
    the end screen unreachable from the start; an end screen that takes nothing leaves the title unreachable after
    `[StartBag, Tick 60000]`.

## 4. Content

- [x] 4.1 Add the `bag` group to both string files, check the subset font, and add `bag-content.test.ts`. The wording
      is decided here with the kid-reader rubric.
  - Requirements: REQ-7.1.1, REQ-7.4.2, REQ-7.4.5, REQ-7.6, REQ-7.11; inherited REQ-2.9, REQ-2.13, REQ-3.6
  - Tests: `bag-content.test.ts`: the same keys in both languages; one `{0}` in `given`, `secret` and `done` and
    nowhere else; the Japanese rules with every name and number inserted; English lines of at most 28 characters;
    names that fit a 104 px card; one-line button labels; the guide names the three secrets and "to anyone"; the
    secret message says "a shadow may be listening", with "may"; the house key is not the shed's key; the closing
    line shares no line with the done message or the guide; "Next" is the lane's word; the title caption; no blame
    or fear words, no claims, no "name".
  - Done when: `npm run check`, `npm run kid` and `npm run font` pass; the kid-reader table is in the pull request and
    says whether it is the agent or the manual rubric.
  - Result: 22 tests pass. `npm run kid` passes. `npm run font` reports 352 code points and left the subset font
    byte-identical (`git status` shows no change under `public/`): every kana in the new strings was already in it.
    **The kid-reader pass was the manual rubric** of `.kiro/agents/kid-reader.md`, not the agent (it cannot be run
    from this session); the table is in the pull request. It changed one string: `bag.done` was `{0}こ わたせたよ`,
    which did not say "safe" as the English does (the rubric's point 4, "the Japanese and English say the same
    thing"). The first fix, `いいもの {0}こ わたせたよ` on one line, failed `npm run kid` (13 characters: the gate counts
    `{0}` as three); it is now two lines, `いいものを⏎{0}こ わたせたよ`, and `bag-content.test.ts` checks `いいもの` in it.
    `じゅうしょ`, `あいことば` and `かげが きいてるかも` are marked "playtest".

## 5. View, layout and the title's words

- [x] 5.1 Add `bag-layout.ts` and `bag-view.ts` with unit tests; move the title's name, card and art up and add the
      bag's button (`title-layout.ts`, `field-layout.ts`, `shed-layout.ts`, `title-view.ts`); add `"bag"` to
      `route.ts` and the bag's two actions to `over-view.ts`. Nothing in a scene calls them yet.
  - Requirements: REQ-7.1, REQ-7.2, REQ-7.3, REQ-7.4.6, REQ-7.5, REQ-7.6, REQ-7.7.4, REQ-7.8.2, REQ-7.9; inherited REQ-2.10
  - Tests: `bag-view.test.ts` (per stage and language: the message, the names, the ticks, the padlocks, the rule
    card, the closing line only after a done round, "Next" only then; the flourish helpers); `bag-layout.test.ts`
    (inside the canvas and no overlap in both stages, targets of 80 or more, the order from the top, the hero strip
    free, the shadows beside the wisp, the badges inside the card and apart, the probes where they say, the three
    title buttons and the card apart, the middle of the canvas free); `title-view.test.ts`, `route.test.ts` and
    `over-view.test.ts` (new cases).
  - Done when: `npm run check` passes with no surviving mutant.
  - Result: `bag-view.test.ts` has 22 tests, `bag-layout.test.ts` 21, and `title-view.test.ts`, `route.test.ts` and
    `over-view.test.ts` 1, 3 and 3 new cases. Coverage is 100% on every metric. The first full mutation run found 2
    survivors in `bag-view.ts`: `if (!before) return null` in `justGiven` and `now === null` in `justHeld` could be
    replaced by `false`. Neither was equivalent (both mutants throw on an input no test gave), so two cases were
    added (no view before but a thing given; no tap yet) and each mutant was shown to fail a test. The rerun has no
    survivor. `route.ts` now picks a trial's scene from a lookup table, so a fifth trial falls back to the lane as
    before (`route.test.ts` checks `trial` 5).

## 6. Scene and entrance

- [x] 6.1 Draw the bag (`ui/bag-items.ts`, `ui/item-card.ts`, `ui/shadow.ts`, `ui/bag-rules.ts`), add `BagScene` and
      register it in `boot.ts`, add the third entrance to `TitleScene`, and the bag's two actions to `OverScene`.
  - Requirements: REQ-7.1, REQ-7.2, REQ-7.3.4, REQ-7.4.3, REQ-7.7, REQ-7.9, REQ-7.10
  - Tests: scenes are excluded from unit tests (ADR 0003). `npm run check`, `npm run build` and the existing smoke
    pass. The built page is driven by real taps and looked at in screenshots in both languages.
  - Done when: the above, and the screenshots were read.
  - Result: `npm run build` passes. **Looked at, not only tested:** a throwaway Playwright script in `.cache/` (not
    committed) opened the bag from the title with a real tap and played it in `?lang=ja` and `?lang=en`; I read the
    Japanese title (three buttons, each with its caption; the card above the art), the Japanese start (five cards, the
    rule card with three padlocked pictures, two shadows beside the wisp, "Title"), a Japanese secret tap
    (`じゅうしょは ないしょ！ / かげが きいてるかも`, the acorn ticked, nothing on the address), the Japanese done round
    (four ticks, the padlock on the address, `4こ わたせたよ`, the closing line in the gold-edged panel, `つぎへ`),
    the English secret tap ("The house key is a secret! / A shadow may be listening") and the English end screen
    ("Time's up!", "New best!", "Score 550", "Play again", "Title"). After the change to `bag.done` (4.1) the Japanese
    done round was looked at again: `いいものを / 4こ わたせたよ` sits on two lines above the closing line's panel.
    Nothing overlapped and no line was cut. **Seen and left:** the hero stands just above the wisp and the shadows;
    the "Next" button ends above the hero's start (the layout test checks it); `おうちの かぎ` nearly fills its card's
    width at 16 px (the content test allows 6 kana for a name; this one has 6). The `drawEar` export was made private after knip reported it unused.

## 7. Smoke

- [x] 7.1 Add the bag smoke: `e2e/bag-helpers.ts`, `smoke.mobile.bag.spec.ts`, `smoke.desktop.bag.spec.ts`, and `bag`
      in the `GameState` type of `e2e/helpers.ts`.
  - Requirements: REQ-7.1, REQ-7.2, REQ-7.3, REQ-7.4, REQ-7.5, REQ-7.6, REQ-7.7, REQ-7.9, REQ-7.10, REQ-7.11, REQ-7.13; inherited REQ-2.12
  - Tests: mobile, real taps: the title's button; the clock and the score drawn; a safe thing ticked and scored; a
    secret held back with the score kept and the streak ended; a thing tapped twice; all safe things, the padlocks,
    the closing line and "Next"; a done round that takes no tap; the second round with two secrets; time up; play
    again with the best kept; a real quick double tap on "Title"; the end screen's "Title"; the title's three buttons
    in both languages; offline in both languages. Desktop, mouse: the same path, and a held press on a thing does not
    move the hero.
  - Done when: `npm run check`, `npm run build` and `npm run smoke` pass (Chromium here; CI runs WebKit); the new tests
    are shown to fail when the scene is broken on purpose.
  - Result: see 8.1 for the whole smoke. The bag's own tests: **9 passed** (mobile 7, desktop 2) on Chromium with the
    iPhone 13 touch profile and desktop Chromium, `--workers=1`, through `.cache/pw.config.ts` (not committed).
    **4 deliberate scene breaks** (each applied, built, the bag's mobile smoke run, restored): the tick never drawn
    fails 2 tests; the padlock never drawn 1; the rule card never hidden 1; the title's bag button opening the field
    6. The rule-card break first passed every test: the closing line lies over the rule card's padlocks, so "the
    three padlocks are white" was false whether the card was gone or only covered. The probe moved to the red head of
    the address picture's pin (`rulePinProbe`, whose offset `addressPin` the drawing now reads too), and "gone" means
    almost no red: measured on Chromium, about 55 red pixels while the card is shown, 0 once it is gone, and about 5
    when the broken scene leaves it under the closing line. **CI's `smoke` job** (real WebKit) is recorded in the pull
    request, since a record cannot contain its own result.

## 8. Final integration

- [x] 8.1 Record the change: `CHANGELOG.md`, the trial 4 row in `docs/learning-design.md`, `docs/device-checklist.md`,
      `docs/evidence/didnt-work.md`, and the Result lines of this file; run everything once more.
  - Requirements: REQ-7.12, REQ-7.13, REQ-7.14; inherited REQ-2.15, REQ-3.9, REQ-5.15, REQ-6.14
  - Tests: `npm run check`, `npm run build`, `npm run smoke`; the smoke of trials 1 to 3 unchanged and green.
  - Done when: CI's `smoke` (WebKit) is green on the pull request. Until then the work is not called done.
  - Result: **Run in the authoring sandbox on Node 26.13.0.** `npm run check` exits 0: format, lint and types pass;
    knip passes; 47 test files and 1,020 tests pass at 100% coverage (582 statements, 400 branches, 196 functions,
    496 lines); `check-trace: 53 invariants, 0 without tests`; ShellCheck was skipped (neither the binary nor Docker
    is here; CI runs it); mutation score 100% (1,405 killed, 4 timed out, 0 survived, 7 module-crash errors reported
    as errors and not survivors, 6 in `field-view.ts` and 1 in `shed-view.ts`, as before this change); the size
    budget is 368.4 KB of 1,024 KB gzip. `npm run build`, then the whole smoke on Chromium with the iPhone 13 touch
    profile and desktop Chromium, `--workers=1`: **41 passed** (mobile 31, desktop 10) in 8.8 minutes, on the tree
    before the last string change (`bag.done`, 4.1). The 32 tests of trials 1 to 3 and the score attack are among
    them and were not changed; the 9 others are the bag's. After the string change, `npm run check` above was rerun
    (those are its figures) and the bag's 9 smoke tests were run again: 9 passed. **Not run:** the smoke on real WebKit (CI); a real
    phone; a real child; the `kid-reader` agent (its rubric was applied by hand, 4.1); the `reviewer` agent and its
    rubric; CI's jobs, since a record cannot contain its own result.
