# Design: Trial 2, The Locked Shed (revision 2: a 60-second time attack with five puzzles)

Implements `requirements.md` (REQ-5.n), revision 2. Follows ADR 0001 (pure reducer), ADR 0003 (gates) and the
layout rules in `.kiro/steering/structure.md`. No new dependency, no new asset, no new ADR: the reducer stays
pure and the scenes stay thin, which is what ADR 0001 and 0003 already say. Revision 2 reuses trial 1's `Run`
(the clock, the score, the streak, the best) and its end screen instead of adding a second clock.

## What the child does

```text
title --tap the shed button--> choosing (round 0, a run of 60 s begins)
choosing --PickTool--> choosing (0 or 1 tool)
choosing --GiveTool, a tool picked--> tried (freed | stuck), scores once
choosing --GiveTool, none picked--> choosing (same state)
tried    --RetryShed after stuck--> choosing (same round, nothing picked)
tried    --RetryShed after freed--> choosing (next round: a different puzzle)
any state of the run --Tick, the clock at zero--> end screen (phase over, trial 2)
end screen --StartShed--> choosing (round 0, a new run)
run or end screen --LeaveShed--> title
```

`tried` with `freed` is a find. The button after `freed` says "Next puzzle", after `stuck` "Try another tool";
both send `RetryShed`, which keeps one meaning: back to choosing, on to the next round when the cat was freed.
A tap on the title anywhere else still starts trial 1.

## Domain (`src/domain/`)

### State

`GameState` gains no field and no new `phase`. `shed` changes shape, and the shed uses `run`, which trial 1
already has:

```ts
// shed.ts
export const tools = ["key", "broom", "hammer", "scissors", "ladder"] as const;
export const puzzles = ["lock", "leaves", "boards", "rope", "roof"] as const;
const answers: Record<PuzzleId, ToolId> = { lock: "key", leaves: "broom", boards: "hammer",
                                            rope: "scissors", roof: "ladder" };
export type Shed =
  | { stage: "choosing"; seed: number; round: number; pick: ToolId | null }
  | { stage: "tried"; seed: number; round: number; tool: ToolId };
export const initialShed: Shed = { stage: "choosing", seed: 0, round: 0, pick: null };
```

Why this shape:

