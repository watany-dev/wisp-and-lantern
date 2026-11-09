# Design: Trial 2, The Locked Shed

Implements `requirements.md` (REQ-5.n). Follows ADR 0001 (pure reducer), ADR 0003 (gates) and the layout
rules in `.kiro/steering/structure.md`. No new dependency, no new asset, no new ADR: the reducer stays
pure and the scenes stay thin, which is what ADR 0001 and 0003 already say.

## What the child does

```text
title --tap the shed button--> choosing --PickTool--> choosing (0 or 1 tool)
                               choosing --GiveTool, a tool picked--> tried (open | shut)
                               choosing --GiveTool, none picked--> choosing (same state)
                               tried    --RetryShed--> choosing (nothing picked)
```

`tried` with `open` is the success. The retry button after `open` plays the shed again, so `RetryShed`
has one meaning: back to a fresh choosing. A tap on the title anywhere else still starts trial 1.

## Domain (`src/domain/`)

### State

`GameState` gains one field and no new `phase`:

```ts
// shed.ts
export const tools = ["key", "broom", "hammer"] as const;
export type ToolId = (typeof tools)[number];
export type Shed = { stage: "choosing"; pick: ToolId | null } | { stage: "tried"; tool: ToolId };
export const initialShed: Shed = { stage: "choosing", pick: null };

// state.ts
export const trials = { lane: 1, shed: 2 } as const;
export type GameState = { /* as before */ shed: Shed };
```

Why this shape:

