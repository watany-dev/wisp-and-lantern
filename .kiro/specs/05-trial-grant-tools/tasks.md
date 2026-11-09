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

- [x] 3.1 Add `shed.model.test.ts`: the entrance from the title and the shed after it, with the alphabet,
      invariants, goals and witnesses in the design, and the deliberate breaks with their counterexamples.
      The trial 1 model checks are not changed.
  - Requirements: REQ-5.6, REQ-5.13
  - Tests: `shed.model.test.ts`: the number of reached states; invariants hold; goals 1 to 3; a key
    `open`, a broom `shut` and a hammer `shut` are each reachable (shortest trace); a `shut` result leads
    back to a fresh choosing; each deliberate break fails with its counterexample.
  - Done when: `npm run check` passes; the Result lists the state count and the counterexamples.
  - Result: `npm run check` passes on Node 26.13.0: 365 tests (14 new, all in `shed.model.test.ts`),
    coverage 100%, mutation score 100% (485 mutants, none survived; this task changes no source), size
    budget ok. **The model reaches 84 states**: the title (2 languages x 2 hero positions) and the shed
    (2 x 2 x 20: choosing with nothing picked and with each of 3 tools picked, each with 0, 1 or 2
    successes so far; a tried key with 1 or 2; a tried broom and a tried hammer with 0, 1 or 2). All six
    invariants hold in all 84, and goals 1 (key `open` reachable), 2 (a fresh choosing reachable) and 3
    (a second success reachable) hold from every one of them, from the title included. **Evidence of
    reach** (shortest traces from the invariant "never this state"): a key `open`, a broom `shut` and a
    hammer `shut` each in 3 events (`StartShed, PickTool <tool>, GiveTool`); a second success in 6
    (`... RetryShed, PickTool key, GiveTool`); from a broom or a hammer result, `RetryShed` alone reaches
    a fresh choosing and leaves language, hero and `trial` 2 as they were; from a success the replay
    reaches `open` again in 3 events. **Deliberate breaks**, each a `step` around the real `reduce`: the
    key's hand-over ignored leaves goal 1 stuck in every state (counterexample: the start, trace
    empty); `RetryShed` ignored makes a broom result a soft-lock (trace `StartShed, PickTool broom,
    GiveTool`); `RetryShed` ignored after a success keeps goal 1 green and makes goal 3 stuck from the
    start (from the success itself: the tried key, empty trace); `GiveTool` that always hands over the key
    breaks the tried-tool invariant (`StartShed, PickTool broom, GiveTool`); `PickTool` that keeps the
    first pick breaks the pick invariant (`StartShed, PickTool key, PickTool broom`); `Tick` that runs the
    clock in the shed breaks the run invariant (`StartShed, Tick 1000`). While writing it, the first
    version of the "`RetryShed` ignored" test expected a stuck goal and got an invariant violation
    instead: the bookkeeping (`expected`) assumes a retry works. A goal break is therefore checked
    without the invariants, and an invariant break without a goal. The trial 1 model checks were not
    touched and still pass.

## 4. Content

- [x] 4.1 Add the `shed` group to both string files, regenerate the subset font, and add
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
  - Result: `npm run check`, `npm run kid` and `npm run font` pass on Node 26.13.0: 382 tests (17 new in
    `shed-content.test.ts`), coverage 100%, mutation score 100% (no source changed), size budget ok.
    `npm run font` left the subset font byte-identical (`git status` shows no change): the 352 code points
    already cover the new strings. **The kid-reader pass was the manual rubric** of
    `.kiro/agents/kid-reader.md`, not the agent (it cannot be run from this session); the table is in the
    pull request. It changed two English strings (`guide` and `ready`: "hand over" became "give") and kept
    the closing line as the request suggested; the Japanese closing line and the `retry` label are marked
    "playtest". **The new tests against ten deliberate breaks** (each applied to a string file and
    restored): "did not work" in `shut` fails 2 tests; `open` repeating the closing line fails 3; "two"
    in `pick` fails 1; a kanji in `shut` fails 1 and `npm run kid` fails too; the closing line without a
    tool name fails 3; `ready` without the wisp fails 1; "always" in the closing line fails 3; `retry`
    without another tool fails 1; a 31-character English line fails 1. One break, a Japanese closing line
    that is 13 characters once the hammer is inserted, fails 1 test while `npm run kid` passes, because
    the gate counts the template's `{0}` as 3 characters: the content test is the only check of that
    case. My first version of that break (11 characters) failed nothing, since it was not over the limit.

