# Design: Trial 3, The Wisp Field

Implements `requirements.md` (REQ-6.n), revision 3. Follows ADR 0001 (pure reducer), ADR 0003 (gates) and the
layout rules in `.kiro/steering/structure.md`. No new dependency, no new asset, no new ADR: the reducer stays
pure and the scenes stay thin, which is what ADR 0001 and 0003 already say. The module layout copies trial 2's
(`05-trial-grant-tools`), so a reviewer who knows the shed knows the field.

Revision 2 replaces the design of the first build (a tap showed what a star was; five identical stars; no end).
What the preview showed is in the table at the top of `requirements.md`. The old design is in the history of
this file (commit `9a69287`).

## Revision 3: a time attack with a score, and a way back

The comments on revision 2 (see `requirements.md`) are answered by copying what `05-trial-grant-tools` revision 2 did
for the shed, so a reviewer who knows the shed knows the field:

- **The run is trial 1's.** `reducer.ts` gives `StartField` a fresh `restartRun` (a full clock, a score of 0, the best
  kept), `Tick` acts in trial 3 too, and a verdict goes through `scoreSearch` like the shed's `give`. No new
  state in `Run`, no new phase: time up sets `phase` `over` and leaves `trial` 3, so the end screen (`OverScene`)
  is shared. `LeaveField` is a top-level event beside `LeaveShed`, valid whenever `trial` is 3.
- **The "cleared" stage is gone**, with `roundsPerRun`, `isLastRound`, the clear word and the clear panel. A keep
  always gives `kept`; "Next stars" starts the next round for as long as the clock lasts. Only the clock ends the trial.
  `verdictRight(field, verdict)` is the one place where a verdict is graded for the score (`true`, `false`, or
  `null` when there is nothing to decide); `sort` uses the same `says` helper.
- **Where each thing is drawn.** The top row is the shed's (`createHud`, `paintHud`, `hudView`). The "Title" button is
  the shed's (`createLeaveButton`, `leaveButton`, 80 x 80 at (347, 788), beside nothing: the wisp is at (195, 720)).
  The closing line takes the place of the lens after a keep, with a gold edge on the panel (it used to hold the clear
  word and the line). A right verdict pops "+150" from its star. The end screen's second button comes from
  `overView`, which now names the action per trial (`playField`, `leaveField`).
