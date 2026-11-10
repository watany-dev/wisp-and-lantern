# Design: Trial 3, The Wisp Field

Implements `requirements.md` (REQ-6.n). Follows ADR 0001 (pure reducer), ADR 0003 (gates) and the layout
rules in `.kiro/steering/structure.md`. No new dependency, no new asset, no new ADR: the reducer stays
pure and the scenes stay thin, which is what ADR 0001 and 0003 already say. The module layout copies
trial 2's (`05-trial-grant-tools`), so a reviewer who knows the shed knows the field.

## What the child does

```text
title --tap the field button--> checking (nothing checked)
checking --CheckStar i, star i unchecked--> checking (star i marked; the message is about it)
checking --CheckStar i, star i checked or i not 0 to 4--> checking (same state)
checking --KeepStars, some star unchecked--> checking (same state)
checking --KeepStars, all five checked--> kept
kept     --RetryField--> checking (next round, nothing checked)
```

`kept` is the success. The button after it plays the next round, so `RetryField` has one meaning: a fresh
round. The "keep" button is on screen only when all five stars are checked; the reducer still refuses
`KeepStars` earlier, so the rule does not rest on the button. A tap on the title anywhere else still
starts trial 1.

## Domain (`src/domain/`)

### State

`GameState` gains one field and no new `phase`:

```ts
// field.ts
export const starCount = 5;
export const rounds: readonly (readonly number[])[] = [[3], [0, 2], [4], [1, 3]]; // fake stars per round
export type Field =
  | { stage: "checking"; round: number; checked: readonly boolean[]; last: number | null }
  | { stage: "kept"; round: number };
export const initialField: Field = { stage: "checking", round: 0, checked: [false x5], last: null };

// state.ts
export const trials = { lane: 1, shed: 2, field: 3 } as const;
export type GameState = { /* as before */ field: Field };
```

Why this shape:

- **The truth is not stored.** Which stars are fake is a function of `round` (`fakesOf(round)`). The state
  holds only what the child has done: which stars they checked (`checked`) and which one last (`last`).
  So a mark can never disagree with the round, and "the kept stars are the real ones" is derived, not
  copied (REQ-6.8.5). `markOf(field, i)` is `unchecked` until star `i` is checked, then `fake` or `real`.
- **`kept` has no `checked` array.** It can be reached only with all five checked, so every mark is known
  and equals the round's truth; storing them again would be a second copy.
- **`last` exists for the message.** After each check the message is about the star just found. The
  view is a function of the state only, so the state must remember which star that was. `last` is `null`
  until the first check of the round.
- **`phase` stays `title | trial | over`.** The field is `phase` `trial` with `trial` 3; the scene follows
  `trial`. **`field` is always present** and is `initialField` everywhere except while `trial` is 3 (INV-31).
- **`round` is bounded by the table.** It is always an index of `rounds`, so the state space is finite
  for the model check and `RetryField` wraps from the last entry to the first.

### The round table

`rounds` lists the fake stars of each round. Stars are numbered 0 to 4: 0, 1, 2 are the top row from the
left, 3 and 4 the bottom row.

| round | fake stars | real stars (kept) | why |
|---|---|---|---|
| 0 | 3 | 0, 1, 2, 4 (4) | the first round has one fake, in the bottom row: the top row is all real, so the child sees "real" first and the fake is a surprise, not a rule |
| 1 | 0, 2 | 1, 3, 4 (3) | two fakes, with a real star between them |
| 2 | 4 | 0, 1, 2, 3 (4) | one fake, the last star |
| 3 | 1, 3 | 0, 2, 4 (3) | two fakes, one in each row |

Every set differs from the one before it, including the last and the first, so the next round never looks
like the one just played. Each round has 1 or 2 fakes (INV-26). There is no randomness: the same child
sees the same four rounds in the same order, and the tests and the model check can name them. A fixed
table is also what ADR 0001 asks of a pure reducer; an injected RNG would add an event for no teaching gain.

### Functions (`field.ts`)

