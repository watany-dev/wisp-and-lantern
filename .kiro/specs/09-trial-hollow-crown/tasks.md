# Tasks: Trial 6, The Hollow Crown

One task per branch and per pull request (`AGENTS.md`). Like spec 08, this spec is built in one session on one branch
(`09-trial-hollow-crown/trial-6`) and goes into one pull request, because the user asked for the spec and the whole
trial together, and because the tree only builds once the domain, the view and the scene agree on the events. The pull
request says so. Every task leaves the game working and passes `npm run check`; tasks that connect input to the screen
also pass `npm run build` followed by `npm run smoke`.

Status: `[ ]` open, `[x]` done. A task fills its **Result** line with what it ran and what it saw. Nothing is recorded
as run unless it was run.

How the order keeps each step shippable (REQ-9.17): 2.1 adds the rules and nothing reaches them; 3.1 checks them; 4.1
adds the words without using them; 5.1 adds the screen's logic without drawing it (knip counts the tests as users); 6.1
draws it and changes the title, the only task that makes trial 6 reachable; 7.1 plays it with real taps; 8.1 records
it. Nothing reaches the child before 6.1, and trials 1 to 5 are untouched until then.

The authoring sandbox runs Node 22 by default and the repository needs Node 26 (`.nvmrc`), so every result below was
produced on the pinned Node 26.13.0 that `scripts/setup-session.sh` installs into `.cache/node`. WebKit cannot start
here, so the mobile smoke ran on Chromium with the iPhone 13 touch profile through a local config in `.cache/` that is
not committed; CI's WebKit run is what counts. The review rubrics of the `reviewer` and `kid-reader` agents were
applied by hand (the agents were not run), and the pull request says so.

## Tests of the old behavior that this spec changes (REQ-9.17.1)

No test of trials 1 to 5 was deleted, and no threshold or invariant changed.

| old test | new test | why trials 1 to 5 are not weaker |
|---|---|---|
| `lantern-layout.test.ts`, "moves the name, the card and the art up 88 pixels, and keeps all four buttons below the art": the name at y 62, the card 340 x 144 at y 194, the prompt at y 160, the rule at y 222 | the same test, named "moves the name, the card and the art up, ...", pinned to y 34, 340 x 128 at y 128, y 96 and y 154 | The name and the card moved so that trial 6's button fits between the card and the art (REQ-9.1.1). The same test still pins `titleArtBottom` at 426 and checks that the art ends above all four buttons; the next tests (the name above the card, the card above the art and clear of every button by more than 100 pixels, the middle of the title outside every button) and `field-layout.test.ts`'s title tests pass unchanged. `crown-layout.test.ts` pins the art, the four buttons and the fifth |
| `title-view.test.ts`, "gives the title's words in each language" | the same test with the fifth button's label and caption added | It only gained expectations |
| `reducer.test.ts`, `route.test.ts` | the same files with trial 6's cases appended | The cases above are byte for byte the same; the new `describe` blocks follow them |
| `e2e/helpers.ts`, the `GameState` type | the same type with the `crown` field | A type only |

`reducer.ts`'s `tick` runs the clock in the trials of `timed` (trials 1 to 5) instead of every value of `trials`, which
now has trial 6: in trials 1 to 5 it does what it did, and INV-15 to INV-17 and their tests pass unchanged.
`ui/field-buttons.ts` exports `drawIcon` for trial 6's controls; the pictures and behavior of trials 3 to 5 are
unchanged, and their smoke passes.

## 1. Spec

- [x] 1.1 Write `requirements.md`, `design.md` and `tasks.md`, with their Japanese translations in `jp/`, and add the
      scope note at the top of the 08 requirements (and its `jp/` copy). Past lines of other specs are not edited.
  - Requirements: REQ-9.1, REQ-9.2, REQ-9.3, REQ-9.4, REQ-9.5, REQ-9.6, REQ-9.7, REQ-9.8, REQ-9.9, REQ-9.10, REQ-9.11, REQ-9.12, REQ-9.13, REQ-9.14, REQ-9.15, REQ-9.16, REQ-9.17
  - Tests: none (documents). `npm run check` includes `check-trace` and the Japanese-text gate (specs are on the
    allowlist).
  - Result: `npm run check` passes (see 8.1); `check-trace` reports 70 invariants, none without a property test. The
    English files were written first and changed during the build where the build found a better rule (the words of
    the check buttons and the clear, the rows of the lamp and the light's cards, the town's lamps; see
    `docs/evidence/didnt-work.md`); the Japanese translations were written from the final English text, the design's
    in a shorter form, as spec 08's is.

## 2. Domain: the rules