- **The title.** Both buttons say "How many in 60 seconds?" (`field.timeAttack`, new; `noClock` removed). Taps are
  ignored for 0.7 s after a trial sends the child back (the scene data is `fromTrial`, as the shed's change made it).
- **Tests.** `field.model.test.ts` now carries the clock (60 000, 30 000, 0), the score as "none or some", and an
  independent score check in the wrapper; it has 9,904 states (the language and the hero are left out of a state's
  identity) and 12 deliberate breaks. `field.pbt.test.ts` has INV-15 to INV-17 for the field, INV-38, INV-44 and
  INV-45 and no INV-37. The smoke plays each test well under half of the real clock.

Everything below that talks about "the cleared trial", "a run of two rounds", "no clock" or "no score" describes
revision 2 and is kept for the record; where a statement is false now, the section on revision 3 above and
`requirements.md` win.

## What the child does

```text
title --tap the field button (the game draws a seed)--> sorting, round 0, nothing sorted
sorting --InspectStar i (i unsorted)--> sorting, star i in the lens (two verdict buttons appear)
sorting --SortStar v, v is true of the star--> sorting, the star is sorted, the lens closes (message: yes)
sorting --SortStar v, v is false of the star--> sorting, nothing sorted, the lens closes (message: look again)
sorting --SortStar with no star in the lens--> same state
sorting --KeepStars, some star unsorted--> same state
sorting --KeepStars, all five sorted--> kept
kept    --RetryField--> sorting, the next round
any     --Tick, the clock reaches zero--> over (the end screen; the field is kept as it was)
over    --StartField--> sorting, round 0, a new run (a full clock, a score of 0, the best kept)
any     --LeaveField (a run or the end screen)--> title
```

Revision 3: each `SortStar` that has a star in the lens also scores (a right verdict adds 100 + 50 per right verdict in a
row, up to 4; a wrong one ends the streak). The diagram of revision 2 had a `cleared` stage after the second round;
it is gone.

(Revision 2 had a `cleared` stage here: the success of the trial after two rounds. Revision 3 has none.) The keep button is on screen only when all five are sorted; the
reducer still refuses `KeepStars` earlier, so the rule does not rest on the button. A tap on the title anywhere
else still starts trial 1.

## Domain (`src/domain/`)

### State

`GameState` gains one field and no new `phase`:

```ts
// field.ts
export const starCount = 5;
export const roundCount = 4;     // rounds before the sets start again (even, so neighbours differ in size)
export type Verdict = "real" | "fake";
export type Note = { star: number; said: Verdict };
export type Field =
  | { stage: "sorting"; seed: number; round: number; sorted: readonly boolean[]; looking: number | null; note: Note | null }
  | { stage: "kept"; seed: number; round: number };
export const initialField: Field = { stage: "sorting", seed: 0, round: 0, sorted: [false x5], looking: null, note: null };

// state.ts
export const trials = { lane: 1, shed: 2, field: 3 } as const;
export type GameState = { /* as before */ field: Field };
```

Why this shape:

- **The truth is not stored.** Which stars are fake is a function of `seed` and `round` (`fakesOf`). The state
  holds only what the child has done: which stars they sorted (`sorted`), which one is in the lens
  (`looking`), and the last verdict (`note`). So a mark can never disagree with the round, and "the kept stars are
  the real ones" is derived, not copied (REQ-6.8.5). `markOf` is `unsorted` until the star is sorted, then
  `real` or `fake`. Whether the note was right is derived too (`noteWasRight`).
- **`sorted` means "rightly sorted".** A wrong verdict leaves it false. There is no "wrongly sorted" state to
  take back or to hide, which is what makes a wrong verdict free (INV-35).
- **`looking` is why a verdict needs a look.** `SortStar` carries only the verdict; the star is the one in the
  lens. With no star in the lens it does nothing (INV-33). This is how "decide only after looking" is a rule of
  the reducer and not of the screen.
- **`note` is for the message.** The view is a function of the state only, so the state remembers the last
  verdict. `InspectStar` clears it; `SortStar` sets it. A wrong verdict also closes the lens, so the child has
  to tap the star again: looking again is a step they take.
- **`kept` has no more fields.** It is reached with all five sorted, so every mark is known
  and equals the truth; storing the marks again would be a second copy.
- **`phase` stays `title | trial | over`.** The field is `phase` `trial` with `trial` 3; the scene follows
  `trial`. **`field` is always present** and is `initialField` everywhere except while `trial` is 3 (INV-31).
- **`round` is bounded.** It is always 0 to 3, so the state space is finite for the model check and
  `RetryField` wraps from 3 to 0.

### The fake stars: a seed, not a table

`fakesOf(seed, round)` gives the fake stars of a round, ascending: one in the even rounds and two in the odd ones. It is a small linear congruential step on integers (`Math.imul`, no `Math.random`, no clock), seeded by
`seed` and `round`, picking distinct stars from the five. The same seed always gives the same four rounds.

- **Why a seed.** The first build had a fixed table of four rounds. A child who plays twice would learn that
  "the fourth star is the fake one" and stop looking, which is the opposite of the lesson. With a seed the
  fakes differ from visit to visit, and the unit tests still pin exact sets for seeds 0 to 3.
- **Where the seed comes from.** The title scene draws it with `newSeed()` (`src/game/seed.ts`, `Math.random`
  injected for the test) and sends `StartField { seed }`. The domain stores it, whole (`seed >>> 0`), and
  never draws a number (hard rule 3, ADR 0001). The smoke reads the seed from the state and computes the
  expected fakes with the same pure function; the unit tests are what pin `fakesOf` itself.
- **Neighbouring rounds differ.** Sizes alternate 1, 2, 1, 2, so two rounds in a row, and the wrap from the last
  to the first, never have the same set. No retry loop is needed.
- **Spread.** Over 2,000 seeds each star is fake about equally often, in every round (checked while writing it;
  the unit test checks that no star is always real).

Functions (`field.ts`): `fakesOf`, `isFake`, `shineOf`, `markOf`, `noteWasRight`, `isReady`, `keptStars`,
`verdictRight`, `reduceField` (returns `field` itself when nothing changes).

`reduceField`:

- `InspectStar { index }`: while sorting, when `index` is an integer from 0 to 4, the star is unsorted and not
  already in the lens: `looking` becomes `index` and `note` becomes `null`. Otherwise no change.
- `SortStar { verdict }`: while sorting, with a star in the lens. If the verdict is true of the star, that star
  becomes sorted. Either way `looking` becomes `null` and `note` becomes `{ star, said: verdict }`.
- `KeepStars`: when all five are sorted: `kept`.
- `RetryField`: from `kept`, a fresh `sorting` of the next round (`(round + 1) % 4`), same seed.

There is no branch that sorts two stars, sorts a star on a wrong verdict, keeps a star that is not sorted, or
keeps a fake.

### Events (`events.ts`) and the reducer

```ts
export type FieldEvent =
  | { type: "InspectStar"; index: number }
  | { type: "SortStar"; verdict: Verdict }
  | { type: "KeepStars" }
  | { type: "RetryField" };
export type GameEvent = /* as before */ | { type: "StartField"; seed: number } | { type: "LeaveField" } | FieldEvent;
```

Where each event applies ("same" means the same state object is returned):

| event | `title` | trial 1 | trial 2 (shed) | trial 3 (field) | `over` |
|---|---|---|---|---|---|
| `Start` | begins a run (trial 1) | language only | language only | language only | begins a run (trial 1; the field is dropped) |
| `StartField { seed }` | begins a run of the field (`trial` 3, a fresh field, a full clock) | same | same | same | begins a new run if the end screen is the field's, otherwise same |
| `StartShed` | opens the shed | same | same | same | the shed's own end screen only |
| `Tick` | same | the clock | the clock | the clock | same |
| `Ask`, `PickCard`, `Retry` | same | the lane rule | same | same | same |
| `PickTool`, `GiveTool`, `RetryShed` | same | same | `reduceShed` | same | same |
| `InspectStar`, `KeepStars`, `RetryField` | same | same | same | `reduceField` | same |
| `SortStar` | same | same | same | `reduceField`, and scores | same |
| `LeaveField` | same | same | same | the title | the title if the end screen is the field's, otherwise same |
| `SetLang`, `MoveHeroTo` | as before | as before | as before | as before | as before |

`reducer.ts` has `StartField` (the title or the field's own end screen, like `startShed`), `LeaveField` (any state with
`trial` 3, like `leaveShed`), and one function `reduceFieldTrial` for the four field events, guarded by
`inTrial(state, trials.field)`; `SortStar` goes to `sortStar`, which grades the verdict with `verdictRight` and scores it. `reduceTrial` hit the complexity limit with the
field cases inline, so they moved there (no behavior change). Every earlier guard already tests its own trial
number, so trials 1 and 2 need no code change to ignore trial 3.

`LeaveField` and `StartField` change more than `field`: they set `phase`, `trial`, `field` and restart `run` (only
the best is kept). That is why INV-31 leaves them out and INV-38 and INV-45 have their own rules.

### Why the clue is visible and a verdict is judged at one tap (REQ-6.6.4)

The trial is a staged scene for one idea (L3): what a helper brings can be wrong, so look closely and decide for
yourself before you accept it. To let a 6-year-old feel that, the field shows a clue anyone can see if they look,
and judges the child's verdict at once. This is a rule of the game, not a claim about real AI:

- Real checking is harder. It can take effort, it can be impossible, and a check can itself be wrong. The game
  does not say otherwise: its words say only what happened to these five stars.
- A fake star is not a lie. The wisp did not mean to bring it; it mixed it up. The game shows this by the
  message and by the wisp's face, which does not change. The helper is never an enemy (REQ-6.4).
- Why the clue is shown before any tap: revision 1 hid it until a tap, and the preview showed that the
  tap was then the whole game. The point is that the child looks and decides. The "shines brighter" of
  `docs/learning-design.md` is now the main clue, as that table says.
- Why the child's verdict, not the tap, decides: the game must not do the deciding for them. A wrong
  verdict sorts nothing and corrects nothing, so the child finds out by their own choice, and looks again.
- Why a wrong verdict is allowed to repeat: a fear of being wrong is the opposite of the lesson. The message
  says what happened (a fake got mixed in; that one was real) and asks for another look. Nothing is counted.
- A guess is possible: with two buttons, a child can press both. Each wrong press shows the same kind
  message and closes the lens, so the cheap path costs a tap on the star each time, and the sorted star shows
  its word and tick, so it is the child's own choice that stands. The point is the look, not a score.

### Invariants

The new ones are in `requirements.md`. Their scope with respect to the existing ones:

| id | covers | with the field |
|---|---|---|
| INV-1, INV-2 | `phase`, `trial` | global; `trial` may be 3. Unchanged, re-run with the field events |
| INV-3, INV-4 | no mutation, determinism | global. Unchanged, **re-run over sequences that contain the field events** (`field.pbt.test.ts`); the seed is in the events, so the same events give the same states |
| INV-5, INV-8 to INV-17 | trial 1's lane and run | hold on every sequence, including the field events, because INV-32 keeps `lane` and `run` untouched. Unchanged |
| INV-18 to INV-24 | trial 2's shed | hold on every sequence; INV-31 and INV-32 keep the field and the shed apart. Unchanged |
| INV-26 to INV-30 | the round, the keep, the result, the retry | kept numbers; wording changed (see `requirements.md`) |
| INV-33 to INV-35, INV-39 | looking and verdicts | new |
| INV-36 | the clue | new |
| INV-37, INV-38 | the clear and the leave | new |
| INV-31, INV-32 | the field and the other trials cannot touch each other | kept numbers |
| 25 | (retired) | the event it described is gone |

### Model check (`field.model.test.ts`)

Scope: the entrance from the title by the field button with two seeds, every state after it (the run, the rounds, the
end screen), and the leave back to the title. It is not "every state of trial 1 or 2 can reach the field" (the
child gets to the field only from the title), and it does not remove any state of the field to pass. The model
checks of trials 1 and 2 are not changed.

The alphabet is finite and includes events that must not matter: `StartField` for seeds 0 and 1, `SetLang` (ja, en),
`MoveHeroTo` (two positions), `InspectStar` for each star and for two indexes that do not exist, both verdicts (at
any time, with or without a star in the lens), `KeepStars`, `RetryField`, `LeaveField`, a half-run `Tick` (30,000 ms) and
a run-ending one, one trial 1 card, `Ask`, `Retry`, and the shed's events (`LeaveShed` included). Inside a run also
`Start`, `Start` with a language, and `StartShed`.

The model wraps the real reducer's state with an independent record written from the spec and not from the reducer
(`record`: the stage, seed, round, the sorted set, the star in the lens and the last verdict; `null` on the title),
`left` (the milliseconds on the clock: 60,000, 30,000 or 0), and `scoreOk`, which turns false at the first step that
moved the score or the streak other than the spec says (a right verdict adds `pointsFor(streak)` and extends the
streak, a wrong one sets the streak to 0, only a new run or the leave resets the score). The test has its own copy of
the fake stars of seeds 0 and 1, so changing `fakesOf` fails the test. A state's identity leaves out the language and
the hero, keeps the clock exactly, and keeps the score and the best only as "none" or "some".

| check | what |
|---|---|
| invariants | the title and the record agree; the clock agrees with the record and the run is over exactly when it is zero; `field` is initial outside trial 3; the lane and the shed stay initial; the field equals the record in full; no star is sorted that the record has not sorted; a round is finished only when the record says so; the stars kept are the table's real stars; the score moves only as the spec says |
| goal 1 | from every state a kept round is reachable (no soft-lock) |
| goal 2 | from every state the title is reachable |
| goal 3 | from every state the end screen is reachable |
| goal 4 | from every state a fresh round (nothing sorted, nothing in the lens) is reachable |
| goal 5 | from every state a score is reachable |
| goal 6 | from every state a second kept round (round 1 or later) is reachable, which includes the end screen, the leave and in again |
| goal 7 | without `Tick` and the two leaves, a kept round and a second kept round are still reachable: the field's own buttons give a way on |
| witnesses | the shortest trace to a wrong verdict (3 events), to a score (the entrance, a look, a right verdict), to a kept round (the entrance, ten look and verdict events, the keep), to the end screen (the entrance and a run-ending tick), and the way back from a run and from the end screen (one event each) |
| number of states | 9,904, recorded in the test |

It must fail when the rules are broken on purpose, and the counterexamples are kept in the test (each break is a wrapper
`step` around the real `reduce`; no source is edited):

| deliberate break | which check fails |
|---|---|
| a wrong verdict sorts the star anyway (the game corrects the child) | the field differs from the record, after 3 events |
| a verdict works with no star in the lens | the field differs from the record: `StartField`, `SortStar` |
| a wrong verdict leaves the star in the lens | the field differs from the record |
| `KeepStars` works with a star unsorted | the finished-too-early invariant: `StartField`, `KeepStars` |
| a wrong verdict scores | the score invariant, after 3 events |
| a wrong verdict keeps the streak | the score invariant, after 5 events |
| a right verdict scores nothing | the score invariant at the first right verdict |
| `KeepStars` is ignored | goal 1 is stuck in every state, from the start |
| `RetryField` is ignored | goal 6 is stuck (the second round is unreachable); a fresh round stays reachable by the leave |
| `LeaveField` is ignored | goal 2 is stuck once the field is entered |
| `Tick` is ignored in the field | goal 3 is stuck from the start (there is no time attack) |
| the end screen takes nothing | goal 2 is stuck once the time is up |

A broken game drifts away from the record, and the two together have far more states than the real game. The
broken checks therefore use one seed, a small alphabet, and (for an invariant check, and for the goals that drift)
one state for all states that already break an invariant. The real checks use the whole identity above.

## Content (`src/content/`)

A `field` group is added to `strings.ja.json` and `strings.en.json` under the same keys. (Revision 2 also added the
top-level key `noClock`; revision 3 removes it and adds `field.timeAttack`.) `{0}` is a number (a digit, so the kid gate accepts it). `⏎` is a line break.

| key | ja | en | used |
|---|---|---|---|
| `field.timeAttack` | 60びょうで いくつ？ | How many in 60 seconds? | caption on the field button (the shed's is `shed.timeAttack`) |
| `field.enter` | ほしを たしかめよう | Check the stars | the title's field button |
| `field.guide` | よく みて ほんものか⏎にせものか わけよう | Look closely: real or fake?⏎Keep only the real ones | the top, always |
| `field.start` | ウィスプの ほし 5こ⏎タップして みてみよう | The wisp brought 5 stars⏎Tap one to look closer | nothing sorted yet |
| `field.look` | ひかりと ふちを みてね⏎ほんもの？ にせもの？ | Check the glow and the edge⏎Real or fake? | a star is in the lens |
| `field.sortedReal` | そのとおり！⏎これは ほんもの | Yes! This star is real | right verdict, real star |
| `field.sortedFake` | そのとおり！ にせもの⏎ウィスプも まちがえるよ | Yes, that one is a fake!⏎The wisp mixed it up | right verdict, fake star |
| `field.missFake` | にせものが まざってた⏎もういちど みてみよう | A fake got mixed in!⏎Let's look again | said real of a fake star |
| `field.missReal` | ほんものだったよ⏎もういちど みてみよう | That one was real!⏎Let's look again | said fake of a real star |
| `field.kept` | ほんものの ほしを⏎{0}こ うけとったよ | You kept {0} real stars | a round is kept (3 or 4) |
| `field.lesson` | よく みて えらんだから⏎ほんものを うけとれたね | You looked closely and⏎kept only the real ones | closing line, after every keep |
| `field.keep` | ほんものを うけとる | Keep the real stars | the keep button |
| `field.next` | つぎの ほしを みる | Next stars | after the first round |
| `field.marks.real` | ほんもの | real | the word under a sorted real star; the verdict button |
| `field.marks.fake` | にせもの | fake | the word under a sorted fake star; the verdict button |

Why these words:

- **`look` points at the clue** ("the glow and the edge": `ひかり`, `ふち`) and asks the question the buttons
  answer. `ふち` is a word to check in the next playtest.
- **A right verdict confirms in plain words** (`そのとおり！`). The fake one keeps the wisp's honest mix-up
  (`ウィスプも まちがえるよ`): the wisp can be wrong, with no intent and no blame.
- **A wrong verdict says what happened and asks for another look.** `にせものが まざってた` / "A fake got mixed
  in!" and `ほんものだったよ` / "That one was real!" name the fact; `もういちど みてみよう` invites. They avoid
  `ちがう`, `ちがった`, `まちがえた` and every word of blame: a content test checks it.
- **Fake, not "wisp".** The table's word is "wisps"; the child-facing word is "fake" (`にせもの`), because the
  helper is also called the wisp (Decisions).
- **`kept` names a number.** "You kept 3 real stars" tells the child what was accepted.
- **The closing line** looks back at what the child did, in the order they did it (looked closely, then kept),
  and shares no sentence with the kept message or the guide.
- **The buttons say what happens.** `Keep the real stars` names the act and the object. `Next stars` does not say
  "again" because the stars are different. `Play again` and `Title` are on the end screen (`run.again` and the shed's `shed.leave`, shared), and `Title` is on the field's screen too (the shed's word, which fits an 80 px button at 16 px).
- **`field.timeAttack`** is a caption, not a rule of the game's: it says what is true of that trial. It has the same words as the shed's, in its own key so that the two can change apart.
- **No claim about real AI.** No string says a helper is always wrong or always right, that it lies, that
  checking always works, or that it is a friend. A content test checks this with word lists of its own.
- **Not run:** the `kid-reader` agent was not run from this session; its rubric was applied by hand (see the
  pull request). `うけとる`, `ふち` and `にせもの` are marked "playtest".

A content test renders every message that takes a number with 3 and 4 and applies the Japanese rules (no kanji,
no Latin letters, 12 characters, 2 lines). `lane`, `shed` and `run` strings are not changed.

## Game (`src/game/`)

### The clue (`field-look.ts`)

The clue is data, so a test can prove it is there without color:

| | real star | fake star |
|---|---|---|
| body, edge, core | gold, dark gold, pale gold | cream white, pale gold, white |
| halo (circles of radius x star radius, with alpha) | 1.9 at 0.07, 1.55 at 0.10 (gold) | 2.3 at 0.16, 1.9 at 0.22, 1.55 at 0.30 (cream) |
| rim at 1.5 radii | one unbroken line | twelve separate dots |

`luma` (brightness by the weights a grayscale screen uses), `haloCover` and `glowLuma` compute from these
numbers the brightness the slot shows at a point. The unit tests prove: the fake body is brighter; at the probe
distances the fake halo is brighter by more than 40 of 255; the halo reaches further; the rims differ in kind;
the dots do not touch. The painting in `ui/field-art.ts` uses only these numbers.

Two cues, one main and one of shape: the glow (the main one, from the learning table) and the rim. Either alone is
a real difference; together they survive a bad screen. The measured values in the smoke (see "How the smoke sees
the picture") show the margin.

### Entrance and scene choice

- `TitleScene` has trial 1's card and the two buttons (below). The field button's handler dispatches
  `StartField { seed: newSeed() }`. The existing "a press that hit no object starts trial 1" guard covers it: the
  button is an object, so a press on it reaches `StartField` only.
- `route.ts`: `sceneFor(state)` returns `"field"` for `trial` 3. `SceneKey` gains `"field"`. The field scene
  starts `sceneFor(state)` when the state leaves the field (after `LeaveField`, or at time up), passing `fromTrial: true`.
- `boot.ts` registers `FieldScene`.

Scene transitions:

| from | event | to |
|---|---|---|
| title | `Start` (tap outside the buttons) | lane (as before) |
| title | `StartShed` | shed (as before) |
| title | `StartField` (tap the field button) | field |
| field | `InspectStar`, `SortStar`, `KeepStars`, `RetryField` | field (the same scene re-renders) |
| field (a run) | `Tick` reaches zero | over (the end screen) |
| over (field) | `StartField` (play again) | field |
| field, over (field) | `LeaveField` (the "Title" button) | title (taps are ignored there for 0.7 s) |

### The title (`title-layout.ts`, `title-view.ts`, `TitleScene.ts`)

The preview showed that "How many can you find in 60 seconds?" floated above the art and the buttons, and read as the
title's rule. Now:

- **Trial 1's card** (a framed panel at (195, 372), 340 x 144) holds the way in ("Tap to start") and the rule (the
  60 seconds). A tap on the card still starts trial 1: it is not an object.
- **The two buttons** each have a label and a caption under it. Revision 3: both trials are 60-second runs, so both
  captions say so (`How many in 60 seconds?` / `60びょうで いくつ？`); revision 2 said `No timer` under both. Their label is 22 px so that it clears the picture.
- A test proves the layout: the card holds both texts and touches neither button; the art lies between; no button's label has a number in it.
- **The lock.** After `LeaveField` (or the shed's `LeaveShed`) the scene restarts with `fromTrial: true`, and the tap-anywhere start is ignored
  for 0.7 s of game time (`Game.getTime()`; `Clock.now` is not set yet in `create`, which the smoke showed). A
  child who double-taps "Title" would otherwise start trial 1 with the second tap.
- **The touch guard.** The title adds its `touchmove` guard (no scrolling or zooming of the page) once per scene
  object and never removes it: it is the guard for every scene, so it must not go when the title shuts down,
  and adding it on every visit would stack copies.

### Buttons (`button-lock.ts`, `ui/field-buttons.ts`)

The wide button (keep, "next stars") covers the place of the two narrow ones (the verdicts), so a child's quick
double tap lands on the button that replaces the first. Without a guard it would skip the screen between them (the
sorted star, the kept result). Revision 3 has no "play again / title" pair here any more (they are on the end screen). A set of buttons therefore ignores
presses for 450 ms after it appears (`pressable`, game time); the set is identified by the ids it holds
(`setChanged`), so a repaint of the same buttons (a language change) does not restart the lock. The smoke does a
real quick double tap on the keep button and requires the kept result to stay. Taps that fall in the lock are
simply lost, as the smoke's retrying `pressUntil` already allows.

### Layout (`field-layout.ts`; the guide comes from `shed-layout.ts`)

All numbers are game pixels on the 390 x 844 canvas.

| thing | center | size |
|---|---|---|
| guide text | (195, 56) | wrap 340, 2 lines (`shed-layout`) |
| stars 0, 1, 2 | (75, 160), (195, 160), (315, 160) | 88 x 88 |
| stars 3, 4 | (135, 256), (255, 256) | 88 x 88 |
| message | (195, 336) | wrap 340, height 60 |
| lens (and the closing line after a keep) | (195, 428) | 340 x 124 |
| one wide button (keep, next) | (195, 534) | 300 x 80 |
| two buttons (verdicts, play again / title) | (118, 534) and (272, 534) | 146 x 80 each, 8 apart |
| the wisp (not a target) | (195, 720) | art 60 |
| top row: seconds, bar, score | the lane's (`hudTime`, `hudBar`, `hudScore`) | y 8 to 40 |
| "Title" button (revision 3) | (347, 788), the shed's `leaveButton` | 80 x 80 |
| title's field button | (195, 648) | 300 x 80 |

The hero starts at (195, 612); the buttons end at y 574, above its top (580). The star rows are 8 apart. The lens
and the closing line are one place: the lens star (radius 34) while looking, the panel's word and closing line when
the closing line (with a gold edge) after a keep, a faint ring when empty, so the layout does not jump between stages.

Inside a star's slot (offsets from its center): the star at (0, -12) with radius 20, the rim at 1.5 radii, the
word at (0, +31) in 18 px, and the badge disc at (+36, -36), the shape `drawPickedMark` already draws.

**Probes.** `probesFor(middle, radius)` names four points the smoke reads: the middle; a point at 1.3 radii in the
valley 18 degrees below the right (inside the rim, clear of the star's points: bright for a fake star, dim for a
real one); a point on the rim at 0 degrees (on a dot); a point half a dot-step round (in a gap). `starProbes(i)`
adds the badge's upper half (gold only for a sorted real star), and `lensProbes` reads the lens star the same way.
The layout tests prove the points are where they say and clear of the star's points and the neighbouring dots.

### View (`field-view.ts`)

`fieldView(state)` returns plain data; the scene draws it:

```ts
type StarView = { index; shine: "normal" | "bright"; mark: "unsorted" | "real" | "fake"; label: string;
                  ticked: boolean; looking: boolean; alpha: number };   // alpha .5 for a sorted fake star
type FieldView = {
  guide: string; message: string; stars: StarView[];
  lens: { shine } | null;                       // the star in the lens
  lesson: string | null;                        // the closing line, once a round is kept
  leave: string;                                // the word on the "Title" button
  buttons: { id; text; event; slot: "single" | "left" | "right"; icon: "tick" | "dots" | "none" }[];
  verdict: { star: number; right: boolean } | null;  // for the flourish
  finished: boolean;
};
```

The message is `kept` (with the number) after the keep, `look` while a star is in the lens, `start` before any
verdict, and after a verdict `sortedReal`, `sortedFake`, `missFake` or `missReal`. When the fifth star is sorted
the message is still about that star, so a fake star sorted last keeps the wisp's "mixed it up"; the keep button
says what to do next (an earlier draft had a `ready` message that replaced it, and the review found that the
honest-mistake line was then lost whenever the fake star was sorted last).
Buttons: the two verdicts while a star is in the lens; the keep when all are sorted; `next` after the first
round; none otherwise (the "Title" button and the end screen's buttons are not in this view). Helpers `justSorted` and `justFinished` compare the view
before and after for the scene's flourish; they compare by value, so a change of language does not replay it.

### Scene (`scenes/FieldScene.ts`) and art (`ui/`)

Thin, like `ShedScene`: create the objects from the layout, subscribe to the game, render `fieldView`,
dispatch `InspectStar` for a star's tap and the button's event for a button, and play a short flourish. It
dispatches no `Tick`, so nothing in the field counts time. The fields are reset in `create`, because Phaser
reuses the scene object. The hero floor drag is the shed's: a press that hit no object walks the hero.

Painting is code only: `ui/field-art.ts` (the slot, and `drawClueStar`: halo, body, rim), `ui/star-card.ts` (the
slot widget: star, word, tick, and the white frame of the star in the lens), `ui/field-lens.ts` (the lens and the
closing line), `ui/field-buttons.ts` (one widget per slot, hidden when not used; a tick or a ring of dots on the
verdict buttons). The stars pop in once and then stay still: the first build's bob moved the rim under the
smoke's probes and carried no meaning. The lens halo is shrunk to fit its panel (`haloLimit`), so it never
covers the message. The flourish: a right verdict ripples at the star and, for a real star, sparks (for a fake
star the wisp tilts once, as it mixed it up); a wrong verdict makes the star wobble once; the keep sends sparks
from every kept star. No red, no shake of the screen, no sound.

## Reuse and alternatives

| need | reused | alternative and why not |
|---|---|---|
| state and events | `reduce`, `GameState`, `GameEvent`, `createGame`, `window.__game` | a second store: not needed |
| the field's rules | the `reduceShed` pattern: a small reducer that returns its input when nothing changes | putting the stars into `Shed` or `Lane`: forces a tool or a card to be a star and breaks INV-8 to INV-24 |
| events | new `InspectStar`, `SortStar`, `KeepStars`, `RetryField`, `LeaveField`, `StartField` | reusing `PickTool`, `GiveTool`, `RetryShed`: a shared name lets a trial 2 handler act on a trial 3 state |
| trial choice | `trial` number | a new `phase`: widens INV-1 and every `phase` switch |
| layout | `canvas`, `Rect`, `guideText`, `heroStart` | a copy of those numbers: two sources for one layout |
| cards and marks | `drawLitSlot`, `drawSlot`, `drawPickedMark`, `drawButton`, `drawPanel` | new frames and badges: more art for no new meaning |
| background, camera, text, wisp, hero, sparks | `drawBackground`, `fitCamera`, `textStyle`, `createWispArt`, `createHero`, `burst`, `ripple` | none needed |
| property and model tests | `checkProperty`, `checkModel` | none |
| smoke | `tapper`, `clicker`, `pressUntil`, `pixels.ts`, `colorsAt`, `collectErrors`, `expectBundledFont` | none |

## Test plan and traceability

| layer | what | requirement |
|---|---|---|
| unit (`field.test.ts`) | `reduceField` for each event in each stage; `fakesOf` pinned for seeds 0 to 3 and its spread; `shineOf`, `markOf`, `noteWasRight`, `keptStars`; a wrong verdict repeated; an index out of range; an early keep; the lock after the keep; the retry; the wrap | REQ-6.3 to 6.7 |
| unit (`reducer.test.ts`) | `StartField` from the title only, with a seed; the field events outside the field; the other trials' events and `Tick` in the field; `Start` and `SetLang` in the field; the leave; `lane`, `run` and `shed` untouched | REQ-6.1, 6.7, 6.8 |
| property (`field.pbt.test.ts`) | INV-3 and INV-4 with field events; INV-26 to INV-39; coverage: a look, right and wrong verdicts, a bad index, an early keep, a keep, a clear, a leave, the next round, the wrap | REQ-6.8, 6.12 |
| model (`field.model.test.ts`) | the state space and goals above; deliberate breaks | REQ-6.5, 6.7, 6.12 |
| content (`field-content.test.ts`) | same keys; one `{0}` where it belongs; Japanese rules; English lengths; no blame words; no claims about real AI; the closing line is its own text; the title caption | REQ-6.1.6, 6.4, 6.6, 6.11 |
| look (`field-look.test.ts`) | the clue: brightness, halo reach, rim kind, in a grayscale measure | REQ-6.2, 6.10.4 |
| view (`field-view.test.ts`, `title-view.test.ts`) | per stage and language: message, buttons, stars, labels, ticks, alpha, lens, the closing line only after a keep, the message follows the last verdict; the title's words | REQ-6.2 to 6.7, 6.1.6 |
| layout (`field-layout.test.ts`, `route.test.ts`, `seed.test.ts`) | inside the canvas, no overlap in each stage, targets of 80 or more, the hero strip free, the probes where they say, the title's card and buttons apart; the scene follows `trial`; the seed | REQ-6.1, 6.8, 6.9 |
| mutation | any surviving mutant fails | REQ-6.12, 6.14 |
| mobile smoke (`smoke.mobile.field.spec.ts`) | real taps; the paths in REQ-6.13; pixels for the clue, the lens, the ticks, the buttons, the clock, the score and the closing line; grayscale and silence; ja and en screenshots; the title; offline | REQ-6.1 to 6.13 |
| desktop smoke (`smoke.desktop.field.spec.ts`) | the same with the mouse; a held press on a star leaves the hero still | REQ-6.9, 6.13 |

`tasks.md` carries the requirement, test and result for each task.

### How the smoke sees the picture

The field is drawn on the canvas, so the DOM has no copy of it and a state that says "fake" would pass even if the
star never shone brighter. The smoke reads four named points per star (and per lens) from a screenshot (the
probes above) and turns each into brightness with the weights of a grayscale screen. A star's clue **reads as
bright** when its halo point is brighter than 130 (slot) or 93 (lens, whose halo is shrunk) **and** its rim has
gaps (the dot point is brighter than the gap point by more than 55); as **normal** when neither holds; any other
mix fails. The measured values (Chromium, iPhone 13 profile, 3x): a real star in its slot reads halo 93 and rim
break about 0 (between -22 and 14); a fake star halo 167 and rim break 99; in the lens 71 and 0, and 115 and 178.
The grayscale test adds `canvas { filter: grayscale(1) }` and gets the same numbers within 1. Ticks are the badge
point (gold only for a sorted real star); the buttons are their gold faces (the wide button covers the gap between
the narrow ones, so a gold gap means the wide button); the closing line's panel has a gold edge (read along its top). Text is counted as light
pixels in the message and closing-line boxes, as trial 1 and 2's smoke do. The pixel reading uses `node:zlib` only.
"Silent" is checked by wrapping `AudioContext.createOscillator`, `createBufferSource` and `HTMLMediaElement.play`
before the page loads and requiring that none is called during a whole sort.

## Decisions and alternatives

- **The child decides; the tap only looks.** Alternatives: a tap that reveals the truth (revision 1, rejected by
  the preview: nothing was decided); drag a star to a "real" or a "fake" basket (two targets of 80 or more and a
  drag, against the one-finger tap rule); an immediate verdict by long press (a hold, which REQ-6.9.2 forbids).
  Two buttons after a look is one tap each, reads without words (a tick and a ring of dots) and keeps the
  look as its own step.
- **A wrong verdict sorts nothing, closes the lens and leaves a note.** Alternatives: a wrong verdict sorts the star
  wrongly and the keep then fails (the child learns it after five stars, and has to undo; it also puts a fake
  into the state); a wrong verdict locks that button for the star (the second try would be forced, so the game
  would decide for the child); a counter of wrong tries (a score, which this trial must not have). Closing the
  lens makes the child take another look, which is the lesson.
- **The clue is visible from the start, mainly as a brighter glow.** Revision 1 hid it until a tap. The learning
  design says fakes shine brighter; the rim of dots is a second cue of shape so that grayscale and low-contrast
  screens work. Alternatives: color (rejected by hard rule 7); a flicker (motion must not carry meaning, and
  the smoke could not read it); a label on fake stars (it would remove the looking).
- **A seed, not a table.** See "The fake stars". Alternative kept in mind: a fixed table is simpler and was the
  first build; it lets a child memorize positions. The cost of the seed is one event field and pinned unit tests.
- **Revision 3: a 60-second score attack around the same look-and-decide step.** The comment asked for "more game,
  as far as the learning point still comes across". What must not change: the verdict is given only to a star that
  was looked at (INV-33), the game never corrects the child (INV-35), the clue is always visible (INV-36), and a
  wrong verdict costs no time. What is added: the clock, the score, a streak, and rounds without end. Why the
  score does not teach "tap fast": a right verdict is worth 100 to 300 depending on the streak, and a wrong one
  ends the streak, so a child who guesses (right half the time) scores about a third as much as one who looks
  (the worked case: five right in a row is 1,000; five alternating right and wrong is 500) and loses the
  streak bonus; a child who taps without looking pays for it in the score and not in the clock. The alternatives
  considered: a time penalty for a wrong verdict (a fear of being wrong, the opposite of the lesson, REQ-6.3.5);
  a bonus for a perfect round (more state and more strings, and the streak already pays it); fewer taps per round
  (the lens step is the lesson); several fake clues of growing difficulty (new art and new probes for the smoke).
  A round is about 12 taps, so a careful child gets through two to four rounds in a minute. If playtests show
  that is too few, the lever is the number of stars per round, not the verdict step.
- **Revision 3: a quick child scores more, and that is allowed.** The speed is rewarded only through the number of
  right verdicts, and a right verdict needs a look first. A child who looks closely and fast scores the most; the
  design does not claim that checking real AI work is as fast.
- **(Revision 2, replaced) A run of two rounds, then the clear.** The first round has one fake and the second two, so there is a
  small step up. Alternatives: one round (too short to feel a trial; no step), three or more (more taps for a
  6-year-old: a round is 10 taps and a keep). The table has four rounds so that "play again" is new.
- **The keep is a button, after all five are sorted.** Alternatives: keep each star by a second tap (ten taps
  and a per-star accepted state), or keep early (a partial state that teaches nothing new). "Accept only the
  real ones that were checked" holds in both the button (not shown early) and the reducer (INV-27, INV-28).
- **The keep is a button, not a tap on the wisp.** In trial 2 the hand-over is the point (tools are given to the
  wisp). Here the point is that the child decides to accept, and a button that names the act says so.
- **Fakes are "fake stars", not "wisps".** Recorded in Why.
- **One value for the marks and the result.** `sorted` plus `round` and `seed` while sorting, `round` and `seed`
  after.
- **Guard by `trial`, not by a new phase.** INV-1 keeps its three phases.
- **Separate events.** `InspectStar`, `SortStar`, `KeepStars`, `RetryField`, `LeaveField` and `StartField` cost six
  names and remove the chance of cross-trial effects (INV-31, INV-32).
- **The title button is an object, not a new screen.** A selection screen is a router and is out of scope.
- **The title art moves up by 52 pixels** so that two buttons fit under it with 8 pixels between them.
  The shed button does not move, so trial 2's layout and its tests are untouched; only `titleArtBottom` changes
  (660 to 606), and no test pinned the old value. Trial 3's button sits above trial 2's.
- **Trial 1's card and the buttons' caption** (REQ-6.1.6) change three title strings' places and add one key.
  The alternative of a heading ("Other games") over the buttons adds a string that says nothing about the rules;
  the caption states the fact (no timer) where the child looks.
- **Revision 3: the way back is on the screen in every stage** (the shed's button, same place and size), and on the end
  screen. The reasons below against it were weighed in revision 2 and the comment overruled them: a child who
  could not leave said so. There is no confirmation: the score of a run is not saved, only the best of the session
  is kept, and leaving a run costs nothing the child cannot get back in a minute. Revision 2's text follows.
- **(Revision 2, replaced) The way back is on the cleared trial only.** A "back" button during play needs a `Leave` that is valid in
  every stage, a confirmation for a child who taps it by accident, and a decision about progress. The cleared
  trial is the natural end; a reload covers the rest. A child stuck mid-round loses nothing by reloading.
- **The title ignores taps for 0.7 s after the leave.** A double tap would start trial 1. Game time
  (`Game.getTime()`), not the scene clock, because the scene clock is not set when `create` runs.
- **The wisp is not a tap target.** The point of the field is to look at the stars, and a target that does
  nothing would mislead a child. It stays on screen so that "the wisp brought them" is visible.
- **The model's `record` and `clears`** are in the test, not in `GameState`: the game has no use for them.
- **English lines are up to 28 characters.** The message wraps at 340 px at 22 px; the smoke screenshots show it
  fits.

## Risks

- WebKit does not start in the authoring sandbox (missing system libraries; `docs/evidence/didnt-work.md`).
  The mobile smoke runs there on Chromium with the iPhone 13 touch profile, labelled as such; the real
  WebKit run is CI's. A task is not called done until CI's smoke is green.
- Pixel probes depend on the drawing. A change to the star art that moves a probe fails the smoke; the probes
  and the drawing share `field-layout.ts` and `field-look.ts`, so the numbers change in one place. The
  thresholds were measured on Chromium; WebKit anti-aliases dots a little differently, which the margins
  (a rim break of 99 against a threshold of 55, a halo of 167 against 130 and 93 against 93 for the lens) are meant to
  absorb. The lens threshold is the tightest margin (71 against 93, and 115 against 93).
- The art is code and is judged by eye in the screenshots.
- A child may press both buttons without looking, and the lesson then rests on the messages and the closing line.
  The next playtest should note whether children say that the wisp made a mistake, whether they look at the
  glow before they tap, and whether they read "a fake got mixed in" kindly.
- A child may read "the wisp mixed it up" as "the wisp is silly". The words give no reason to; the playtest
  should note it.
- The model check has 19,356 states and takes about 1 second; the broken-game runs take 1 to 2 seconds each.