- **The selection and the result are one value.** `choosing` holds the pick (none or one tool, so "at
  most one" cannot be broken: it is a single field). `tried` holds the tool that was handed over; it
  has no pick of its own. The tried tool is the pick, locked at the moment of `GiveTool`. A flat
  `{ pick, given }` would allow `given` with no pick, and a `{ pick, tried }` pair could drift. The
  outcome is not stored: it is derived from the tried tool (`opensDoor`). This is REQ-5.9.5.
- **`phase` stays `title | trial | over`.** The shed is `phase` `trial` with `trial` 2. A new phase would widen
  INV-1 and every scene that switches on `phase`. The scene follows `trial` instead (below).
- **`shed` is always present.** It is `initialShed` everywhere except while `trial` is 2 (INV-23).

### Functions (`shed.ts`)

```ts
export function opensDoor(tool: ToolId): boolean;       // tool === "key": the fixed rule (REQ-5.5)
export type ShedOutcome = "choosing" | "open" | "shut";
export function shedOutcome(shed: Shed): ShedOutcome;    // choosing | open (key) | shut
export function triedTool(shed: Shed): ToolId | null;    // the tool of a tried stage, else null
export function canGive(shed: Shed): boolean;            // choosing with a tool picked
export function reduceShed(shed: Shed, event: ShedEvent): Shed; // returns `shed` itself when nothing changes
```

`reduceShed`:

- `PickTool { tool }`: in `choosing`, `pick` becomes `tool` (the same object when it already is); in `tried`, no change.
- `GiveTool`: in `choosing` with a pick, `{ stage: "tried", tool: pick }`; with no pick, or in `tried`, no change.
- `RetryShed`: in `tried`, `initialShed`; in `choosing`, no change.

There is no branch that corrects a tool, picks a default or takes a tool that was not handed over.

### Events (`events.ts`) and the reducer

```ts
export type ShedEvent = { type: "PickTool"; tool: ToolId } | { type: "GiveTool" } | { type: "RetryShed" };
export type GameEvent = /* as before */ | { type: "StartShed" } | ShedEvent;
```

Where each event applies. "same" means the same state object is returned. The trial 1 columns are what
the code does today; the changes are marked.

| event | `title` | trial 1 (`phase` `trial`, `trial` 1) | trial 2 (the shed) | `over` |
|---|---|---|---|---|
| `Start` | begins a run (trial 1) | language only | language only (**new case, same code**) | begins a run |
| `StartShed` (**new**) | `phase` `trial`, `trial` 2, `shed` initial; `run` and `lane` untouched | same | same | same |
| `Tick` | same | clock down; at zero the run ends | same (**changed: guard by `trial`**) | same |
| `Ask`, `PickCard`, `Retry` | same | the lane rule | same (**changed: guard by `trial`**) | same |
| `PickTool`, `GiveTool`, `RetryShed` (**new**) | same | same | `reduceShed` | same |
| `SetLang`, `MoveHeroTo` | as before | as before | as before | as before |

`reducer.ts` adds a helper `inTrial(state, n)` = `state.phase === "trial" && state.trial === n`. `Ask`,
`PickCard`, `Retry` and `Tick` test `inTrial(state, trials.lane)`; the shed events test
`inTrial(state, trials.shed)`. `start` uses `trials.lane` instead of the literal 1. Nothing else in the
reducer changes, and `ask` still scores through `scoreSearch`.

### Result table (REQ-5.5)

| handed over | `shedOutcome` | door | lock | cat | star | message (key) | button |
|---|---|---|---|---|---|---|---|
| (none, choosing) | `choosing` | shut | shut | inside, at the window | no | `shed.pick` or `shed.ready` | none |
| key | `open` | open | open | outside, by the shed | yes | `shed.open` | `shed.again` |
| broom | `shut` | shut | shut | inside | no | `shed.shut` | `shed.retry` |
| hammer | `shut` | shut | shut | inside | no | `shed.shut` | `shed.retry` |

The three results are the only results. The rule has no randomness, no state beyond the tried tool, and
no language or timing input.

### Why only the key opens (REQ-5.8.6)

The trial is a staged scene for one idea (L2): the wisp can do only what the tool it is given allows.
To let a 6-year-old feel that, the shed has one lock and one tool that fits it, and the wisp tries
exactly what it is handed. This is a fixed rule of the game, not a claim about real AI:

- A real agent with the right tool can still fail, and a real hammer can break a lock. The game does not
  say either of these. It does not say the broom or the hammer "cannot" open doors, only that here, in
  this shed, the door stayed shut. No other solution is offered, because a second solution would make
  the child choose by guessing what is allowed, not by what the wisp was given.
- The second half of L2 (too much power causes accidents) is not shown. Nothing is broken, and the
  cat is never in danger.
- The key belongs to the game's shed. The words never ask the child to give a real house key, a
  password or a private thing to an AI. That is L4 and is not explained here.

### Invariants

The seven new ones are in `requirements.md`. Their scope with respect to the existing ones:

| id | covers | with the shed |
|---|---|---|
| INV-1, INV-2 | `phase`, `trial` | global; `trial` may be 2. Unchanged, re-run with the shed events |
| INV-3, INV-4 | no mutation, determinism | global. Unchanged, **re-run over sequences that contain the shed events** (`shed.pbt.test.ts`) |
| INV-5, INV-8 to INV-14 | trial 1's lane | trial 1 only by definition. They hold on every sequence, including the shed events, because INV-23 and INV-24 keep `lane` untouched in the shed. Unchanged |
| INV-15 to INV-17 | trial 1's run | trial 1 only. "A trial has time left" holds in the shed because the clock is never counted down (INV-24). Unchanged |
| INV-18 to INV-22 | the shed's pick, hand-over, result, retry | new, `shed.pbt.test.ts` |
| INV-23, INV-24 | the shed and trial 1 cannot touch each other | new, `shed.pbt.test.ts` |

`domain-invariants.md` gets a line for this scope and seven rows. No id is retired or renumbered, and no
test of trial 1 is changed.

### Model check (`shed.model.test.ts`)

Scope: the entrance from the title by the shed button, and every state after it. It is not "every
state of trial 1 can reach the shed" (the child gets to the shed only from the title, and the shed has no
exit), and it does not remove any state of the shed to pass. The trial 1 model checks stay as they are
and keep their alphabet.