- **The selection and the result are one value.** `choosing` holds the pick (none or one tool, so "at most
  one" cannot be broken: it is a single field). `tried` holds the tool that was handed over; it has no pick
  of its own. The outcome is not stored: `shedOutcome` derives it from the puzzle and the tried tool. This
  is REQ-5.9.5.
- **`seed` and `round` are in both stages**, so the puzzle is known whatever the stage, and the retry can
  keep it or step to the next. The puzzle itself is not stored: `puzzleAt(seed, round)` derives it, as
  `fakesOf(seed, round)` does in the field.
- **`phase` stays `title | trial | over`.** The shed is `phase` `trial` with `trial` 2; its end screen is
  `phase` `over` with `trial` still 2, which is how the shared end screen knows whom to restart. The scene
  follows `trial` and `phase` (below).
- **`shed` is `initialShed` everywhere except while `trial` is 2 (INV-23).** `Start` from the shed's end
  screen, and `LeaveShed`, reset it.
- **The shed's score is `state.run`.** It is the same value as trial 1's, and the shed never touches `lane`.

### Functions (`shed.ts`)

```ts
export function newShed(seed: number): Shed;               // round 0 of seed >>> 0, nothing picked
export function puzzleAt(seed: number, round: number): PuzzleId;
export function puzzleOf(shed: Shed): PuzzleId;
export function answerOf(puzzle: PuzzleId): ToolId;        // the fixed rule (REQ-5.5.2)
export function solves(puzzle: PuzzleId, tool: ToolId): boolean;
export type ShedOutcome = "choosing" | "freed" | "stuck";
export function shedOutcome(shed: Shed): ShedOutcome;
export function triedTool(shed: Shed): ToolId | null;
export function canGive(shed: Shed): boolean;              // choosing with a tool picked
export function reduceShed(shed: Shed, event: ShedEvent): Shed; // returns `shed` itself when nothing changes
```

`puzzleAt(seed, round)`: `start = seed % 5`, `step = 1 + floor(seed / 5) % 4`, the puzzle is
`puzzles[(start + step * round) % 5]`. Five is prime and the step is 1 to 4, so every five rounds show all five
puzzles and the same puzzle never comes twice in a row. There are 20 orders. The game draws a seed from
`Math.random` when a run starts (`game/seed.ts`, as the field does); the domain never does.

`reduceShed`:

- `PickTool { tool }`: in `choosing`, `pick` becomes `tool` (the same object when it already is); in `tried`, no change.
- `GiveTool`: in `choosing` with a pick, `{ stage: "tried", seed, round, tool: pick }`; with no pick, or in `tried`, no change.
- `RetryShed`: in `tried`, `choosing` with nothing picked, in round + 1 after `freed` and in the same round
  after `stuck`; in `choosing`, no change.

There is no branch that corrects a tool, picks a default or takes a tool that was not handed over.

### Events (`events.ts`) and the reducer

```ts
export type ShedEvent = { type: "PickTool"; tool: ToolId } | { type: "GiveTool" } | { type: "RetryShed" };
export type GameEvent = /* as before */
  | { type: "StartShed"; seed?: number }   // from the title, or from the shed's end screen
  | { type: "LeaveShed" }                  // from a run or the end screen of trial 2
  | ShedEvent;
```

Where each event applies. "same" means the same state object is returned.

| event | `title` | trial 1 | trial 2 (the shed) | `over`, trial 1 | `over`, trial 2 |
|---|---|---|---|---|---|
| `Start` | begins trial 1 | language only | language only | begins trial 1 | begins trial 1, `shed` initial (**new**) |
| `StartShed` | begins a run: round 0 of `seed`, full clock, score 0, best kept (**changed**) | same | same | same | the same as from the title (**new**) |
| `LeaveShed` (**new**) | same | same | to the title; `shed` initial, run restarted, best kept | same | to the title, as from the shed |
| `Tick` | same | clock down; at zero the run is over | clock down; at zero the run is over (**changed**) | same | same |
| `Ask`, `PickCard`, `Retry` | same | the lane rule | same | same | same |
| `PickTool`, `RetryShed` | same | same | `reduceShed` | same | same |
| `GiveTool` | same | same | `reduceShed`, then scores once (**changed**) | same | same |
| `SetLang`, `MoveHeroTo` | as before | as before | as before | as before | as before |

`reducer.ts` keeps its helper `inTrial(state, n)`. `Ask`, `PickCard` and `Retry` test `trials.lane`; `Tick`
tests the lane or the shed; the shed events test `trials.shed`. `give` calls `reduceShed` and, when it
changed the shed, `scoreSearch(run, shedOutcome(shed) === "freed")`: the same scoring function as trial 1's
`ask`. `startShed` accepts the title or `phase` `over` with `trial` 2. `leaveShed` accepts any phase but the
title when `trial` is 2. `start` now also sets `shed` to `initialShed`, because `Start` is reachable from the
shed's end screen. `StartShed`'s seed is optional so that tests and a caller with no preference get the fixed
order that starts with the lock (`Start` has an optional `lang` in the same way).

### Result table (REQ-5.5)

| puzzle | answer | freed: picture | stuck: picture | message (key) | button |
|---|---|---|---|---|---|
| (choosing) | | puzzle as it is | | `shed.pick` or `shed.ready` | none |
| any | its answer | obstacle gone, door open (not in `roof`), cat by the shed, star | | `shed.free`, closing line `puzzles.<id>.lesson` | `shed.next` |
| any | any other tool | | obstacle still there, door shut, cat inside (on the roof in `roof`) | `puzzles.<id>.stuck` | `shed.retry` |

The results are the only results. The rule has no randomness, no state beyond the tried tool and the puzzle,
and no language or timing input.

### Why each puzzle has exactly one answer (REQ-5.8.6)

The trial is a staged scene for one idea (L2): the wisp can do only what the tool it is given allows. To let a
6-year-old feel that, every puzzle has one tool that fits, and the wisp tries exactly what it is handed. It is
a fixed rule of the game, not a claim about real AI:

- A real agent with the right tool can still fail, and a real hammer can break a lock. The game does not say
  either. It does not say the broom "cannot" open doors, only that here the leaves are still there. No other
  solution is offered, because a second one would make the child choose by guessing what is allowed, not by
  what the wisp was given.
- Revision 2 adds the second half of the point the first build could not show: the right tool depends on
  the problem. A key is the answer in the first round and the wrong tool in the next. A child who learned
  "the key always works" in revision 1 now has to look at the picture.
- The second half of L2 (too much power causes accidents) is still not shown. Nothing is broken, and the
  cat is never in danger.
- The key belongs to the game's shed. The words never ask the child to give a real house key, a password or
  a private thing to an AI. That is L4 and is not explained here.

### Invariants

| id | covers | with the shed |
|---|---|---|
| INV-1, INV-2 | `phase`, `trial` | global; `trial` may be 2. Unchanged, re-run with the shed events |
| INV-3, INV-4 | no mutation, determinism | global. Unchanged, **re-run over sequences that contain the shed events** (`shed.pbt.test.ts`); the seed is in the events, so the same events give the same states |
| INV-5, INV-8 to INV-14 | trial 1's lane | trial 1 only by definition. They hold on every sequence, including the shed events, because INV-24 keeps `lane` untouched in the shed. Unchanged |
| INV-15 to INV-17 | the clock, the score and the end screen of a run | **widened** to the shed's run, with `shed.pbt.test.ts` next to trial 1's tests. Trial 1's tests are unchanged |
| INV-18 to INV-24 | the shed's pick, hand-over, result, retry, separation | reworded for puzzles and answers (INV-20), the retry that goes on (INV-22), the hand-over that scores (INV-23); INV-24 keeps only "the lane stays initial" |
| INV-40 to INV-43 | the score, the order of the puzzles, the way back, the start | new |

`domain-invariants.md` gets a line for this revision and the reworded rows. Ids are kept; no test of trial 1
is changed. INV-32 (trial 3) changes one assertion: `run` keeps its title values in the field, with `best`
allowed to differ, because a run of the shed can set the best before the child comes to the field.

### Model check (`shed.model.test.ts`)

Scope: the entrance from the title by the shed button, and every state after it, including the end screen
and the title the child comes back to. It is not "every state of trial 1 can reach the shed" (the child gets
to the shed only from the title), and it does not remove any state of the shed to pass. The trial 1 and trial 3
model checks stay as they are.

The alphabet is finite and includes events that must not matter: five seeds (so each puzzle can come first),
`LeaveShed`, `SetLang`, two hero positions, the five tools, `GiveTool`, `RetryShed`, one card of trial 1, `Ask`,
`Retry`, `Tick` of 1 s and of the whole run, and, inside a run, `Start`. (`Start` on the shed's end screen
begins trial 1, which has no way back to the title; unit tests cover it.)

The model wraps the real reducer's state with three things that are not part of the game: `expected`, the tool
the child last picked in this attempt; `plays`, the number of freed cats so far, capped at 2; and `scoreOk`,
false from the first step that moved the score when it should not have. The state key abstracts what grows
without end: the score is "none" or "some", the clock is "full", "running" or "zero", the round is taken modulo 5.

| check | what |
|---|---|
| invariants | `phase`/`trial`/`shed` agree; `shed` initial outside trial 2; the lane stays initial; the clock is between 0 and 60 s and the run is over exactly at zero; a choosing state's pick is the expected pick; a tried state's tool is the expected tool; freed iff the tried tool is the answer; the score moves only on a freed hand-over |
| goal 1 | from every state a freed cat is reachable (soft-lock), and with every tool |
| goal 2 | from every state the title is reachable |
| goal 3 | from every state the end screen is reachable |
| goals 4 to 6 | with neither the clock nor `LeaveShed` in the alphabet: a fresh choosing, the next round and a second freed cat are reachable from every state |
| witnesses | the shortest trace to a freed cat with each tool (3 events: the seed that starts with its puzzle, the pick, the hand-over) and to a stuck result with each tool |
| number of states | 9,400, recorded in the test and in the Result line of task 9.3 |

It must fail when the rules are broken on purpose, and the counterexamples are kept in the test:

| deliberate break | which check fails | counterexample |
|---|---|---|
| the answer's hand-over is ignored | goal 1 is stuck in every state | the start state, trace empty |
| `RetryShed` is ignored | goal 1 is stuck (checked without the clock and the leave, which would be a way out) | `StartShed, PickTool broom, GiveTool` |
| `RetryShed` is ignored after a freed cat | the next round is unreachable, while the first freed cat still is | the start state; from a freed cat itself, the empty trace |
| `GiveTool` hands over the key whatever was picked | the tried-tool invariant | `StartShed, PickTool broom, GiveTool` |
| `PickTool` keeps the first pick | the pick invariant | `StartShed, PickTool key, PickTool broom` |
| `Tick` does nothing in the shed | the end screen is unreachable from every state | the start state, trace empty |
| `LeaveShed` is ignored | the title is unreachable | `StartShed` |
| a stuck hand-over also scores | the score invariant | `StartShed, PickTool broom, GiveTool` |

The break is a wrapper `step` around the real `reduce`, as in the trial 1 check; no source is edited for it.

## Content (`src/content/`)

The `shed` group in `strings.ja.json` and `strings.en.json`, under the same keys. `{0}` is the tool name (a
digit, because the kid gate rejects Latin letters in Japanese). Each puzzle has three texts under
`shed.puzzles.<id>`: `guide`, `stuck` and `lesson`. The generic ones:

| key | ja | en | used |
|---|---|---|---|
| `shed.enter` | ねこを たすけよう | Free the cat | the title's shed button |
| `shed.timeAttack` | 60びょうで いくつ？ | How many in 60 seconds? | the caption under that label |
| `shed.pick` | どうぐを ひとつ⏎えらんでね | Pick one tool | choosing, nothing picked |
| `shed.ready` | ウィスプを タップして⏎{0}を わたそう | Tap the wisp to⏎give it the {0} | choosing, a tool picked |
| `shed.free` | ねこが でてきた！⏎{0}を つかったよ | The cat is out!⏎The wisp used the {0} | freed result message |
| `shed.next` | つぎの もんだい | Next puzzle | button after a freed cat |
| `shed.retry` | ほかの どうぐを ためそう | Try another tool | button after a stuck result |
| `shed.leave` | タイトル | Title | the button back to the title |
| `shed.tools.*` | かぎ ほうき ハンマー はさみ はしご | key broom hammer scissors ladder | the labels |

`⏎` is a line break. The puzzles' texts:

| puzzle | guide (ja / en) | stuck (ja line 2 / en line 2) | closing line (ja line 2 / en line 2) |
|---|---|---|---|
| `lock` | とびらに かぎが かかってる / The door is locked! | とびらは あかなかった / The door stayed shut | あけられたね / It opened the door |
| `leaves` | とびらの まえに おちばが / Leaves block the door! | おちばは そのまま / The leaves are still there | おちばを はけたね / It swept the leaves away |
| `boards` | とびらに いたが うってある / Boards cover the door! | いたは そのまま / The boards are still on | いたを はずせたね / It took the boards off |
| `rope` | とびらが ロープで ぐるぐる / A rope ties the door! | ロープは そのまま / The rope is still tied | ロープを きれたね / It cut the rope |
| `roof` | ねこが やねで こまってる / The cat is on the roof! | ねこは まだ やねの うえ / The cat is still up there | ねこを おろせたね / It got the cat down |

The second line of every guide is `どうぐを わたそう` / `Give the wisp a tool`. The first line of every stuck
message is `{0}を つかったよ` / `The wisp used the {0}`; of every closing line `{0}を わたしたら` /
`You gave the {0}`.

Why these words:

- **The guide says what is wrong, and then what to do.** It names no tool, so "one is enough" is true before the
  child touches anything and the picture, not the words, carries the clue. `ready` repeats the chosen tool's
  name, which confirms the pick in words as well as by the frame (hard rule 7).
- **English says "give", not "hand over".** The learning goal and the code say hand over; a 6-year-old says
  give. The English closing line is `You gave the {0}` (revision 1 said `a`; "a scissors" is wrong, so it is
  `the` everywhere).
- **The message and the closing line are different texts.** The message says what happened and which tool the
  wisp used. The closing line says why it worked from the child's side. They share no sentence, which is
  what REQ-5.8 asks for. Both take the tool name from the tried tool, so they cannot name two different tools.
- **`stuck` states the fact.** "The door stayed shut", "The leaves are still there" are plain observations. They
  have no "wrong", "bad", "no", "fail" and none of their Japanese counterparts, and they are not hidden. The
  button says what to do next (`Try another tool`), not what went wrong.
- **English lines are at most 26 characters** (revision 1: 24 for messages and 20 for the closing line). A tool
  name is longer now (`scissors`): `The wisp used the scissors` is 26. At 22 px in the 340 px column (320 for the
  closing line) about 27 characters fit; the screenshots in task 9.7 show them with room.
- **The title's caption says the shed has the 60 seconds.** In revision 1 both buttons said "No timer" (REQ-6.1.6
  of `06`); now only the field's does.