## 5. View and layout

- [x] 5.1 Add `shed-layout.ts`, `shed-view.ts` and `route.ts`, with unit tests. Nothing in a scene calls
      them yet.
  - Requirements: REQ-5.2, REQ-5.3, REQ-5.4, REQ-5.5, REQ-5.6, REQ-5.8, REQ-5.9, REQ-5.10; inherited REQ-2.10
  - Tests: `shed-view.test.ts` (per stage and language: message, button, armed, tools, marks, picture,
    lesson only on open, wisp target, the tool name in the message equals the tried tool, all three tools);
    `shed-layout.test.ts` (inside the canvas, no overlap per stage, targets at least 80, the hero strip
    free, the probes inside the picture); `route.test.ts` (`sceneFor` for every phase and trial).
  - Done when: `npm run check` passes with no surviving mutant.
  - Result: `npm run check` passes on Node 26.13.0: 465 tests (83 new: 61 in `shed-view.test.ts`, 17 in
    `shed-layout.test.ts`, 5 in `route.test.ts`), coverage 100%, mutation score 100% (589 mutants, none
    survived; 1 mutant, `strings = {}`, crashes the module and is reported as an error, not a survivor),
    size budget ok. The first run failed knip on an unused exported type (`ShedPicture`), now not
    exported. The diff is about 670 lines, of which 460 are tests; I did not split it because the view
    imports the layout and the scene choice is 13 lines. **Ten deliberate breaks** (each applied, `src/game`
    tests run, restored): the closing line on every result fails 6 tests; a door that opens for any
    tool fails 6; an armed wisp with nothing picked fails 2; the message naming the key whatever was
    tried fails 6; every tool marked after the hand-over fails 18; the unpicked tools not fading fails 6;
    the wisp staying home after the hand-over fails 6; trial 2 showing the lane scene fails 2; the wisp
    standing on the door fails 2; the tool row moved up into the button fails 5. Nothing in a scene
    calls the new modules, so the game is unchanged; the smoke was not run for this task.

## 6. Scene and entrance

- [x] 6.1 Draw the shed (`ui/shed-art.ts`, `ui/cat.ts`, `ui/tools.ts`, `ui/tool-card.ts`,
      `shed-palette.ts`), add `ShedScene`, register it, and add the title's shed button with the
      "press hit no object" guard and `sceneFor`.
  - Requirements: REQ-5.1, REQ-5.2, REQ-5.5, REQ-5.9, REQ-5.10, REQ-5.11; inherited REQ-4.9, REQ-4.11
  - Tests: scenes are excluded from unit tests (ADR 0003). `npm run check`, `npm run build` and the
    existing 11 smoke tests pass (trial 1 and the score attack are unchanged). The built page is driven
    by real taps and looked at in screenshots in both languages and all three tools.
  - Done when: the above, and the screenshots were read.
  - Result: `npm run check` passes on Node 26.13.0: 473 tests (8 new: 6 in `shed-palette.test.ts` for the
    colors the smoke will read, 2 in `shed-view.test.ts` for `justTried`, which keeps the scene's
    branch count under the lint limit), coverage 100%, mutation score 100% (599 mutants, none survived),
    size budget ok (gzip JS 369 KB of 1,024 KB). `npm run build` then the existing smoke: **11 passed**
    on Chromium with the iPhone 13 touch profile (the 7 mobile and 4 desktop tests; WebKit cannot start
    in this sandbox, so this is not the WebKit pass, which CI runs). Trial 1 and the score attack are
    unchanged. **Looked at, not only tested:** a throwaway Playwright script (kept out of the repository)
    entered the shed with a real tap on the title's button, then drove the broom, the hammer and the key
    with real taps in `?lang=ja` and `?lang=en`, and I read the title and the choosing, picked, broom,
    hammer and key screenshots. Seen: the title shows the key button below the wisp and the hero
    with the rest unchanged; the shed has its locked door with a padlock and the cat's face in the
    window; the wisp is dimmed until a tool is picked; the picked card has a thick frame and a tick, the
    others fade after the hand-over; with the broom and the hammer the tool is on the lock, the door and
    the padlock stay shut and the cat stays in the window, with the shut message and "try another tool"
    button; with the key the door swings open, the padlock is open, the window is empty, the cat sits by
    the shed under a star, and the message, the closing line and the play-again button show in order
    without overlap. The Japanese and English texts fit their boxes (the longest English line,
    `It opened the door`, takes about half of the closing-line panel, so the 20-character allowance is
    safe). One thing I noticed and left: the button label sits a little high on its face, as in trial 1.
    The state after the title tap was `trial` 2, the run untouched (60,000 ms, score 0), the lane
    initial, so the button did not start trial 1.