The alphabet is finite and includes events that must not matter:

- on the title: everything except `Start` (a `Start` from the title is trial 1's entrance, which
  has its own model check): `StartShed`, `SetLang` (ja, en), `MoveHeroTo` (two positions), the shed
  events, `Ask`, `PickCard`, `Retry`, `Tick`.
- after the entrance: all of the above plus `Start`, `Start` with a language, and `Tick` with a small
  and a run-ending number of milliseconds.

The model wraps the real reducer's state with two things that are not part of the game: `expected`, the
tool the child last picked in this attempt (set by `PickTool`, cleared by `RetryShed` and `StartShed`),
and `plays`, the number of success results so far, capped at 2. They let state invariants check the
transitions: a choosing state has exactly the expected pick, and a tried state has exactly the expected
tool. A swapped tool or a second tool breaks them.

| check | what |
|---|---|
| invariants | `phase`/`trial`/`shed` agree (`shed` initial outside trial 2; trial 2 in `trial`); lane and run stay initial in the shed; a choosing state's pick is the expected pick; a tried state's tool is the expected tool; open iff the tried tool is the key |
| goal 1 | from every state the key's `open` result is reachable (soft-lock) |
| goal 2 | from every state a fresh choosing (nothing picked) in the shed is reachable |
| goal 3 | from every state, a second success is reachable (`plays` 2): the replay after a success |
| witnesses | the shortest trace to a key `open`, to a broom `shut` and to a hammer `shut`, from an invariant that says "not this state" (the report's counterexample is the evidence) |
| number of states | recorded in the test and in the Result line of task 3.1 |

It must fail when the rules are broken on purpose, and the counterexamples are kept in the test:

| deliberate break | which check fails | counterexample |
|---|---|---|
| the key's hand-over is ignored (the key cannot open the door) | goal 1 is stuck in every state | the start state, trace empty |
| `RetryShed` is ignored | goal 1 is stuck | a tried broom (the first found), trace `StartShed, PickTool broom, GiveTool` |
| `RetryShed` is ignored after a success | goal 3 is stuck from the start, while goal 1 still passes | the start state; from a success itself, the tried key with an empty trace |
| `GiveTool` hands over the key whatever was picked | the tried-tool invariant | `StartShed, PickTool broom, GiveTool` |
| `PickTool` keeps the first pick | the pick invariant | `StartShed, PickTool key, PickTool broom` |
| `Tick` runs the clock in the shed | the run invariant | `StartShed, Tick 1000` |

The break is a wrapper `step` around the real `reduce`, as in the trial 1 check; no source is edited for it.
The test asserts the real traces; the Result line of task 3.1 records them.

## Content (`src/content/`)

A `shed` group is added to `strings.ja.json` and `strings.en.json` under the same keys. `{0}` is the
tool name (a digit, because the kid gate rejects Latin letters in Japanese). `⏎` is a line break.

| key | ja | en | used |
|---|---|---|---|
| `shed.enter` | ねこを たすけよう | Free the cat | the title's shed button |
| `shed.guide` | どうぐを わたして⏎ねこを たすけよう | Hand over a tool⏎to free the cat | the top line, always |
| `shed.pick` | どうぐを ひとつ⏎えらんでね | Pick one tool | choosing, nothing picked |
| `shed.ready` | ウィスプを タップして⏎{0}を わたそう | Tap the wisp to⏎hand over the {0} | choosing, a tool picked |
| `shed.open` | ねこが でてきた！⏎{0}を つかったよ | The cat is out!⏎The wisp used the {0} | open result message |
| `shed.shut` | {0}を つかったよ⏎とびらは あかなかった | The wisp used the {0}⏎The door stayed shut | shut result message |
| `shed.lesson` | {0}を わたしたら⏎あけられたね | You gave a {0}⏎It opened the door | closing line, open only |
| `shed.again` | もういちど あそぶ | Play again | button after open |
| `shed.retry` | ほかの どうぐを ためそう | Try another tool | button after shut |
| `shed.tools.key` | かぎ | key | the label |
| `shed.tools.broom` | ほうき | broom | the label |
| `shed.tools.hammer` | ハンマー | hammer | the label |

Why these words:

- **Guide.** It states the whole task in one sentence and names one tool, so "one is enough" is true
  before the child touches anything. `ready` repeats the chosen tool's name, which confirms the pick in
  words as well as by the frame (hard rule 7).
- **The message and the closing line are different texts.** The message says what happened and which
  tool the wisp used (`The cat is out! The wisp used the key`). The closing line says why it worked from
  the child's side (`You gave a key, so it opened`). They share no sentence, which is what REQ-5.8 asks for.
  Both take the tool name from the tried tool, so they cannot name two different tools.
- **`shut` states the fact.** "The door stayed shut" / `とびらは あかなかった` is a plain observation. It has no
  "wrong", "bad", "no", "fail" and none of their Japanese counterparts, and it is not hidden. The
  button says what to do next (`Try another tool`), not what went wrong.
- **The closing line.** The request gave `かぎを わたしたら` / `あけられたね` and `You gave a key` / `It opened
  the door` as directions. After the manual kid-reader pass (the `kid-reader` agent is not runnable from
  this session; the rubric in `.kiro/agents/kid-reader.md` was applied by hand, and the result goes in the
  task 4.1 pull request): the Japanese is kept; `あけられたね` ("you could open it") says the ability came
  from the hand-over, which is the L2 point, and the line has 10 characters at most. The English is kept
  too. It is two short sentences in the order the child did them (gave, then it opened), and "it" is the
  wisp, which the message above it has just named. One line is 18 characters, so the English closing line
  is longer than trial 1's (12). Trial 1's limit of 12 is a limit of its own key (`lane.lesson`); for
  this key the layout is the limit (a 320 px wrap at 22 px; checked on the screen in task 7.1, and the
  test allows 20 characters per English line). The next playtest should check whether children read
  "it" as the wisp.
- **No claim about real AI.** No string says a tool always works, that AI can do anything with the right
  tool, that it knows everything, or that it is a friend. A content test checks this with the same
  word lists as trial 1's, plus house, key-of-a-house and password words.

A content test renders every message that takes a tool name with all three Japanese names and applies the
Japanese rules (no kanji, no Latin letters, 12 characters, 2 lines). `lane` and `run` strings are not
changed.

## Game (`src/game/`)

### Entrance and scene choice

- `TitleScene` gets one button: a gold panel (`drawButton`) with a small key picture and `shed.enter`,
  at the center (195, 736), 300 x 80. The existing handler "any press starts the game" becomes "a press
  that hit no object starts the game" (Phaser passes the objects under the pointer to a scene-level
  handler; `LaneScene` already uses this to separate the floor from the objects). The button's own
  handler dispatches `StartShed`. So a tap on the button reaches `StartShed` only; a tap elsewhere
  reaches `Start` only. If both ran anyway, only the first would have an effect: after `StartShed`, a
  `Start` sets the language only, and after `Start`, a `StartShed` is ignored because the game has left
  the title. The scene still tests the objects under the press, so the outcome does not depend on which
  handler Phaser runs first.