- **No claim about real AI.** No string says a tool always works, that AI can do anything with the right
  tool, that it knows everything, or that it is a friend. A content test checks this with the same word
  lists as trial 1's, plus house, key-of-a-house and password words.

The kid-reader agent could not be run from this session; its rubric was applied by hand (the same sentences,
read as a 6-year-old would: one idea a line, hiragana and katakana only, "しばってある" was too long and
became "ロープで ぐるぐる"). The result goes in the task 9.4 pull request. A content test renders every
message that takes a tool name with all five names and applies the Japanese rules (no kanji, no Latin
letters, 12 characters, 2 lines). `lane` and `run` strings are not changed.

## Game (`src/game/`)

### Entrance, end screen and scene choice

- `TitleScene`'s shed button dispatches `StartShed` with `newSeed()`. A press that hit no object still starts
  trial 1. Under the shed's label the button's caption is `titleView(lang).shedCaption` (the 60 seconds); under
  the field's it is `noClock`. After a trial sends the child back, the title ignores taps for 700 ms
  (`fromTrial`, which was `fromField`).
- `route.ts`: `sceneFor(state)` is unchanged: `title`, `lane`, `shed`, `field` or `over` from `phase` and
  `trial`. The shed scene starts `sceneFor(state)` when the state is no longer the shed's (the end screen, or the
  title with `{ fromTrial: true }`).