```ts
export function fakesOf(round: number): readonly number[];
export function isFake(round: number, index: number): boolean;
export type StarMark = "unchecked" | "real" | "fake";
export function markOf(field: Field, index: number): StarMark;   // kept: every star is known
export type FieldOutcome = "checking" | "ready" | "kept";
export function fieldOutcome(field: Field): FieldOutcome;        // ready: all five checked, not kept
export function keptStars(field: Field): number[];               // the real stars once kept, else []
export function reduceField(field: Field, event: FieldEvent): Field; // returns `field` itself when nothing changes
```

`reduceField`:

- `CheckStar { index }`: in `checking`, when `index` is an integer from 0 to 4 and star `index` is not
  yet checked, the star becomes checked and `last` becomes `index`; otherwise no change. In `kept`, no change.
- `KeepStars`: in `checking` with all five checked, `{ stage: "kept", round }`; otherwise no change.
- `RetryField`: in `kept`, a fresh `checking` of the next round (`(round + 1) % rounds.length`); in
  `checking`, no change.

There is no branch that checks two stars at once, keeps a star that was not checked, or keeps a fake.

### Events (`events.ts`) and the reducer

```ts
export type FieldEvent =
  | { type: "CheckStar"; index: number }
  | { type: "KeepStars" }
  | { type: "RetryField" };
export type GameEvent = /* as before */ | { type: "StartField" } | FieldEvent;
```

Where each event applies ("same" means the same state object is returned):

| event | `title` | trial 1 | trial 2 (shed) | trial 3 (field) | `over` |
|---|---|---|---|---|---|
| `Start` | begins a run (trial 1) | language only | language only | language only (**new case, same code**) | begins a run |
| `StartField` (**new**) | `phase` `trial`, `trial` 3; `field`, `run`, `lane`, `shed` untouched | same | same | same | same |
| `StartShed` | opens the shed | same | same | same (**new case, same code**) | same |
| `Tick`, `Ask`, `PickCard`, `Retry` | same | the lane rule | same | same (**new case, same code**) | same |
| `PickTool`, `GiveTool`, `RetryShed` | same | same | `reduceShed` | same (**new case, same code**) | same |
| `CheckStar`, `KeepStars`, `RetryField` (**new**) | same | same | same | `reduceField` | same |
| `SetLang`, `MoveHeroTo` | as before | as before | as before | as before | as before |

`reducer.ts` adds `StartField` (`startField`: `phase` `title` only, like `startShed`) and the three field
cases guarded by `inTrial(state, trials.field)`, with a `withField` helper like `withShed`. Every
earlier guard already tests its own trial number, so trials 1 and 2 need no code change to ignore trial 3.

### Why a check shows the truth at one tap (REQ-6.6.4)

The trial is a staged scene for one idea (L3): what a helper brings can be wrong, so check it before you
accept it. To let a 6-year-old feel that, the field gives them a check that always works and costs one
tap. This is a rule of the game, not a claim about real AI:

- Real checking is harder. It can take effort, it can be impossible, and a check can itself be wrong.
  The game does not say otherwise: its words say only what happened to these five stars.
- A fake star is not a lie. The wisp did not mean to bring it; it mixed it up. The game shows this by
  the message and by the wisp's face, which does not change. The helper is never an enemy (REQ-6.4).
- Nothing says that a real AI makes mistakes all the time, or never does, or that checking is a
  chore. The child's work is shown as ordinary and sensible: look, then keep what you looked at.
- Why the five stars look alike before the check: if the fakes could be told by sight, the child
  could skip the check and still win, and the lesson would be "be clever", not "check". The table's
  "fakes that shine brighter" is kept as the look of a fake once it is found (a larger, paler halo around
  a hollow star), where it is a look and never the only sign.
- Why the keep needs all five checks: the keep is the child's act of accepting. Allowing it early would
  need a second kind of "kept" state (some stars still unchecked) that teaches nothing the first does
  not. The button simply is not there until the checking is done; the reducer ignores an early
  `KeepStars` as well, so a stray event cannot accept an unchecked star.

### Invariants

The eight new ones are in `requirements.md`. Their scope with respect to the existing ones:

| id | covers | with the field |
|---|---|---|
| INV-1, INV-2 | `phase`, `trial` | global; `trial` may be 3. Unchanged, re-run with the field events |
| INV-3, INV-4 | no mutation, determinism | global. Unchanged, **re-run over sequences that contain the field events** (`field.pbt.test.ts`) |
| INV-5, INV-8 to INV-17 | trial 1's lane and run | hold on every sequence, including the field events, because INV-32 keeps `lane` and `run` untouched. Unchanged |
| INV-18 to INV-24 | trial 2's shed | hold on every sequence; INV-31 and INV-32 keep the field and the shed apart. Unchanged |
| INV-25 to INV-30 | the field's check, round, keep, result and retry | new, `field.pbt.test.ts` |
| INV-31, INV-32 | the field and the other trials cannot touch each other | new, `field.pbt.test.ts` |

`domain-invariants.md` gets a line for this scope and eight rows. No id is retired or renumbered, and no
test of trial 1 or 2 is changed.

### Model check (`field.model.test.ts`)

Scope: the entrance from the title by the field button, and every state after it. It is not "every state
of trial 1 or 2 can reach the field" (the child gets to the field only from the title, and the field has no
exit), and it does not remove any state of the field to pass. The model checks of trials 1 and 2 are not
changed.

The alphabet is finite and includes events that must not matter:

- on the title: `StartField`, `SetLang` (ja, en), `MoveHeroTo` (two positions), `CheckStar` for each star
  and for two indexes that do not exist, `KeepStars`, `RetryField`, `Tick` (short and run-ending), one trial 1
  card, `Ask`, `Retry`, the shed's events (`PickTool`, `GiveTool`, `RetryShed`). Not `Start` and not `StartShed`: they are
  other trials' entrances and have their own model checks.
- after the entrance: all of the above plus `Start`, `Start` with a language, and `StartShed`.

The model wraps the real reducer's state with two things that are not part of the game, an independent record
of what the child did, written from the spec and not from the reducer: `record`, the set of stars the child
checked this round (a sorted set, so the order does not make a new state), the star checked last, the round it
expects and whether it was kept; and `plays`, the number of kept results so far, capped at 2, counted from
what the game did so that a broken game cannot fake a replay. The model test has its own copy of the round
table, so changing the table in the source fails the test.

| check | what |
|---|---|
| invariants | `phase`/`trial`/`field` agree (`field` initial outside trial 3); lane, run and shed stay initial in the field; the field's checked set and `last` equal the record; the round is the expected one; a kept field was reached with all five in the record; the stars kept are the table's real stars and none is a fake; every round of the table has 1 or 2 fakes |
| goal 1 | from every state the kept result is reachable (soft-lock) |
| goal 2 | from every state a fresh round (nothing checked) in the field is reachable |
| goal 3 | from every state a second kept result is reachable (`plays` 2): the replay |
| witnesses | the shortest trace to a fake found, to a real found, to the kept result, and to the second kept result, from an invariant that says "not this state" |
| number of states | 1,968, recorded in the test and in the Result line of task 3.1: the title (2 languages x 2 hero positions) and the field (2 x 2 for each of 6 rounds in progress with 81 states each, and 5 kept results) |

It must fail when the rules are broken on purpose, and the counterexamples are kept in the test:

| deliberate break | which check fails | counterexample |
|---|---|---|
| `KeepStars` works with a star unchecked | the kept invariant | `StartField, KeepStars` |
| `CheckStar` also checks the next star | the checked-set invariant | `StartField, CheckStar 0` |
| a second `CheckStar` on a star unchecks it | the checked-set invariant | `StartField, CheckStar 0, CheckStar 0` |
| `CheckStar` moves to the next round | the round invariant | `StartField, CheckStar 0` |
| `KeepStars` is ignored | goal 1 is stuck in every state | the start, trace empty |
| `RetryField` is ignored | goal 2 (a fresh round) is stuck as soon as one star is checked, and goal 3 (the replay) from the start; goal 1 still holds | `StartField, CheckStar 0`; the start, trace empty |
| `Tick` runs the clock in the field | the run invariant | `StartField, Tick 1000` |