- [x] 2.1 Add `src/domain/crown.ts` (the lamp's parts, the jobs and things, `wishAt`, `jobAt`, `thingsAt`, `slipAt`,
      `madeAt`, `cardsOf`, `litCount`, `reduceCrown`), the ten events, `GameState.crown`, `trials.crown` and the
      reducer's `startCrown` and `leaveCrown`, with `Tick` running only in trials 1 to 5 and `Start` dropping the crown.
      Add INV-63 to INV-74 to `.kiro/steering/domain-invariants.md`.
  - Requirements: REQ-9.3, REQ-9.4, REQ-9.5, REQ-9.6, REQ-9.7, REQ-9.9, REQ-9.10, REQ-9.11, REQ-9.15.1
  - Tests: `crown.test.ts`, `reducer.test.ts` (trial 6's cases appended), `crown.pbt.test.ts`
  - Result: all pass: `crown.test.ts` 31 tests (the parts, jobs and initial state; the chains pinned for seeds 0, 1,
    2, 3, 9, 27, 81, 243, 1234, 3^8, 5 x 3^8 and 2^32 - 1; no wish repeating, three different jobs, the slip
    alternating and the job's tool moving for 100 seeds; the made lamp for all nine told lamps in 100 seeds; each event
    in each stage; a clear after three chains); `reducer.test.ts` 188 tests in all, with trial 6's entry, the
    play-again from the clear, the steps through the reducer, isolation both ways, `Tick` doing nothing in every stage,
    and the leave; `crown.pbt.test.ts` 18 tests (INV-1 to INV-4, INV-63 to INV-74, and a check that the generator
    reaches every stage, every note, the last chain, a thing that is not on screen, a handle's look, a look that is no
    card, play again from the clear, the leave, and the other trials' events). The run property (INV-71) judges the
    steps that start or end in trial 6, the #81 rule; the global properties INV-1 to INV-4 and INV-72 judge every step,
    with the events of every trial in the generator. `crown.ts` and `reducer.ts` are at 100% coverage; a Stryker run on
    `crown.ts`, `crown-view.ts` and `crown-layout.ts` kept two mutants in `crown.ts` (a check on the secret's id and one
    on "nothing pointed at" that the rest of the state made redundant); both checks were removed and the run gave
    100.00.

## 3. Model check

- [x] 3.1 Add `crown.model.test.ts`: the real reducer wrapped with an independent record of what the child did.
  - Requirements: REQ-9.3, REQ-9.10.6, REQ-9.15.4
  - Tests: `crown.model.test.ts`
  - Result: all 18 pass in about 6 s. The model has 10,284 states with two seeds, every card and a handle's look, the
    five things of the two seeds and one that is never on screen, both checks, both points, every fix card, the leave,
    both languages, two hero places, a short and a long `Tick`, `Start` in trial 6 and the events of trials 1 to 5. No
    state is dropped and nothing is abstracted. From every state the fix step, a lit lamp, the clear and the title are
    reachable, and without the leave the clear is. Shortest traces: seven events to the fix step, ten to a lit lamp,
    31 to the clear (three chains, each ended by Next). Ten deliberate breaks each fail the check meant to notice them.
    The break "Tick runs a clock" runs on trial 6's own events with one tick and a clock set to 30 seconds, because a
    counting clock takes the broken game past 100,000 states (`docs/evidence/didnt-work.md`).

## 4. Content

- [x] 4.1 Add the `crown` group to `strings.ja.json` and `strings.en.json`, with the content test; run `npm run kid`
      and `npm run font`.
  - Requirements: REQ-9.1.6, REQ-9.8, REQ-9.14, REQ-2.9, REQ-2.10, REQ-2.13, REQ-3.6, REQ-7.4, REQ-7.6, REQ-8.7
  - Tests: `crown-content.test.ts`
  - Result: `crown-content.test.ts` 22 tests pass; `npm run kid` passes. `npm run font` left the subset font file as it
    was (352 code points): it already covers every character of the new strings (`check-font-coverage` passes). Trial
    5's blame list rejected "Not the same", "Look again", "What should it make?" and "You used it all" ("not", "again",
    "should", "all") and the Japanese "mou ichido" and "zenbu"; the words were changed, not the list ("Different",
    "Look closely", "Which lamp do you want?", "Five steps, three lamps"). The list for trial 6 adds "dark", "protect",
    "safe", the Japanese for "dark", "enemy" (`teki`, as trial 4's list has it) and "keeps it for you", and `ちがう`
    everywhere. The kid-reader rubric was applied
    by hand (words, phrase breaks, one idea each, the same meaning in both languages, tone, no color). REQ-7.4, REQ-7.6
    and REQ-8.7 (the tone of trials 4 and 5, inherited as REQ-9.8) are checked here in their trial 6 form.

## 5. View and layout

- [x] 5.1 Add `crown-view.ts` and `crown-layout.ts`; add the title's fifth button and its words and the scene choice;
      move the title's name and card up and make the card shorter.
  - Requirements: REQ-9.1, REQ-9.2, REQ-9.3, REQ-9.4, REQ-9.5, REQ-9.6, REQ-9.7, REQ-9.9, REQ-9.10, REQ-9.11.2, REQ-9.12, REQ-9.14.4
  - Tests: `crown-view.test.ts`, `crown-layout.test.ts`, `title-view.test.ts`, `route.test.ts`,
    `lantern-layout.test.ts` (its pinned name and card)
  - Result: all pass: `crown-view.test.ts` 18 tests, `crown-layout.test.ts` 18 tests, and the changed title and route
    tests. `crown-view.ts`, `crown-layout.ts`, `route.ts`, `title-layout.ts` and `title-view.ts` are at 100% coverage.
    Stryker kept five mutants in the first view and layout (the shed's panel label in the go step, `lit: false` in the
    fix step, a `justLit` case, the two buttons' rectangles); the tests now pin each, and a Stryker run on the files gave
    100.00.

## 6. Scene and entrance

- [x] 6.1 Add `CrownScene`, the crown art, the row of steps, the stage and the controls widget, and the title's
      entrance; register the scene.
  - Requirements: REQ-9.1, REQ-9.2, REQ-9.3, REQ-9.9, REQ-9.10, REQ-9.12, REQ-9.13, REQ-4.9, REQ-4.11
  - Tests: none of its own (scenes and `ui/` are outside coverage and mutation, ADR 0003); the smoke in 7.1
  - Result: `npm run build` passes. The screenshots were judged by eye in both languages: the two panels compare row
    by row, the row of steps reads at a glance (a solid frame, ticks), the shed and the three things are clear, the
    house key looks like trial 4's, and the clear lights all three town lamps. Two first drafts were changed after the
    screenshots: the wish's lit glow reached below its panel (the rows moved up 4 and 6 pixels), and the wisp's glow
    covered the third town lamp (the lamps moved left). The step words touched the ticks and moved right with a smaller
    size. Lint holds the scene and `ui/` to 30 lines a function and complexity 5.

## 7. Smoke

- [x] 7.1 Play trial 6 with real taps and clicks, and read the picture from the pixels.
  - Requirements: REQ-9.1.3, REQ-9.1.6, REQ-9.2, REQ-9.3, REQ-9.4, REQ-9.5, REQ-9.6, REQ-9.7, REQ-9.9, REQ-9.10, REQ-9.12.3, REQ-9.12.5, REQ-9.13, REQ-9.16
  - Tests: `smoke.mobile.crown.spec.ts`, `smoke.desktop.crown.spec.ts`
  - Result: on Chromium with the iPhone 13 touch profile and on desktop Chromium, all 64 smoke tests pass (54 existing
    plus 10 new: 8 mobile, 2 desktop) with one worker, in 11.6 minutes, on the final build. The first runs failed in
    two places, both in the readings, not the game: the light's tell cards were read through the roof cards' lower edge,
    and on the desktop the current step's 4-pixel frame read as missing; the light's cards moved 8 pixels down and the
    frame is 6 pixels wide and read on its edge (`docs/evidence/didnt-work.md`). Not run: WebKit, a real phone, the
    weekly device pass, and the default two-worker run.

## 8. Final integration

- [x] 8.1 Record trial 6 in the changelog, the learning design (the trial 6 row, L1–L5), the checklists, the evidence and
      the steering invariants; run the whole check.
  - Requirements: REQ-9.17, REQ-9.8, REQ-9.14, REQ-9.15, REQ-4.9, REQ-4.11, REQ-2.12, REQ-2.15, REQ-3.9, REQ-5.15, REQ-6.14, REQ-7.14, REQ-8.16
  - Tests: `npm run check`
  - Result: `npm run check` passes on Node 26.13.0 (exit 0): format, lint and types pass; knip passes; 60 test files,
    1,357 tests; coverage 100% statements (940 of 940), branches (612 of 612), functions (297 of 297) and lines (804 of
    804); `npm run verify` (licenses, kid strings, font coverage, evidence, trace with 70 invariants and none without a
    property test) passes; Stryker: 2,256 killed, 5 timed out, 0 survived, 0 errors, 100.00, in 25 minutes 17
    seconds; the production build passes and the gzip JS is 376.6 KB of 1,024 KB. ShellCheck was skipped by
    `lint-shell.sh` (neither the binary nor Docker here; CI runs it). The first full run stopped at knip on an unused
    export in `e2e/crown-helpers.ts`, which was removed. After the passing run only this file and the Japanese
    translations changed. Not run here: `npm audit`, Semgrep, gitleaks, zizmor, zghalint and the `perf` job (they need
    the network, Docker or the base branch), and the CI smoke on WebKit. The work is not called done before CI's smoke
    is green.