- `OverScene` draws `overView(state)`, which now has a list of buttons. Trial 1: one (play again,
  action `play`). Trial 2: two (play again, action `playShed`; the title, action `leave`). The scene turns
  an action into an event (`playShed` draws a seed with `newSeed()`), and on any state that is no longer `over` it
  starts `sceneFor(state)`.

Scene transitions:

| from | event | to |
|---|---|---|
| title | `Start` (tap outside the buttons) | lane (trial 1, as before) |
| title | `StartShed` (tap the button) | shed |
| shed | `PickTool`, `GiveTool`, `RetryShed` | shed (the same scene re-renders) |
| shed | the clock at zero | over |
| shed | `LeaveShed` | title (taps ignored for a moment) |
| over (trial 2) | `StartShed` / `LeaveShed` | shed / title |
| over (trial 1) | `Start` | lane (as before) |

### Layout (`shed-layout.ts`; the rest comes from `lane-layout.ts`)

All numbers are game pixels on the 390 x 844 canvas. The shed uses the lane's top row, wisp, message, result,
closing line and button positions, so trial 1's layout and its tests are untouched.

| thing | center | size | from |
|---|---|---|---|
| clock, bar, score | y 24 | the top row, as the lane's | `lane-layout` |
| guide text | (195, 68) | wrap 340, 2 lines, height 56: y 40 to 96 | new (was y 56, 60 high) |
| shed picture | (195, 198) | 300 x 200: x 45 to 345, y 98 to 298 | new |
| wisp, choosing | (195, 370) | tap area 96 x 96 | `lane-layout` |
| wisp, after the hand-over | (120, 318) | below the door | new |
| message, choosing | (195, 454) | wrap 340, height 60 | `lane-layout` |
| message, after the hand-over | (195, 380) | wrap 340, height 60 | `lane-layout` |
| closing line panel and text | (195, 448) | 340 x 64 | `lane-layout` |
| button | (195, 528) | 300 x 80 | `lane-layout` |
| tool cards, upper row | x 75, 195, 315; y 690 | 96 x 92 | the lane's color-card row |
| tool cards, lower row | x 135, 255; y 788 | 96 x 92 | the lane's object-card row |
| button back to the title | (347, 788) | 80 x 80: x 307 to 387 | new |
| end screen: the second button | (195, 634) | 300 x 80 | new |
| end screen: the wisp, with two buttons | (195, 776) | scale 1.8 | new (trial 1's is at y 690) |
| title's shed button | (195, 736) | 300 x 80 | unchanged |

The hero starts at (195, 612) as in the lane: the strip y 568 to 644 is free between the button and the tool
row. The button back to the title is 4 px from the ladder's card; it is a deliberate trade (REQ-5.10: no
target under 80 x 80, nothing overlapping) and is listed in the risks.