- `route.ts` (new, plain, unit-tested): `sceneFor(state)` returns `"title"`, `"lane"`, `"shed"` or
  `"over"` from `phase` and `trial`. The title scene starts `sceneFor(state)` when the phase is no
  longer `title`; the shed scene starts nothing (it has no exit).
- `boot.ts` registers `ShedScene`.

Scene transitions:

| from | event | to |
|---|---|---|
| title | `Start` (tap outside the button) | lane (trial 1, as before) |
| title | `StartShed` (tap the button) | shed |
| lane | time up | over (as before) |
| over | `Start` | lane (as before) |
| shed | `GiveTool`, `RetryShed`, `PickTool` | shed (the same scene re-renders) |
| shed | (no exit) | reload returns to the title |

### Layout (`shed-layout.ts`; the rest comes from `lane-layout.ts`)

All numbers are game pixels on the 390 x 844 canvas. The shed uses the lane's wisp, message, result,
closing line and button positions, so trial 1's layout and its tests are untouched.

| thing | center | size | from |
|---|---|---|---|
| guide text | (195, 56) | wrap 340, 2 lines | new |
| shed picture | (195, 198) | 300 x 200: x 45 to 345, y 98 to 298 | new |
| wisp, choosing | (195, 370) | tap area 96 x 96 | `lane-layout` |
| wisp, after the hand-over | (120, 320) | below the door | new |
| message, choosing | (195, 454) | wrap 340, height 60 | `lane-layout` |
| message, after the hand-over | (195, 380) | wrap 340, height 60 | `lane-layout` |
| closing line panel and text | (195, 448) | 340 x 64 | `lane-layout` |
| button | (195, 528) | 300 x 80 | `lane-layout` |
| tool cards | x 75, 195, 315; y 690 | 96 x 92 | new (the lane's color-card row) |
| title's shed button | (195, 736) | 300 x 80: y 696 to 776 | new |

The hero starts at (195, 612) as in the lane: the strip y 568 to 644 is free between the button and the
tool row. After the hand-over the wisp has left (195, 370), so the message and the closing line use the
same space as in trial 1; the wisp's new place (120, 320) is above the message and below the shed.

Inside the shed picture (offsets from its center; the picture is one drawing, redrawn from the view):

| part | local position | note |
|---|---|---|
| roof | gable from (-130, -30) to (0, -95) to (130, -30) | |
| wall | x -110 to 110, y -30 to 90 | planks |
| door | x -80 to -10, y 0 to 90 | shut: planks with a lock at (-22, 45). open: swung out to the left (a parallelogram at x -108 to -80), the doorway dark, the lock hanging open |
| window | x 25 to 85, y 5 to 55 | shut result and choosing: the cat's face is in it. open: empty, dark |
| cat outside | sitting at (128, 62), 36 wide | open only |
| star | (128, 14), radius 14 | open only (existing `drawStar`) |
| tried tool | at the lock, 44 px | after the hand-over, whichever tool |

The probe points the smoke samples (the door's upper corner, the window's center, the cat's body outside,
the star) are named in `shed-layout.ts` so the smoke and the drawing use one set of numbers.

### View (`shed-view.ts`)

`shedView(state)` returns plain data; the scene draws it:

```ts
type ShedView = {
  guide: string;
  message: string;
  messageAt: Point;                       // choosing text before the hand-over, result text after
  button: { text: string; event: ShedEvent } | null;
  armed: boolean;                          // the wisp can be handed a tool: ask ring on
  tools: { id: ToolId; label: string; picked: boolean; alpha: number }[];
  picture: { door: "shut" | "open"; cat: "inside" | "outside"; tool: ToolId | null; star: boolean };
  lesson: string | null;                   // open result only
  wispAlpha: number;                       // dimmed while nothing is picked
  wispTarget: Point;                       // home before the hand-over, below the door after
};
```

`message` and `lesson` come from `strings[lang].shed`, with `{0}` replaced by the tried or picked tool's
label. `picture` is derived from `shedOutcome` and the tried tool only. `tools[].alpha` fades the
tools that were not handed over after the hand-over, as the lane fades unpicked cards. The view
does not depend on time or on a drawing.

### Scene (`scenes/ShedScene.ts`) and art (`ui/`)

Thin, like `LaneScene`: create the objects from the layout, subscribe to the game, render `shedView`,
dispatch `PickTool`, `GiveTool` and the button's event, move the wisp with `stepToward`. It dispatches
no `Tick`, so nothing in the shed counts time. The fields are reset in `create`, because Phaser reuses
the scene object. The hero floor drag is the lane's: a press that hit no object walks the hero, a press
on a tool, the wisp or the button does not (`walks` flag from `over.length`).

Drawing is code only (`ui/shed-art.ts` for the shed with its door, lock and window; `ui/cat.ts`; `ui/tools.ts`
for the key, the broom and the hammer; `ui/tool-card.ts` for the card widget). Colors the smoke samples are
in `shed-palette.ts` (numbers only, no Phaser), which `e2e/` can import in Node, as it does for
`ui/text.ts`. The tools differ by outline: a key (round bow, long shaft, teeth), a broom (long handle,
wide brush), a hammer (handle, block head). Shut and open differ by the door, the lock, the cat's
place and the star. Motion is small and not needed to read the result: the wisp flies to its place; the
tried tool turns or taps once at the lock.

## Reuse and alternatives

| need | reused | alternative and why not |
|---|---|---|
| state and events | `reduce`, `GameState`, `GameEvent`, `createGame`, `window.__game` | a second store: not needed |
| shed rules | the `reduceLane` pattern: a small reducer that returns its input when nothing changes | adding the tools to `Lane` (a six-slot lane of color and object): forces tools into a type built for color and object, and breaks INV-8 to INV-14 |
| events | new `PickTool`, `GiveTool`, `RetryShed` | reusing `PickCard`, `Ask`, `Retry`: a shared name makes a trial 1 test or a trial 2 handler able to act on the wrong state. The cost is three more event names |
| trial choice | `trial` number | a new `phase`: widens INV-1 and every `phase` switch |
| layout | `lane-layout.ts` positions for wisp, message, result, closing line, button | a copy of those numbers: two sources for one layout |
| cards | the look of `createCard` (face, label, picked mark) | making `createCard` generic: a change to working trial 1 code for a trial that needs a different art function; `tool-card.ts` repeats about 15 lines instead |
| background, camera, text, wisp, hero, button, star, picked mark | `drawBackground`, `fitCamera`, `textStyle`, `createWispArt`, `createHero`, `drawButton`, `drawStar`, `drawPickedMark`, `drawCardFace` | none needed |
| property and model tests | `checkProperty`, `checkModel` | none |
| smoke | `tapper`, `clicker`, `pressUntil`-style helpers, `pixels.ts`, `collectErrors`, `expectBundledFont` | none; `pressUntil` becomes an export |
| pixel reading | `e2e/pixels.ts` | a screenshot library: a new dependency |

## Test plan and traceability

| layer | what | requirement |
|---|---|---|
| unit (`shed.test.ts`) | `reduceShed` for each event in each stage; `opensDoor` for each tool; `shedOutcome`; `canGive`; a pick replaced; a pick is not a hand-over; a hand-over with none picked; the lock | REQ-5.3 to 5.6 |
| unit (`reducer.test.ts`) | `StartShed` from the title only; shed events outside the shed; trial 1 events and `Tick` in the shed; `Start` and `SetLang` in the shed; the run and lane untouched | REQ-5.1, 5.7, 5.9 |
| property (`shed.pbt.test.ts`) | INV-3 and INV-4 with shed events; INV-18 to INV-24; coverage: every tool handed over, a pick replaced, a retry after each result, a replay after a success | REQ-5.9, 5.13 |
| model (`shed.model.test.ts`) | the state space and goals above; deliberate breaks | REQ-5.6, 5.13 |
| content (`shed-content.test.ts`) | same keys; one `{0}` where it belongs; Japanese rules for every tool; English line length; no blame words; no claims about real AI or real keys; the closing line is its own text | REQ-5.8, 5.12 |
| view (`shed-view.test.ts`) | per stage and language: message, button, armed, tools and marks, picture, lesson only on open, wisp target; ja/en | REQ-5.2 to 5.8 |
| layout (`shed-layout.test.ts`, `route.test.ts`) | inside the canvas, no overlap in each stage, targets of 80 or more, the hero strip free; the scene follows `trial` | REQ-5.9, 5.10 |
| mutation | any surviving mutant fails | REQ-5.13, 5.15 |
| mobile smoke (`smoke.mobile.shed.spec.ts`) | real taps; the paths in REQ-5.14; pixels for the door, the cat, the tool names and the closing line; ja and en screenshots; offline | REQ-5.1 to 5.14 |
| desktop smoke (`smoke.desktop.shed.spec.ts`) | the same with the mouse; a held press on a tool leaves the hero still | REQ-5.10, 5.14 |

`tasks.md` carries the requirement, test and result for each task.

### How the smoke sees the picture

The shed is drawn on the canvas, so the DOM has no copy of it and a state that says `open` would pass
even if the door never drew. The smoke samples named points of a screenshot (`shed-layout.ts`) and
compares them with colors from `shed-palette.ts`: the door's upper corner is door wood when shut and
the dark doorway when open; the window's center is the cat's fur when the cat is inside and the dark
window when not; the point on the cat's body outside is fur when it is out; the star's point is gold only
on `open`. Text is counted as light pixels in the message and closing-line boxes, as trial 1's smoke does,
with a fingerprint that differs between Japanese and English. The pixel reading uses `node:zlib` only.

## Decisions and alternatives

- **One value for pick and result.** A union of `choosing` and `tried` (above).
- **Guard by `trial`, not by a new phase.** INV-1 keeps its three phases; the cost is one helper in the
  reducer and a test per trial 1 event that it does nothing in the shed.
- **Separate events.** `PickTool`, `GiveTool`, `RetryShed` and `StartShed` cost four names and remove the
  chance of cross-trial effects.
- **The title button is an object, not a new screen.** The title already exists; a selection screen is a
  router and is out of scope.
- **`StartShed` is accepted from the title only.** From the end screen the child plays trial 1 again;
  there is no shed button there.
- **No exit from the shed.** A "back" button needs a new event (`Leave`), a title return that resets
  `shed`, and a decision about the run. It is a different feature (a trial-select screen); this spec
  leaves it out, and REQ-4.6.2 is scoped to trial 1 in `requirements.md`. The child plays the shed again
  with its own button, and reloading the page returns to the title. Listed under "Found, not fixed".
- **Tool names are in `strings`, not `cards.json`.** The kid gate checks every `strings.ja.json` value
  and `cards.json` labels; `cards.json` is the file of trial 1's cards, which the content test pins to the
  domain's colors and objects. A second file would also need its own gate.
- **The wisp's new place is below the door**, not on the door, so the door and the lock stay visible for
  the result and the pixel check.
- **The English closing line is longer than 12 characters** (see Content). The alternative is
  `You gave a key` / `So it could open`, 17 characters, no shorter, and with an "it" for the door.
  A shorter pair such as `A key let it` / `open the door` is awkward for a child. The layout test and the
  screenshots decide; the first playtest should note how children read it.
- **The model's `expected` and `plays`** are in the test, not in `GameState`: the game has no use for them.

## Risks

- WebKit does not start in the authoring sandbox (missing system libraries; `docs/evidence/didnt-work.md`).
  The mobile smoke runs there on Chromium with the iPhone 13 touch profile, labelled as such; the real
  WebKit run is CI's. A task is not called done until CI's smoke is green.
- Pixel probes depend on the drawing. A change to the shed's art that moves a probe fails the smoke; the probes
  and the drawing share `shed-layout.ts` and `shed-palette.ts`, so the numbers change in one place.
- The art is code and is judged by eye in the screenshots; the shapes (door, lock, cat, tools) may need a
  second pass after the first look at the built screen.
- A child may read the shut result as "the hammer is bad". The words only say what was used and what the
  door did; the next playtest should note whether children try the hammer again.