## 7. Smoke

- [x] 7.1 Add the shed smoke: `e2e/shed-helpers.ts`, `smoke.mobile.shed.spec.ts`,
      `smoke.desktop.shed.spec.ts`, and the `shed` field in the `GameState` type of `e2e/helpers.ts`.
  - Requirements: REQ-5.1, REQ-5.3, REQ-5.4, REQ-5.5, REQ-5.6, REQ-5.7, REQ-5.8, REQ-5.9, REQ-5.10, REQ-5.12, REQ-5.14; inherited REQ-2.12
  - Tests: mobile, real taps: no tool and a tap on the wisp; broom, hand over, shut, retry, key, open,
    key name, closing line; hammer, hand over, shut, retry, key, open, closing line; a pick replaced; the
    lock while a result shows; a replay after a success; the pixels of the door, the cat, the tool names
    and the closing line; ja and en screenshots; offline in both languages. Desktop, mouse: the same
    path, and a held press on a tool does not move the hero.
  - Done when: `npm run check`, `npm run build` and `npm run smoke` pass (Chromium here; CI runs
    WebKit); the new tests are shown to fail when the scene is broken on purpose.
  - Result: `npm run check` passes on Node 26.13.0 (473 tests, coverage 100%, mutation 100%, size budget
    ok). `npm run build` then `npm run smoke` on **Chromium with the iPhone 13 touch profile** (WebKit
    cannot start here): **19 passed** (mobile 13: 7 existing, 6 new; desktop 6: 4 existing, 2 new),
    twice in a row with the default workers and once with `--workers=1`; CI runs the real WebKit pass.
    Mobile, real taps: the title's button opens the shed with `trial` 2, the run at 60,000 ms and not
    counting down, the lane initial; the wisp with nothing picked changes nothing; a pick is replaced and
    exactly one tool is marked (read from the pixels of the gold mark); picking uses nothing; the broom
    and the hammer leave the door shut with the cat in the window; a tap on the key and on the wisp while
    the result shows, and a dispatched `Tick` of 60 s, change nothing; the retry restores a fresh shed;
    the key opens the door (the doorway is dark, the window empty, the cat and the star by the shed), the
    result message differs between the broom and the hammer, the closing line is drawn, it changes when
    the language changes, and it is still there after 1 s; play again restores the shut door and the key
    opens it again; a tap elsewhere on the title starts trial 1 (`trial` 1, shed fresh, the clock
    running); the whole path works offline in ja and en with no request. Desktop, mouse: the same path,
    a held press on a tool does not move the hero, and a held press on the floor does. Screenshots were
    written for the Japanese and English choosing, shut and open screens. **The new tests against six
    deliberate breaks** in the scene (each applied, built, the 8 new tests run, restored): the door
    never drawn open fails 5; the cat left in the window fails 5; the closing line never shown fails 5;
    picking that also hands over fails 7; the picked mark never shown fails 3; and the guard in the
    title ("a press that hit no object starts trial 1") removed fails **0**. The last one is a gap I could
    not close: Phaser runs the button's handler first, so the extra `Start` that follows reaches the
    shed and only sets the language. The guard is defense in depth for the opposite order, not something
    a smoke can observe. **One existing test changed**: the Japanese trial 1 test
    "a color alone brings another object ..." gets `test.slow()`. It takes about 20 s alone and with two
    workers it started to pass its 30 s limit next to a shed test (every full run with two workers failed
    before the change, 5 of 5; the two after it passed); nothing it asserts is touched. The other additions to `e2e/helpers.ts` are
    exports and the `shed` field of the `GameState` type.

## 8. Final integration

- [ ] 8.1 Record the change: `CHANGELOG.md`, the trial 2 row in `docs/learning-design.md`, and the
      Result lines of this file; run everything once more on the merged `main`.
  - Requirements: REQ-5.13, REQ-5.14, REQ-5.15; inherited REQ-2.15, REQ-3.9, REQ-4.8
  - Tests: `npm run check`, `npm run build`, `npm run smoke`, `npm run mutation`; the trial 1 smoke
    (including the score attack) unchanged and green.
  - Done when: CI's `smoke` (WebKit) is green on the final pull request. Until then the work is not
    called done.
  - Result: filled in the task's pull request