Inside the shed picture (offsets from its center; the picture is one drawing, redrawn from the view):

| part | local position | note |
|---|---|---|
| roof | gable from (-130, -30) to (0, -95) to (130, -30) | |
| wall | x -110 to 110, y -30 to 90 | planks |
| door | x -80 to -10, y 0 to 90 | shut: planks. open (every puzzle but `roof`): swung out to the left, the doorway dark |
| window | x 25 to 85, y 5 to 55 | the cat's face is in it while the cat is inside; empty in `roof` and when the cat is out |
| lock | (-22, 45) | `lock` only: closed while stuck, open once freed |
| leaves | x -87 to -3, y 63 to 93 | `leaves`, while stuck: twelve ovals in four colors against the door's foot |
| planks | two, 96 x 14, at y 24 and 66 | `boards`, while stuck: nailed across the door |
| rope | three bands at y 30, 52, 74 and a knot at (-45, 52) | `rope`, while stuck |
| cat on the roof | (-100, -67), 36 wide | `roof`, while stuck: on the left slope, clear of the guide |
| cat outside | sitting at (128, 62), 36 wide | freed only |
| star | (128, 14), radius 14 | freed only (existing `drawStar`) |
| tried tool | 44 px at a spot per puzzle: (-38, 45) lock, (-45, 56) leaves, (-45, 45) boards and rope, (-100, 0) roof | after the hand-over, whichever tool |