The break is a wrapper `step` around the real `reduce`, as in trials 1 and 2; no source is edited for it. A
broken game can drift away from the record in many ways, so the broken checks use a looser state identity
(no language, hero or exact clock) and, for the one break about a single star, a small alphabet.

## Content (`src/content/`)

A `field` group is added to `strings.ja.json` and `strings.en.json` under the same keys. `{0}` is a number
(a digit, so the kid gate accepts it). `⏎` is a line break.

| key | ja | en | used |
|---|---|---|---|
| `field.enter` | ほしを たしかめよう | Check the stars | the title's field button |
| `field.guide` | ひとつずつ たしかめて⏎ほんものを うけとろう | Check each star first,⏎then keep the real ones | the top line, always |
| `field.start` | ウィスプの ほし 5こ⏎タップして たしかめよう | The wisp brought 5 stars⏎Tap one to check it | nothing checked yet |
| `field.real` | この ほしは ほんもの！ | This star is real! | the star checked last is real |
| `field.fake` | にせものだった！⏎ウィスプも まちがえるよ | That one is a fake!⏎The wisp mixed it up | the star checked last is fake |
| `field.kept` | ほんものの ほしを⏎{0}こ うけとったよ | You kept {0} real stars | kept result message |
| `field.lesson` | たしかめてから⏎ほんものだけ うけとったね | You checked each star⏎and kept the real ones | closing line, kept only |
| `field.keep` | ほんものを うけとる | Keep the real stars | button when all are checked |
| `field.again` | つぎの ほしを みる | Next stars | button after the keep |
| `field.marks.real` | ほんもの | real | the label under a real star |
| `field.marks.fake` | にせもの | fake | the label under a fake star |

Why these words:

- **The start message says the same in both languages.** The first Japanese draft said only that the wisp
  brought stars, while the English also said to tap one (the rubric's "the Japanese and English say the same
  thing"). The Japanese is now `ウィスプの ほし 5こ` / `タップして たしかめよう`.
- **The guide states both steps** (check, then keep) and stays on screen all the time, so the order is
  known before the first tap. The `start` message does not repeat it: it says what the wisp did.
- **Fake, not "wisp".** The table's word is "wisps"; the child-facing word is "fake" (`にせもの`), because the
  helper is also called the wisp (Decisions).
- **`fake` message: "The wisp mixed it up".** `まちがえる` / "mixed it up" is the wisp's honest mistake: it
  says the wisp can be wrong, with no intent. The `also` in `ウィスプも まちがえるよ` ("the wisp
  makes mistakes too") puts the wisp among everyone who mixes things up. No word of lying, tricking or
  blame (REQ-6.4.2). The line is not shown for a real star, and the labels carry the word on the star.
- **`kept` names a number.** "You kept 3 real stars" tells the child what was accepted. The number is 3 or
  4, so it also says how many were fakes without saying it.
- **The closing line** looks back at what the child did, in the order they did it (checked, then kept),
  and shares no sentence with the kept message. After the kid-reader pass (the `kid-reader` agent is not
  runnable from this session; the rubric in `.kiro/agents/kid-reader.md` was applied by hand, and the
  result goes in the pull request) the English is kept as in the directions. The Japanese first line became
  `たしかめてから` ("after checking"): the direction's `ひとつずつ たしかめて` is also the guide's first line, so the
  closing line would have repeated it. The English lines are 21 and 23 characters; the layout is the limit (a
  320 px wrap at 22 px; checked on the screen in task 6.1, and the test allows 24 characters per English
  line). The next playtest should check whether children read "each
  star" as the five they tapped.
- **The buttons say what happens.** `Keep the real stars` names the act and the object. `Next stars`
  does not say "again" because the stars are different. It is not a retry for a mistake of the child.
- **No claim about real AI.** No string says a helper is always wrong or always right, that it lies, that
  checking always works, or that it is a friend. A content test checks this with word lists of its own
  (below), and a second list of words that blame the wisp.

A content test renders every message that takes a number with 3 and 4 and applies the Japanese rules (no
kanji, no Latin letters, 12 characters, 2 lines). `lane`, `shed` and `run` strings are not changed.

## Game (`src/game/`)

### Entrance and scene choice

- `TitleScene` gets a second button: a gold panel (`drawButton`) with a small star and `field.enter`, at
  (195, 648), 300 x 80, above the shed button (195, 736). To make room, the title's wisp moves from (285,
  590) to (285, 538) and the hero from (110, 600) to (110, 548); `titleArt` in `field-layout.ts` holds both. The button's own handler dispatches
  `StartField`. The existing "a press that hit no object starts trial 1" guard already covers it: the
  button is an object, so a press on it reaches `StartField` only. If both ran anyway, only the first would
  have an effect: after `StartField`, a `Start` sets the language only, and after `Start`, a `StartField`
  is ignored because the game has left the title.
- `route.ts`: `sceneFor(state)` returns `"field"` for `trial` 3. `SceneKey` gains `"field"`. The title
  scene already starts `sceneFor(state)`; the field scene starts nothing (it has no exit).
- `boot.ts` registers `FieldScene`.

Scene transitions:

| from | event | to |
|---|---|---|
| title | `Start` (tap outside the buttons) | lane (as before) |
| title | `StartShed` | shed (as before) |
| title | `StartField` (tap the new button) | field |
| field | `CheckStar`, `KeepStars`, `RetryField` | field (the same scene re-renders) |
| field | (no exit) | reload returns to the title |

### Layout (`field-layout.ts`; the rest comes from `lane-layout.ts` and `shed-layout.ts`)

All numbers are game pixels on the 390 x 844 canvas. The field uses the lane's result message, closing line
and button positions and the shed's guide position, so those layouts and their tests are untouched.

| thing | center | size | from |
|---|---|---|---|
| guide text | (195, 56) | wrap 340, 2 lines | `shed-layout` |
| stars 0, 1, 2 | (75, 170), (195, 170), (315, 170) | 88 x 88 | new |
| stars 3, 4 | (135, 270), (255, 270) | 88 x 88 | new |
| message | (195, 380) | wrap 340, height 60 | `lane-layout` `resultText` |
| closing line panel and text | (195, 448) | 340 x 64 | `lane-layout` |
| button | (195, 528) | 300 x 80 | `lane-layout` |
| the wisp (not a target) | (195, 720) | art 60 | new |
| title's field button | (195, 648) | 300 x 80: y 608 to 688 | new |

The hero starts at (195, 612) as in the lane: the strip y 568 to 644 is free between the button and the
wisp. The message is in one place in every stage; the stars end at y 314 and the message begins at y 350.

Inside a star's slot (offsets from its center): the star is drawn at (0, -10) with radius 24, the label at
(0, +30) in 18 px, and the badge disc at (+36, -36), the shape `drawPickedMark` already draws for a picked
card. The probe points the smoke samples are named in `field-layout.ts`: the star's center (0, -10),
bright for a solid star and dark for a hollow one, and a point inside the badge disc (+36, -46), bright
only for a real star (the unchecked and fake slots are dark there).

### View (`field-view.ts`)

`fieldView(state)` returns plain data; the scene draws it:

```ts
type StarView = {
  index: number;
  mark: StarMark;                      // unchecked | real | fake
  label: string;                       // "" while unchecked
  picture: "solid" | "hollow";         // hollow only for a fake star
  ticked: boolean;                     // the badge and frame: real stars
  alpha: number;                       // 0.3 for a fake star after the keep, else 1
};
type FieldView = {
  guide: string;
  message: string;
  button: { text: string; event: FieldEvent } | null;  // keep when ready, next stars when kept
  stars: StarView[];
  lesson: string | null;               // kept result only
  last: number | null;                 // the star checked last (for the flourish), null when kept
};
```

`message` and `lesson` come from `strings[lang].field`. The message is `kept` (with the number) after the
keep, `start` while nothing is checked, and `real` or `fake` for the star `last`. The view does not depend
on time or on a drawing. Two helpers compare the view before and after for the scene's flourish:
`justChecked` (the star that was just checked) and `justKept`.

### Scene (`scenes/FieldScene.ts`) and art (`ui/`)

Thin, like `ShedScene`: create the objects from the layout, subscribe to the game, render `fieldView`,
dispatch `CheckStar` for a star's tap and the button's event, and play a short flourish. It dispatches no
`Tick`, so nothing in the field counts time. The fields are reset in `create`, because Phaser reuses the
scene object. The hero floor drag is the shed's: a press that hit no object walks the hero, a press on a
star or the button does not.

Drawing is code only: `ui/star-card.ts` (the widget: slot panel, star, label, badge), `ui/field-art.ts` (the
solid star with its gold halo, the hollow star with its dashed outline and larger, paler halo). The
**solid** star is the existing `drawStar`; **real** adds the picked mark (a thick frame and a tick);
**fake** is the hollow dashed outline on a dark slot; the labels are text. The flourish on a check is a
ripple at the star, plus sparks for a real star; on a fake star the wisp tilts once. On the keep, sparks fly
from every kept star. The wisp's face is the existing one in every stage.

## Reuse and alternatives

| need | reused | alternative and why not |
|---|---|---|
| state and events | `reduce`, `GameState`, `GameEvent`, `createGame`, `window.__game` | a second store: not needed |
| the field's rules | the `reduceShed` pattern: a small reducer that returns its input when nothing changes | putting the stars into `Shed` or `Lane`: forces a tool or a card to be a star and breaks INV-8 to INV-24 |
| events | new `CheckStar`, `KeepStars`, `RetryField`, `StartField` | reusing `PickTool`, `GiveTool`, `RetryShed`: a shared name lets a trial 2 handler act on a trial 3 state. The cost is four more event names |
| trial choice | `trial` number | a new `phase`: widens INV-1 and every `phase` switch |
| layout | `resultText`, `lessonBox`, `buttonRect`, `guideText` | a copy of those numbers: two sources for one layout |
| cards and marks | `drawLitSlot`, `drawSlot`, `drawStar`, `drawPickedMark` | new frames and badges: more art for no new meaning |
| background, camera, text, wisp, hero, button, sparks | `drawBackground`, `fitCamera`, `textStyle`, `createWispArt`, `createHero`, `drawButton`, `burst`, `ripple` | none needed |
| property and model tests | `checkProperty`, `checkModel` | none |
| smoke | `tapper`, `clicker`, `pressUntil`, `pixels.ts`, `collectErrors`, `expectBundledFont`, `expectClosingLine` | none |

## Test plan and traceability

| layer | what | requirement |
|---|---|---|
| unit (`field.test.ts`) | `reduceField` for each event in each stage; the round table; `markOf`, `fieldOutcome`, `keptStars`; a recheck; an index out of range; an early keep; the lock after the keep; the retry before and after | REQ-6.3 to 6.7 |
| unit (`reducer.test.ts`) | `StartField` from the title only; field events outside the field; the other trials' events and `Tick` in the field; `Start` and `SetLang` in the field; `lane`, `run` and `shed` untouched | REQ-6.1, 6.7, 6.8 |
| property (`field.pbt.test.ts`) | INV-3 and INV-4 with field events; INV-25 to INV-32; coverage: every star checked, a recheck, an index out of range, an early keep, a keep, a retry after the keep, and the whole table | REQ-6.8, 6.12 |
| model (`field.model.test.ts`) | the state space and goals above; deliberate breaks | REQ-6.5, 6.7, 6.12 |
| content (`field-content.test.ts`) | same keys; one `{0}` where it belongs; Japanese rules; English lengths; no blame words; no claims about real AI; the closing line is its own text | REQ-6.4, 6.6, 6.11 |
| view (`field-view.test.ts`) | per stage and language: message, button, stars, labels, ticks, alpha, lesson only when kept, the message follows the star checked last | REQ-6.2 to 6.7 |
| layout (`field-layout.test.ts`, `route.test.ts`) | inside the canvas, no overlap in each stage, targets of 80 or more, the hero strip free, the title's two buttons apart, the probes inside their slots; the scene follows `trial` | REQ-6.8, 6.9 |
| mutation | any surviving mutant fails | REQ-6.12, 6.14 |
| mobile smoke (`smoke.mobile.field.spec.ts`) | real taps; the paths in REQ-6.13; pixels for each star and the closing line; ja and en screenshots; offline | REQ-6.1 to 6.13 |
| desktop smoke (`smoke.desktop.field.spec.ts`) | the same with the mouse; a held press on a star leaves the hero still | REQ-6.9, 6.13 |

`tasks.md` carries the requirement, test and result for each task.

### How the smoke sees the picture

The field is drawn on the canvas, so the DOM has no copy of it and a state that says "fake" would pass even
if the star never drew hollow. The smoke samples two named points per star (`field-layout.ts`) from a
screenshot: the star's center is bright for a solid star and dark for a hollow one, and a point inside the
badge disc is bright only for a real star. So unchecked reads "solid, no badge", real "solid, badge", fake
"hollow, no badge". Text is counted as light pixels in the message and closing-line boxes, as trial 1 and
2's smoke do. The pixel reading uses `node:zlib` only.

## Decisions and alternatives

- **Check shows the truth; the stars look alike before.** Alternatives: a visible tell (fakes shine more)
  would let the child skip the check; a check that can fail would teach nothing in one tap. The "shines
  brighter" detail is kept for the revealed fake.
- **Keep once, for all five, after all are checked.** Alternatives: keep each star by a second tap (ten
  taps and a per-star accepted state), or keep early (a partial state that teaches nothing new). The
  user's wording "accept only the real ones that were checked" holds in both the button (not shown early)
  and the reducer (INV-27, INV-28).
- **The keep is a button, not a tap on the wisp.** In trial 2 the hand-over is the point (tools are
  given to the wisp). Here the point is that the child decides to accept, and a button that names the act
  ("Keep the real stars") says so; the wisp stays friendly and is not a target.
- **Fakes are "fake stars", not "wisps".** Recorded in Why.
- **A fixed table of four rounds, not randomness.** See "The round table". The model check and the
  property tests name the rounds.
- **One value for the marks and the result.** `checked` plus `round` in `checking`, `round` in `kept`.
- **Guard by `trial`, not by a new phase.** INV-1 keeps its three phases.
- **Separate events.** `CheckStar`, `KeepStars`, `RetryField` and `StartField` cost four names and remove
  the chance of cross-trial effects (INV-31, INV-32).
- **The title button is an object, not a new screen.** A selection screen is a router and is out of scope.
- **The title art moves up by 52 pixels** so that two buttons fit under it with 8 pixels between them.
  The shed button does not move, so trial 2's layout and its tests are untouched; only `titleArtBottom`
  changes (660 to 606), and no test pins the old value. Trial 3's button sits above trial 2's.
- **No exit from the field.** The same reason as the shed: a "back" button needs a `Leave` event and a
  title return that resets the other trials' state, and is a different feature. Listed under "Found, not
  fixed". A reload returns to the title.
- **The wisp is not a tap target.** The point of the field is to check the stars, and a target that does
  nothing would mislead a child. It stays on screen so that "the wisp brought them" is visible.
- **The model's `record` and `plays`** are in the test, not in `GameState`: the game has no use for them.
- **English lines are longer than 20 characters** (21 and 23). Trial 2's limit of 20 is a limit of its own
  key; here the layout is the limit.

## Risks

- WebKit does not start in the authoring sandbox (missing system libraries; `docs/evidence/didnt-work.md`).
  The mobile smoke runs there on Chromium with the iPhone 13 touch profile, labelled as such; the real
  WebKit run is CI's. A task is not called done until CI's smoke is green.
- Pixel probes depend on the drawing. A change to the star art that moves a probe fails the smoke; the
  probes and the drawing share `field-layout.ts`, so the numbers change in one place.
- The art is code and is judged by eye in the screenshots; the hollow star and the badge may need a second
  pass after the first look at the built screen.
- A child may check all five stars without reading, and the lesson then rests on the closing line and the
  messages. The next playtest should note whether children say that the wisp made a mistake, and whether
  they look at a star before they tap it.
- A child may read "the wisp mixed it up" as "the wisp is silly". The words give no reason to; the playtest
  should note it.
