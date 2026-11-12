# Design: Trial 3, The Wisp Field

Implements `requirements.md` (REQ-6.n), revision 2. Follows ADR 0001 (pure reducer), ADR 0003 (gates) and the
layout rules in `.kiro/steering/structure.md`. No new dependency, no new asset, no new ADR: the reducer stays
pure and the scenes stay thin, which is what ADR 0001 and 0003 already say. The module layout copies trial 2's
(`05-trial-grant-tools`), so a reviewer who knows the shed knows the field.

Revision 2 replaces the design of the first build (a tap showed what a star was; five identical stars; no end).
What the preview showed is in the table at the top of `requirements.md`. The old design is in the history of
this file (commit `9a69287`).

## What the child does

```text
title --tap the field button (the game draws a seed)--> sorting, round 0, nothing sorted
sorting --InspectStar i (i unsorted)--> sorting, star i in the lens (two verdict buttons appear)
sorting --SortStar v, v is true of the star--> sorting, the star is sorted, the lens closes (message: yes)
sorting --SortStar v, v is false of the star--> sorting, nothing sorted, the lens closes (message: look again)
sorting --SortStar with no star in the lens--> same state
sorting --KeepStars, some star unsorted--> same state
sorting --KeepStars, all five sorted, not the last round--> kept
sorting --KeepStars, all five sorted, the last round of the run--> cleared
kept    --RetryField--> sorting, the next round
cleared --RetryField--> sorting, the next round (a new run)
cleared --LeaveField--> title
```

`cleared` is the success of the trial. A run is two rounds, and the table has four rounds, so "play again"
starts rounds 2 and 3, and then 0 and 1 again. The keep button is on screen only when all five are sorted; the
reducer still refuses `KeepStars` earlier, so the rule does not rest on the button. A tap on the title anywhere
else still starts trial 1.

## Domain (`src/domain/`)

### State

`GameState` gains one field and no new `phase`:

```ts
// field.ts
export const starCount = 5;
export const roundsPerRun = 2;   // keeping the second round clears the trial
export const roundCount = 4;     // rounds before the sets start again (two runs)
export type Verdict = "real" | "fake";
export type Note = { star: number; said: Verdict };
export type Field =
  | { stage: "sorting"; seed: number; round: number; sorted: readonly boolean[]; looking: number | null; note: Note | null }
  | { stage: "kept"; seed: number; round: number }
  | { stage: "cleared"; seed: number; round: number };
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
- **`kept` and `cleared` have no more fields.** They are reached with all five sorted, so every mark is known
  and equals the truth; storing the marks again would be a second copy. They are two members of the union so
  that the types tell them apart.
- **`phase` stays `title | trial | over`.** The field is `phase` `trial` with `trial` 3; the scene follows
  `trial`. **`field` is always present** and is `initialField` everywhere except while `trial` is 3 (INV-31).
- **`round` is bounded.** It is always 0 to 3, so the state space is finite for the model check and
  `RetryField` wraps from 3 to 0.

### The fake stars: a seed, not a table

`fakesOf(seed, round)` gives the fake stars of a round, ascending: one in the first round of a run and two in the
second. It is a small linear congruential step on integers (`Math.imul`, no `Math.random`, no clock), seeded by
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
`isLastRound`, `reduceField` (returns `field` itself when nothing changes).

`reduceField`:

- `InspectStar { index }`: while sorting, when `index` is an integer from 0 to 4, the star is unsorted and not
  already in the lens: `looking` becomes `index` and `note` becomes `null`. Otherwise no change.
- `SortStar { verdict }`: while sorting, with a star in the lens. If the verdict is true of the star, that star
  becomes sorted. Either way `looking` becomes `null` and `note` becomes `{ star, said: verdict }`.
- `KeepStars`: when all five are sorted: `kept`, or `cleared` when the round is the last of its run.
- `RetryField`: from `kept` or `cleared`, a fresh `sorting` of the next round (`(round + 1) % 4`), same seed.

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
| `Start` | begins a run (trial 1) | language only | language only | language only | begins a run |
| `StartField { seed }` | `phase` `trial`, `trial` 3; `field` fresh for the seed; `run`, `lane`, `shed` untouched | same | same | same | same |
| `StartShed` | opens the shed | same | same | same | same |
| `Tick`, `Ask`, `PickCard`, `Retry` | same | the lane rule | same | same | same |
| `PickTool`, `GiveTool`, `RetryShed` | same | same | `reduceShed` | same | same |
| `InspectStar`, `SortStar`, `KeepStars`, `RetryField` | same | same | same | `reduceField` | same |
| `LeaveField` | same | same | same | the title, from `cleared` only; otherwise same | same |
| `SetLang`, `MoveHeroTo` | as before | as before | as before | as before | as before |

`reducer.ts` adds `StartField` (`phase` `title` only, like `startShed`), and one function `reduceFieldTrial` for
the five field events, guarded by `inTrial(state, trials.field)`. `reduceTrial` hit the complexity limit with the
field cases inline, so they moved there (no behavior change). Every earlier guard already tests its own trial
number, so trials 1 and 2 need no code change to ignore trial 3.

`LeaveField` is the one field event that changes more than `field`: it sets `phase` `title`, `trial` 0 and
`field` initial. That is why INV-31 names it as the exception and INV-38 has its own rule.

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

Scope: the entrance from the title by the field button with two seeds, every state after it, and the leave back
to the title. It is not "every state of trial 1 or 2 can reach the field" (the child gets to the field only
from the title), and it does not remove any state of the field to pass. The model checks of trials 1 and 2 are
not changed.

The alphabet is finite and includes events that must not matter: `StartField` for seeds 0 and 1, `SetLang`
(ja, en), `MoveHeroTo` (two positions), `InspectStar` for each star and for two indexes that do not exist, both
verdicts (at any time, with or without a star in the lens), `KeepStars`, `RetryField`, `LeaveField`, `Tick`
(short and run-ending), one trial 1 card, `Ask`, `Retry`, and the shed's events. Inside the field also `Start`,
`Start` with a language, and `StartShed`.

The model wraps the real reducer's state with an independent record of what the child did, written from the
spec and not from the reducer (`record`: the stage, seed, round, the sorted set, the star in the lens and the
last verdict; `null` on the title), and `clears`, the number of cleared trials so far, capped at 2 and counted
from what the game did so that a broken game cannot fake a replay. The test has its own copy of the fake stars of
seeds 0 and 1, so changing `fakesOf` fails the test.

| check | what |
|---|---|
| invariants | the title and the record agree (a field state iff the record exists); `field` is initial outside trial 3; lane, run and shed stay initial; the field equals the record in full; no star is sorted that the record has not sorted; a round is finished only when the record says so; the stars kept are the table's real stars and none is a fake |
| goal 1 | from every state the cleared trial is reachable (no soft-lock) |
| goal 2 | from every state the title is reachable |
| goal 3 | from every state a fresh round (nothing sorted, nothing in the lens) is reachable |
| goal 4 | from every state a second cleared trial is reachable: the replay and the leave and in again |
| witnesses | the shortest trace to a wrong verdict (3 events), to the cleared trial (the entrance, 2 x 10 look and verdict events, 2 keeps and a retry), and to the title after a clear |
| number of states | 19,356, recorded in the test: per seed and round, 241 states in progress (80 with a star in the lens, 160 with the last verdict and none in the lens, 1 untouched) and one finished state, times 4 for the language and the hero, plus the title, times the cleared count |

It must fail when the rules are broken on purpose, and the counterexamples are kept in the test (each break is
a wrapper `step` around the real `reduce`; no source is edited):

| deliberate break | which check fails |
|---|---|
| a wrong verdict sorts the star anyway (the game corrects the child) | the field differs from the record, after 3 events |
| a verdict works with no star in the lens | the field differs from the record: `StartField`, `SortStar` |
| a wrong verdict leaves the star in the lens | the field differs from the record |
| `KeepStars` works with a star unsorted | the finished-too-early invariant: `StartField`, `KeepStars` |
| the last round does not clear the trial | the field differs from the record at the keep |
| `LeaveField` works before the clear | the place invariant: `StartField`, `LeaveField` |
| `KeepStars` is ignored | goal 1 is stuck in every state, from the start |
| `RetryField` is ignored | goal 1 is stuck (the second round is unreachable); goal 3 is stuck once a star is looked at |
| `LeaveField` is ignored | goal 2 is stuck once the field is entered |
| `Tick` runs the clock in the field | the run invariant: `StartField`, `Tick` |

A broken game drifts away from the record, and the two together have far more states than the real game. The
broken checks therefore use one seed, a small alphabet, a state identity without the language and the hero, and
(for an invariant check) one state for all states that already break an invariant. The real checks use the
whole state.

## Content (`src/content/`)

A `field` group is added to `strings.ja.json` and `strings.en.json` under the same keys, and one new top-level
key `noClock`. `{0}` is a number (a digit, so the kid gate accepts it). `⏎` is a line break.

| key | ja | en | used |
|---|---|---|---|
| `noClock` | じかんは ないよ | No timer | caption on the field and shed buttons |
| `field.enter` | ほしを たしかめよう | Check the stars | the title's field button |
| `field.guide` | よく みて ほんものか⏎にせものか わけよう | Look closely: real or fake?⏎Keep only the real ones | the top, always |
| `field.start` | ウィスプの ほし 5こ⏎タップして みてみよう | The wisp brought 5 stars⏎Tap one to look closer | nothing sorted yet |
| `field.look` | ひかりと ふちを みてね⏎ほんもの？ にせもの？ | Check the glow and the edge⏎Real or fake? | a star is in the lens |
| `field.sortedReal` | そのとおり！⏎これは ほんもの | Yes! This star is real | right verdict, real star |
| `field.sortedFake` | そのとおり！ にせもの⏎ウィスプも まちがえるよ | Yes, that one is a fake!⏎The wisp mixed it up | right verdict, fake star |
| `field.missFake` | にせものが まざってた⏎もういちど みてみよう | A fake got mixed in!⏎Let's look again | said real of a fake star |
| `field.missReal` | ほんものだったよ⏎もういちど みてみよう | That one was real!⏎Let's look again | said fake of a real star |
| `field.kept` | ほんものの ほしを⏎{0}こ うけとったよ | You kept {0} real stars | a round is kept (3 or 4) |
| `field.clear` | クリア！ | Cleared! | the clear panel's word |
| `field.lesson` | よく みて えらんだから⏎ほんものを うけとれたね | You looked closely and⏎kept only the real ones | closing line, cleared only |
| `field.keep` | ほんものを うけとる | Keep the real stars | the keep button |
| `field.next` | つぎの ほしを みる | Next stars | after the first round |
| `field.again` | もういちど | Play again | cleared, left button |
| `field.leave` | タイトルへ | Title | cleared, right button |
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
  "again" because the stars are different. `Play again` and `Title` are on the cleared trial only.
- **`noClock`** is a caption, not a rule of the game's: it says what is true of those two trials.
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
  starts `sceneFor(state)` when the state leaves trial 3 (after `LeaveField`), passing `fromField: true`.
- `boot.ts` registers `FieldScene`.

Scene transitions:

| from | event | to |
|---|---|---|
| title | `Start` (tap outside the buttons) | lane (as before) |
| title | `StartShed` | shed (as before) |
| title | `StartField` (tap the field button) | field |
| field | `InspectStar`, `SortStar`, `KeepStars`, `RetryField` | field (the same scene re-renders) |
| field (cleared) | `LeaveField` | title (taps are ignored there for 0.7 s) |

### The title (`title-layout.ts`, `title-view.ts`, `TitleScene.ts`)

The preview showed that "How many can you find in 60 seconds?" floated above the art and the buttons, and read as the
title's rule. Now:

- **Trial 1's card** (a framed panel at (195, 372), 340 x 144) holds the way in ("Tap to start") and the rule (the
  60 seconds). A tap on the card still starts trial 1: it is not an object.
- **The two buttons** each have a label and a caption under it, `No timer` / `じかんは ないよ`, which is true: the
  shed has no clock (INV-24) and the field has none (INV-32). Their label is 22 px so that it clears the picture.
- A test proves the layout: the card holds both texts and touches neither button; the art lies between; the
  60-second string appears in no other title text.
- **The lock.** After `LeaveField` the scene restarts with `fromField: true`, and the tap-anywhere start is ignored
  for 0.7 s of game time (`Game.getTime()`; `Clock.now` is not set yet in `create`, which the smoke showed). A
  child who double-taps "Title" would otherwise start trial 1 with the second tap.
- **The touch guard.** The title adds its `touchmove` guard (no scrolling or zooming of the page) once per scene
  object and never removes it: it is the guard for every scene, so it must not go when the title shuts down,
  and adding it on every visit would stack copies.

### Buttons (`button-lock.ts`, `ui/field-buttons.ts`)

The wide button (keep, "next stars") covers the place of the two narrow ones (the verdicts, "play again" and
"title"), so a child's quick double tap lands on the button that replaces the first. Without a guard it would skip
the screen between them (the sorted star, the kept result, the clear panel). A set of buttons therefore ignores
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
| lens (and the clear panel) | (195, 428) | 340 x 124 |
| one wide button (keep, next) | (195, 534) | 300 x 80 |
| two buttons (verdicts, play again / title) | (118, 534) and (272, 534) | 146 x 80 each, 8 apart |
| the wisp (not a target) | (195, 720) | art 60 |
| title's field button | (195, 648) | 300 x 80 |

The hero starts at (195, 612); the buttons end at y 574, above its top (580). The star rows are 8 apart. The lens
and the clear panel are one place: the lens star (radius 34) while looking, the panel's word and closing line when
cleared, a faint ring when empty, so the layout does not jump between stages.

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
  clear: { title: string; lesson: string } | null;   // the cleared trial only
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
round; `again` and `leave` when cleared; none otherwise. Helpers `justSorted` and `justFinished` compare the view
before and after for the scene's flourish; they compare by value, so a change of language does not replay it.

### Scene (`scenes/FieldScene.ts`) and art (`ui/`)

Thin, like `ShedScene`: create the objects from the layout, subscribe to the game, render `fieldView`,
dispatch `InspectStar` for a star's tap and the button's event for a button, and play a short flourish. It
dispatches no `Tick`, so nothing in the field counts time. The fields are reset in `create`, because Phaser
reuses the scene object. The hero floor drag is the shed's: a press that hit no object walks the hero.

Painting is code only: `ui/field-art.ts` (the slot, and `drawClueStar`: halo, body, rim), `ui/star-card.ts` (the
slot widget: star, word, tick, and the white frame of the star in the lens), `ui/field-lens.ts` (the lens and the
clear panel), `ui/field-buttons.ts` (one widget per slot, hidden when not used; a tick or a ring of dots on the
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
| view (`field-view.test.ts`, `title-view.test.ts`) | per stage and language: message, buttons, stars, labels, ticks, alpha, lens, clear panel only when cleared, the message follows the last verdict; the title's words | REQ-6.2 to 6.7, 6.1.6 |
| layout (`field-layout.test.ts`, `route.test.ts`, `seed.test.ts`) | inside the canvas, no overlap in each stage, targets of 80 or more, the hero strip free, the probes where they say, the title's card and buttons apart; the scene follows `trial`; the seed | REQ-6.1, 6.8, 6.9 |
| mutation | any surviving mutant fails | REQ-6.12, 6.14 |
| mobile smoke (`smoke.mobile.field.spec.ts`) | real taps; the paths in REQ-6.13; pixels for the clue, the lens, the ticks, the buttons and the clear panel; grayscale and silence; ja and en screenshots; the title; offline | REQ-6.1 to 6.13 |
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
the narrow ones, so a gold gap means the wide button); the clear panel is its gold word. Text is counted as light
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
- **A run of two rounds, then the clear.** The first round has one fake and the second two, so there is a
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
- **The way back is on the cleared trial only.** A "back" button during play needs a `Leave` that is valid in
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