The probe points the smoke samples (the door's upper corner, the window's centre, the cat's body outside and on
the roof, the star, and one point on each of leaves, boards and rope) are named in `shed-layout.ts`, so the
smoke and the drawing use one set of numbers.

### View (`shed-view.ts`)

`shedView(state)` returns plain data; the scene draws it:

```ts
type ShedView = {
  guide: string;                           // the round's puzzle: what is wrong, and what to do
  message: string;
  messageAt: Point;
  button: { text: string; event: ShedEvent } | null;   // "Next puzzle" after freed, "Try another tool" after stuck
  armed: boolean;
  tools: { id: ToolId; label: string; picked: boolean; alpha: number }[];   // five
  picture: { puzzle: PuzzleId; solved: boolean; tool: ToolId | null; star: boolean };
  lesson: string | null;                   // freed only, the puzzle's own closing line
  wispAlpha: number;
  wispTarget: Point;
  leave: string;                           // the label of the button back to the title
};
```

`picture` is derived from the puzzle, the result and the tried tool only. `hudView(state)` (from `lane-view.ts`)
gives the clock, the bar and the score text; it changes every frame, so it is not part of `shedView`.

### Scene (`scenes/ShedScene.ts`) and art (`ui/`)

Thin, like `LaneScene`: create the objects from the layout, subscribe to the game, render `shedView`, dispatch
`PickTool`, `GiveTool`, the button's event and `LeaveShed`, move the wisp with `stepToward`, and dispatch `Tick`
from `update` with `tickMs(delta)`. A freed cat pops the points. The fields are reset in `create`, because
Phaser reuses the scene object. The hero floor drag is the lane's.

Drawing is code only: `ui/shed-art.ts` (the shed, the door, the lock, the obstacles, the cat on the roof),
`ui/cat.ts`, `ui/tools.ts` (key, broom, hammer, scissors, ladder), `ui/tool-card.ts`, and two new small
widgets, `ui/hud.ts` (the top row) and `ui/leave-button.ts`. Colors the smoke samples are in
`shed-palette.ts` (numbers only, no Phaser). The tools differ by outline. Stuck and freed differ by the
obstacle, the door, the cat's place and the star. Motion is small and not needed to read the result.

## Reuse and alternatives

| need | reused | alternative and why not |
|---|---|---|
| state and events | `reduce`, `GameState`, `GameEvent`, `createGame`, `window.__game` | a second store: not needed |
| the clock, score, streak, best | `Run`, `scoreSearch`, `runDown`, `finishRun`, `restartRun`, `hudView` | a clock of the shed's own: two clocks to keep equal, and INV-15 to INV-17 twice |
| the end screen | `OverScene` and `overView` with a list of buttons | an end screen of the shed's own: a second copy of the score, the best and the lock; `phase` `over` already means "the clock is zero" |
| shed rules | the `reduceLane` pattern: a small reducer that returns its input when nothing changes | adding the tools to `Lane`: forces tools into a type built for color and object |
| events | `PickTool`, `GiveTool`, `RetryShed`, `StartShed`, and new `LeaveShed` | reusing `Start` for the shed's replay: it starts trial 1 |
| the order of the puzzles | a seed and `puzzleAt`, as the field's `fakesOf` | `Math.random` in the reducer (breaks ADR 0001); a fixed order (the child learns it by heart in one run, which is the problem of revision 1 in a new form) |
| trial choice | `trial` number | a new `phase`: widens INV-1 and every `phase` switch |
| layout | `lane-layout.ts` positions for the top row, wisp, message, result, closing line, button | a copy of those numbers: two sources for one layout |
| cards | the look of `createCard` | making `createCard` generic: a change to working trial 1 code |
| property and model tests | `checkProperty`, `checkModel` | none |
| smoke | `tapper`, `clicker`, `pressUntil`, `pixels.ts`, `collectErrors`, `expectBundledFont` | none; the seed is set with an init script that replaces `Math.random` for the next draw |
| pixel reading | `e2e/pixels.ts` | a screenshot library: a new dependency |

## Test plan and traceability

| layer | what | requirement |
|---|---|---|
| unit (`shed.test.ts`) | the tools, puzzles and answers; `puzzleAt` for several seeds; `reduceShed` for each event in each stage; `opensDoor` is now `solves`; the retry after stuck and freed | REQ-5.2 to 5.7 |
| unit (`reducer.test.ts`) | `StartShed` from the title and the shed's end screen only; `LeaveShed`; shed events outside the shed; trial 1 events in the shed; `Start` and `SetLang` in the shed; the clock, the score and the best; trial 1's `Start` drops the shed | REQ-5.1, 5.7, 5.9, 5.16 |
| property (`shed.pbt.test.ts`) | INV-3 and INV-4 with shed events; INV-15 to INV-24 for the shed; INV-40 to INV-43; coverage: every tool handed over and freeing the cat, a pick replaced, a retry after each result, several rounds, time up, play again, the way back | REQ-5.9, 5.13 |
| model (`shed.model.test.ts`) | the state space and goals above; deliberate breaks | REQ-5.6, 5.13, 5.16 |
| content (`shed-content.test.ts`) | same keys; one `{0}` where it belongs; Japanese rules for every tool; English line length; no blame words; no claims about real AI or real keys; the closing line is its own text | REQ-5.8, 5.12 |
| view (`shed-view.test.ts`, `over-view.test.ts`, `title-view.test.ts`) | per puzzle, stage and language: message, button, armed, tools and marks, picture, lesson only on freed, wisp target; the end screen's buttons; the title's captions | REQ-5.1 to 5.8, 5.16 |
| layout (`shed-layout.test.ts`, `route.test.ts`) | inside the canvas, no overlap in each stage, targets of 80 or more, the hero strip free, the cat on the roof clear of the guide, obstacles on the door and off the probes; the scene follows `trial` | REQ-5.9, 5.10 |
| mutation | any surviving mutant fails | REQ-5.13, 5.15 |
| mobile smoke (`smoke.mobile.shed.spec.ts`) | real taps; the paths in REQ-5.14; pixels for the obstacle, the door, the cat, the tool names, the closing line, the clock and the score; ja and en screenshots; offline; time up, play again, the way back | REQ-5.1 to 5.16 |
| desktop smoke (`smoke.desktop.shed.spec.ts`) | the same with the mouse; a held press on a tool leaves the hero still | REQ-5.10, 5.14 |

`tasks.md` carries the requirement, test and result for each task.

### How the smoke sees the picture

The shed is drawn on the canvas, so the DOM has no copy of it and a state that says `freed` would pass even if
the obstacle never went away. The smoke samples named points of a screenshot (`shed-layout.ts`) and compares
them with colors from `shed-palette.ts`: the door's upper corner is door wood when shut and the dark doorway
when open; the window's centre is the cat's fur when the cat is inside and the dark window when not; the
point on the cat's body outside, and the one on the roof, are fur when the cat is there; the star's point is
gold only when freed; and one point on each of the leaves, the boards and the rope is the color of the
obstacle while it is there. Text is counted as light pixels in the message and closing-line boxes, as trial 1's
smoke does, with a fingerprint that differs between Japanese and English, between two puzzles' guides, and
between a score of 0 and 100. The score is drawn in the star's gold and is counted as gold pixels. The pixel
reading uses `node:zlib` only.

The order of the puzzles comes from the seed. The game draws it with `newSeed()` (`Math.random`) on the press
that starts a run, so the smoke adds an init script before `page.goto` that makes the next `Math.random`
return a number the test sets (`window.__nextSeed`), once. The test then plays a known puzzle with real
taps, and the real game still draws a random seed.

## Decisions and alternatives

- **"Each taku" is read as each puzzle and each choice.** The comment says to make three choices five and to give
  "each taku" its own answer. The word is written with the character for a table; it is read the same as the
  character for a choice (a typo of the same sound), and could also mean a question. The readings meet: five
  tools are the five choices, five puzzles are the questions, and the answer table is one-to-one, so every
  tool is the answer to exactly one puzzle and every puzzle has exactly one answer. If the maintainer meant
  something else, the table in `shed.ts` is the one place that changes. Recorded in the pull request, Decisions.
- **Five puzzles with one answer each, not a pool of questions.** A larger pool needs more art and more
  strings; five fills the five tools and keeps every tool useful once a run.
- **The order is a seed, a start and a step, not a shuffle.** 20 orders are enough for a 60-second run (about 10
  rounds at most), the function is short enough for every mutant to be killed, and it never repeats a puzzle
  in a row. A shuffle needs a loop and a swap with more places to hide a bug.
- **The shed reuses `Run` and the end screen.** The alternative is a clock of its own in `Shed`. It would mean a
  second `Tick` rule, a second score, a second best, and INV-15 to INV-17 stated twice. `phase` `over` with
  `trial` 2 costs one condition in the end screen's view.
- **A wrong tool does not cost time or tools.** The clock runs while the child tries again; the only price is
  the streak. A penalty in seconds would punish exactly the exploring the trial is for.
- **No automatic move to the next puzzle** (as in `04`, "Why not auto-advance"): the button stays, the child reads
  at their own pace, and the clock is the pressure.
- **`StartShed` is accepted from the title and from the shed's own end screen.** From trial 1's end screen the
  child plays trial 1 again; there is no shed button there.
- **The button back to the title is always on screen,** at the cost of an accidental tap ending the run. The
  alternative, a button on the end screen only, makes the child wait up to 60 seconds. The run that is left does
  not count as finished, so a stray tap loses at most the run in progress. The button is at the far end of the
  lower row, away from the upper row where most taps go.
- **The title ignores taps for 700 ms after the shed sends the child back** (as for the field), so a double tap on
  the leave button does not start trial 1.
- **Trial 1's end screen has no way back to the title.** The comment was about trial 2; adding one is a separate
  change to a spec that is finished.
- **`StartShed` has an optional seed,** so existing callers and tests keep working and play the fixed order
  that starts with the lock.
- **Tool names are in `strings`, not `cards.json`.** The kid gate checks every `strings.ja.json` value
  and `cards.json` labels; `cards.json` is the file of trial 1's cards, which the content test pins to the
  domain's colors and objects.
- **The wisp's new place is below the door**, not on the door, so the door and the obstacle stay visible for
  the result and the pixel check.
- **The model's `expected`, `plays` and `scoreOk`** are in the test, not in `GameState`: the game has no use for them.

## Risks

- WebKit does not start in the authoring sandbox (missing system libraries; `docs/evidence/didnt-work.md`).
  The mobile smoke runs there on Chromium with the iPhone 13 touch profile, labelled as such; the real
  WebKit run is CI's. A task is not called done until CI's smoke is green.
- The mobile smoke plays in real time against a 60-second clock. Each test is kept to a few puzzles, and is
  split before it takes more than about half of a run; a slow runner could still end a run early. The time-up
  test uses `dispatch` for the jump to the end, as trial 1's does.
- The button back to the title is close to the ladder's card (4 px) and to where a child's thumb rests. If a
  playtest shows stray exits, move it to the top row or ask for a second tap.
- A child may read a stuck result as "the hammer is bad". The words only say what was used and what is still
  there; the next playtest should note whether children try the same tool again and whether the order of the
  puzzles is too hard to follow in 60 seconds.
- The art is code and is judged by eye in the screenshots; the five puzzles may need a second pass after the
  first look on a real phone (the cat on the roof is small).
- The score pop-up and the HUD repeat 25 lines of `LaneScene`'s HUD in `ui/hud.ts` instead of changing trial 1's
  scene. The two can share it later.
