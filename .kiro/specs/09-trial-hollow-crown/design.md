# Design: Trial 6, The Hollow Crown

Implements `requirements.md` (REQ-9.n). Follows ADR 0001 (pure reducer), ADR 0003 (gates) and the layout rules in
`.kiro/steering/structure.md`. No new dependency, no new asset, no new ADR: the reducer stays pure and the scene stays
thin, which is what ADR 0001 and 0003 already say. The module layout copies trial 5 (`08-trial-tell-whats-wrong`), so a
reviewer who knows the lantern knows the crown.

Trials 1 to 5 each teach one step. Trial 6 strings five of them into a chain and plays it three times. It has no clock
and no score: the lesson is the order of the steps, and a clock would reward skipping the check. It is cleared once,
by the third lit lamp.

## What the child does

```text
title    --tap the crown button (the game draws a seed)--> tell, chain 0
tell     --SayLook (a card)--> tell, that part's pick replaced
tell     --Tell, both parts picked--> give
tell     --Tell, a part missing--> tell, with the note "which <part>?"
give     --GiveItem a tool--> go (the wisp holds it)
give     --GiveItem the secret--> give, with the note "<thing> is a secret"
go       --Go, the job's tool--> check, the made lamp (told, but the slip part)
go       --Go, another tool--> give, with the note "used the <tool>, still there"
check    --CheckLamp not the same, the lamp differs--> fix
check    --CheckLamp same, the lamp is the wish--> lit
check    --the other two answers--> check, with the note "look again"
fix      --PointLamp a part that differs--> fix, that part pointed, its two cards open
fix      --PointLamp a part that is the same--> fix, with the note "the <part> is the same"
fix      --FixLamp one of the two cards--> check, the part changed, the note "you said <look>"
lit      --NextLamp, chain 0 or 1--> tell, the next chain
lit      --NextLamp, chain 2--> clear
clear    --StartCrown (play again)--> tell, chain 0 of a new seed
any      --LeaveCrown--> title
```

Every event not on this list returns the same state in that stage: that is how "a skipped step does not work" is
built. In particular no event goes from a later step back to the tell step of the same chain.

## Domain (`src/domain/crown.ts`)

### Lamps, jobs and things

A `Lamp` is a look for each of `lampParts`, `roof` and `light`, from the top. Their looks are trial 5's `looksOf.roof`
and `looksOf.light`; the handle is not used, so a look of the handle is no card here and is ignored. `jobs` are
trial 2's `leaves`, `boards` and `rope`, and a job's tool is trial 2's `answerOf` (broom, hammer, scissors). The lock
and the roof are not used: the key would sit next to the house key, and the ladder's cat is trial 2's story. A
`Thing` is a tool or one of trial 4's three secrets (`isSecret`).

### State

```ts
type Told = Readonly<Record<LampPart, LookId | null>>;
type Crown =
  | { stage: "telling"; seed; chain; told: Told; note: { kind: "missing"; part } | null }
  | { stage: "giving"; seed; chain; told: Lamp; note: { kind: "secret"; thing } | { kind: "stuck"; tool } | null }
  | { stage: "going"; seed; chain; told: Lamp; tool: ToolId }
  | { stage: "checking"; seed; chain; lamp: Lamp; note: { kind: "again" } | { kind: "said"; look } | null }
  | { stage: "fixing"; seed; chain; lamp: Lamp; part: LampPart | null; note: { kind: "fine"; part } | null }
  | { stage: "lit"; seed; chain }
  | { stage: "clear"; seed };
```

`GameState.crown` is `initialCrown` whenever `trial` is not 6 (INV-72). The wish, the job, the things and the slip are
never stored: `wishAt`, `jobAt`, `thingsAt` and `slipAt` derive them from `seed` and `chain`. A lit lamp stores no lamp:
it is the wish. `madeAt(seed, chain, told)` is the lamp the wisp makes; it is computed once, by `Go`, and from then on
`lamp` is what the child's fixes made of it. `cardsOf` gives the two fix cards (the looks of the pointed part other
than the one it has), `sameAsWish` whether a lamp is the wish.

### The chains: a seed in base 3

The seed is read as base-3 digits (`digit(seed, n)`) and one larger block. For chain `c`:

- the wish's roof is look `(digit 0 + c) mod 3`, its light `(digit 1 + 2c) mod 3`, so both parts change every chain
  and the three wishes of a visit are all different (REQ-9.9.4);
- the jobs follow one of the six orders of the three jobs, `floor(seed / 3^8) mod 6`, so each job comes once;
- the things are the job's tool, the tool of the next chain's job (it fits another job, so it is a real tool and not
  nonsense) and the secret `(digit 2 + c) mod 3`; they are put in the three places turned by `(digit 3 + c) mod 3`, so
  the job's tool is in a different place in each chain (REQ-9.5.6);
- the slip part is part `(digit 4 + c) mod 2`, so it alternates (REQ-9.9.4). Its look is a look that is neither the told
  look nor the wish's: one look when they differ, and when they are the same, one of the two others by
  `(digit 5 + c) mod 2`.

A unit test pins the chains of seeds 0, 1, 2, 3, 1234 and 2^32 - 1 and checks the rules for 100 seeds.

### Events (`events.ts`) and the reducer

`CrownEvent = SayLook { look } | Tell | GiveItem { thing } | Go | CheckLamp { same } | PointLamp { part } |
FixLamp { look } | NextLamp`, and two top-level events like the other trials': `StartCrown { seed }` and `LeaveCrown`.
The names are their own, so no event of trials 1 to 5 can act on trial 6 and no event of trial 6 on another trial
(INV-72). `FixLamp` and `PointLamp` are not trial 5's `FixPart` and `TapPart`: a shared name would let one trial's
handler act on the other's state.

`reduceCrown(crown, event)` returns the crown itself when nothing changes. It is one switch on the event, and each case
is a small function that first checks the stage (`say`, `tell`, `give`, `go`, `check`, `point`, `fixLamp`, `next`).

`reducer.ts` gains `startCrown` and `leaveCrown`, and `reduceLaterTrial` hands the crown's events to
`reduceCrownTrial`, which is guarded by `inTrial(state, trials.crown)` and changes only `crown`. `Tick` runs only in the
trials of a run: `timed`, the list of trials 1 to 5, replaces `Object.values(trials)`, so `Tick` in trial 6 returns the
same state (INV-71). `start` also resets `crown`. `startCrown` and `leaveCrown` do not touch `run`: on the title the run
is already a fresh one (every way to the title restarts it), and trial 6 never moves it.

### Invariants

INV-63 to INV-74 (see `requirements.md`) each have a property test in `crown.pbt.test.ts`, which also runs INV-1 to
INV-4 over sequences that contain the new events. INV-15 to INV-17 keep their wording: trial 6 never changes `run`
(INV-71), so they still hold over every sequence. `.kiro/steering/domain-invariants.md` has the rows and a note.

### Model check (`crown.model.test.ts`)

The real reducer is wrapped with an independent record of what the child did, written from the spec: `picked` (the last
card of each part pressed in this chain's tell), `told` (the lamp the wisp was told, set by a `Tell` that moved on),
`lits` (lamps lit in this visit) and `ok` flags that turn false at the first step that broke a rule: a stage that moved
off the chain's order; a tell that was not the two cards picked; a job cleared by anything but its tool; a made lamp
that is not the told lamp but the slip part; a fix that changed another part or another look; a lamp lit by anything
but "same" on the wish; a step back to the tell inside a chain; a move of `run`. The alphabet has two seeds, the six cards and a handle look, `Tell`,
the five things of a seed and one that is never on screen, `Go`, both checks, both points, the six fix cards, `NextLamp`,
the leave, both languages, two hero places, a short and a long `Tick`, `Start` in trial 6, and the events of trials 1
to 5 that must do nothing here. The state space is finite as it is (no score, no clock), so no field is abstracted.

Invariants: phase, trial and `crown` agree; `crown` is initial outside trial 6; the other trials stay untouched; `run`
is the title's run; the stage moves only along the chain; the wisp is told exactly the cards picked; the job is cleared
only by its tool; the made lamp keeps the told looks but the slip part; a fix changes only the pointed part, to the
card; a lamp is lit only by "same" on the wish; the clear comes only after three lit lamps; nothing goes back to the
tell inside a chain. Goals, from every state: the fix step, a lit lamp, the clear, the title; and without the leave, the
clear. Deliberate breaks (a tell with one card moves on; any tool clears the job; a secret clears the job; the wisp makes
exactly the told lamp, with no slip; "same" accepted on a differing lamp; a fix also changes the other part; a card starts the chain over; `NextLamp`
ignored; `LeaveCrown` ignored; `Tick` runs a clock in trial 6) each fail the check that is meant to notice it, with the
shortest trace.

## Content (`src/content/`)

A group `crown` in `strings.ja.json` and `strings.en.json`, same keys in the same order. Words the earlier trials
already have are reused, so they read the same in every trial: the looks and the parts (`lantern.looks`,
`lantern.parts`), the tools (`shed.tools`), the secrets (`shadows.items`), each job's guide and "still there" line
(`shed.puzzles.<job>.guide`, `.stuck`), "Next" (`lantern.next`), "Play again" (`run.again`) and "Title" (`shed.leave`).

English (the source):

| key | text |
|---|---|
| enter, caption | Light the town; Three lamps, no clock |
| steps | Tell, Give, Go, Check, Fix |
| wish | The lamp you want |
| panel | What you said; The shed; The wisp's lamp |
| guide.tell, .go, .check, .fix, .lit, .clear | Pick a roof and a light / Then tap Tell; Now ask the wisp / Tap Go!; Is it the lamp you want? / Look at both; Which part to fix? / Tap it and say how; The lamp is lit! / Tap Next; The town is bright again! / You used it all |
| tell | What should it make? / Tell the wisp |
| missing | Which {0}? / The wisp is asking |
| give | What will you give? / Keep secrets to yourself |
| secret | The {0} is a secret / It is not a tool |
| going | The wisp has the {0} / Tap Go! |
| made | The wisp made a lamp / Is it the same? |
| again | Look again / Compare row by row |
| said | You said: {0} / Is it the same now? |
| fix | Tap the part / that is not the same |
| point | Which {0}? / Look at the lamp you want |
| fine | The {0} is the same / Tap the other part |
| lit | The town got brighter |
| clear | The town's lamps are all lit |
| tellButton, go, same, notSame | Tell; Go!; Same; Not the same |

The Japanese is in `strings.ja.json`. `crown-content.test.ts` checks keys and order, `{0}` where it belongs and nowhere
else, the Japanese rules and the English length (26 characters a line) with every word inserted, the button words'
length, that the words say what the rules do (tell, give, secret, same, fix), and the lists of blame, fear and claim
words of trial 5, with `ちがう` not allowed in any string of trial 6. The kid-reader rubric
(`.kiro/agents/kid-reader.md`) is applied by hand.

## Game (`src/game/`)

### Entrance and scene choice

`route.ts` maps trial 6 to the `crown` scene. `boot.ts` adds `CrownScene`. `TitleScene` gets a fifth entrance; the seed
is drawn there (`newSeed`). The end screen is not involved.

### The title

Five buttons cannot be stacked under the art: the four buttons already take y 432 to 776, and the middle of the title
(195, 422), where the smoke taps to start trial 1, has to stay outside every button. So the crown button goes between
trial 1's card and the art, at (195, 240), 300 x 80. To make room the name moves from y 62 to y 34 and the card from
340 x 144 at y 194 to 340 x 128 at y 128 (prompt y 96, rule y 154). The art (the wisp at y 360, the hero at y 370) and
the four buttons do not move. Gaps: 14 pixels from the name's line to the card, 8 from the card to the button, 18 from
the button to the art's top. The pinned numbers of the name and card in `lantern-layout.test.ts` change; every relation
in the title tests (the card holds its prompt and rule, touches no button, ends 100 pixels above each of the four lower
buttons, the art ends above them and below the card) still holds with the new numbers.

### Layout (`crown-layout.ts`; the way back comes from `shed-layout.ts`, the wisp's place from `field-layout.ts`)

From the top, in game pixels:

| what | where |
|---|---|
| the row of steps | five cells 72 x 40 at y 26, x 39, 117, 195, 273, 351 |
| the guide | y 76, two lines, 340 wide |
| the panels' labels | y 116, 16 pixels |
| the wish's panel, the wisp's panel | 170 x 172 at (97, 214) and (293, 214) |
| the rows of a lamp | the roof at y 168, the light at y 250, each 160 x 80 (the tap targets on the wisp's panel) |
| the message | y 332, 340 wide, two lines |
| the tell cards | 88 x 80, the roof's at y 412 and the light's at y 506, x 52, 146, 240 |
| "Tell" | 88 x 174 at (340, 459), beside both rows of cards |
| the three things | 110 x 110 at y 455, x 75, 195, 315 |
| one button ("Go!", "Next", "Play again") | 300 x 96 at (195, 455) |
| two buttons ("Same" / "Not the same", the fix cards) | 170 x 96 at (106, 455) and (284, 455) |
| the hero's strip | y 612, free |
| the wisp | (195, 720) |
| the town's lamps | 56 x 64 at y 796, x 36, 92, 148, clear of the wisp's glow |
| "Title" | 80 x 80 at (347, 788) |

All controls end at y 546 or above, clear of the hero's strip. The shed is trial 2's drawing at half size in the wisp's
panel; the tool the wisp holds is drawn under it. The tick badge is `drawPickedMark`'s disc on the wisp's panel's top
right corner. The layout test checks the canvas bounds, no overlap in every stage, 80 x 80 targets, the order from the
top, the hero's strip and the probes.

### View (`crown-view.ts`)

`crownView(state)` returns the row of steps (a word and a mark each: `done`, `now`, `later`), the guide, the two
labels, the message (named for the stage and its note), the wish, what the wisp's panel shows (`told`, `shed` with the
job and the tool held, or `lamp` with the lamp, whether it is lit and the part pointed at), the controls (id, word,
event, rectangle, picture, picked), the town's three lamps (on or off), the label of "Title", and the result for the
flourish (`lit`, `clear` or `null`). `justLit(before, after)` says a lamp has just been lit. A control's picture is a
look, a tool, a secret, a tick ("Same"), a ring of dots ("Not the same") or none.

### Scene (`scenes/CrownScene.ts`) and art (`ui/`)

The scene draws the view and turns taps into events. It has no rules and no `Tick`. The art is drawn in code:
`crown-art.ts` (a town lamp dark or lit, the title's picture), `crown-steps.ts` (the row of steps with its frames and
ticks), `crown-stage.ts` (the two panels, the lamp rows with `drawPart` from `lantern-art.ts`, the told looks, the shed
with `drawShed` at half size and the tool with `drawTool`, the frame of the pointed part, the tick badge, and the two
tap targets) and `crown-controls.ts` (the controls: a button per control, made again when the set of ids changes, with
the 450 ms lock of `button-lock.ts`, the look icons, `drawTool`, `drawItemArt`, and `drawPickedMark` on a picked card).
On a lit lamp a ripple and sparks come from the light and its town lamp; on the clear sparks come from all three town
lamps. Nothing is red and nothing shakes.

## Reuse and alternatives

| need | reused | alternative and why not |
|---|---|---|
| state and events | `reduce`, `GameState`, `GameEvent`, `createGame`, `window.__game` | a second store: not needed |
| rules | the `reduceLantern` pattern: a small reducer that returns its input when nothing changes | a "meta" trial that drives the other five reducers in turn: their states are 60-second runs with scores, and INV-15 to INV-62 would all have to change |
| lamp looks | `looksOf`, `LookId` from `lantern.ts`, `drawPart`, `lookIcons` | new looks: more art for no new meaning |
| jobs and tools | `answerOf`, `PuzzleId`, `ToolId` from `shed.ts`, `drawShed`, `drawTool` | new jobs: the child knows these from trial 2 |
| secrets | `isSecret`, `ItemId` from `shadows.ts`, `drawItemArt` | new secrets: the same idea twice |
| words | the looks, parts, tools, secrets, job lines, "Next", "Play again", "Title" from trials 2, 4 and 5 | copies in the `crown` group: two sources for one word |
| "Title", the lock, the background, text, wisp, hero, sparks | `createLeaveButton`, `leaveButton`, `pressable`, `drawBackground`, `fitCamera`, `textStyle`, `createWispArt`, `createHero`, `burst`, `ripple` | none needed |
| buttons | not `ui/field-buttons.ts`: its three fixed slots do not hold six cards and a tall "Tell" | widening it: it would change the shared widget of trials 3 to 5 for one trial |
| property and model tests | `checkProperty`, `modelChecker` | none |
| smoke | `tapper`, `clicker`, `pressUntil`, `look`, `collectErrors`, `expectBundledFont`, `fingerprint`, the seed rig of `lantern-helpers.ts` | none |

## Test plan and traceability

| layer | what | requirement |
|---|---|---|
| unit (`crown.test.ts`) | parts, looks, jobs, things; the chains pinned for several seeds; the rules for 100 seeds; each event in each stage; the made lamp; the cards | REQ-9.3 to 9.9 |
| unit (`reducer.test.ts`) | `StartCrown` from the title and the clear only; the crown's events outside trial 6; the other trials' events, `Tick`, `Start`, `SetLang` in trial 6; the leave; a whole visit | REQ-9.1, 9.9 to 9.11 |
| property (`crown.pbt.test.ts`) | INV-1 to INV-4 with the new events; INV-63 to INV-74; the generator reaches every stage, every note, every chain, the clear, play again and the leave | REQ-9.9, 9.11, 9.15 |
| model (`crown.model.test.ts`) | every reachable state; the invariants and goals above; shortest traces; ten deliberate breaks | REQ-9.3 to 9.10, 9.15 |
| content (`crown-content.test.ts`) | keys, placeholders, Japanese rules, English length, no blame, fear or claims | REQ-9.1.6, 9.8, 9.14 |
| view (`crown-view.test.ts`, `title-view.test.ts`, `route.test.ts`) | per stage and language: the steps' marks, the guide, the message, the panel, the controls, the town; the title's words; the scene choice | REQ-9.1 to 9.11 |
| layout (`crown-layout.test.ts`, `lantern-layout.test.ts`) | inside the canvas, no overlap in each stage, targets of 80 or more, the hero's strip, the probes, the title's five buttons and the card | REQ-9.1, 9.12 |
| mutation | any surviving mutant fails | REQ-9.15, 9.17 |
| mobile smoke (`smoke.mobile.crown.spec.ts`) | real taps; the paths in REQ-9.16; pixels; grayscale and silence; ja and en screenshots; the title; offline | REQ-9.1 to 9.16 |
| desktop smoke (`smoke.desktop.crown.spec.ts`) | a chain with the mouse; a held press on a part leaves the hero still | REQ-9.12, 9.16 |

### How the smoke sees the picture

The game is drawn on a canvas, so the smoke reads points from a screenshot (the probes in `crown-layout.ts`) and turns
each into brightness with the weights of a grayscale screen, so a grayscale screen reads the same.

| reading | how |
|---|---|
| a step's mark | a point on the top edge of its frame (bright only for the solid frame of the current step) and a point on its tick (bright only for a done step) |
| a picked card | a point in `drawPickedMark`'s disc on the card's top right corner |
| the lit lamp | a point in the tick badge's disc on the wisp's panel |
| a town lamp | a point on its top ray (bright only when it is lit) |
| the message, the buttons | light text pixels in the box; a fingerprint of the controls' area changes with the step |

"Silent" is checked as trials 3 to 5 check it: `AudioContext.createOscillator`, `createBufferSource` and
`HTMLMediaElement.play` are wrapped before the page loads, and none may be called.

## Decisions and alternatives

- **Trial 6 teaches L1–L5, not L1–L4.** The learning design's row was written before L5 existed. The fix step is L5 as
  trial 5 teaches it (where, then how, only that part), so the row now says L1–L5 and lists the chain with the check
  before the fix.
- **No clock, no score; cleared once.** The other trials are 60-second time attacks because a single lesson repeated
  fast is a game. The chain is long (about ten taps a lamp), and a clock would reward the one thing the chain forbids:
  skipping the check. A score has nothing to count that the three lamps do not show. Alternatives: a 60-second run of
  chains (most 6-year-olds would finish no lamp); a timer without pressure (a number that means nothing). The run's
  state is not touched, so INV-15 to INV-17 keep their wording, and its best score stays.
- **The clear is a stage of trial 6, not the end screen.** The end screen of trials 1 to 5 says "Time's up!" and shows
  a score; INV-17 says it is shown exactly when the clock is at zero. Trial 6's clear is `stage: "clear"` with
  `phase` still `trial`, drawn by the crown scene: "The town is bright again!", "Play again", and the same "Title" button
  as in every stage. That keeps the flow of the other trials (end, play again, title) without a new phase (INV-1).
- **The tell needs both cards, and the wisp asks for the missing one.** In trial 1 a one-card request is valid and the
  wisp picks the other card itself, to show that a vague request brings something else. In trial 6 that lesson is
  known, and a guessed card would make "a skipped step does not work" untrue for half the tell. So the wisp asks which
  look the missing part should be and waits. It never guesses (REQ-9.4.4).
- **The wisp slips in one part, every chain.** Without a slip a child who tells the wish exactly would never need the
  check or the fix. Trial 5 already has the wisp bring a lamp with one part different, and the product says the helper
  "sometimes gets it wrong". The slip is told as what the wisp made, never as its fault.
- **The check is "same" or "not the same", and it is asked again after every fix.** The lamp the wisp makes is never the
  wish, so the first check is always "not the same"; asking again after the fix makes the second check a real one
  (after a wrong card or a told look that was not the wish, it is "not the same" again). Alternatives: the fix lights
  the lamp by itself (trial 5's rule; it would skip the check that the chain is about); the check is a tap on the
  different part (then the fix's "where" would be a second tap on the same part).
- **No part is marked in the check or the fix.** In trial 5 the flicker shows where. Here finding where is the check,
  and it is the child's. A tap on a part that is the same says so, at no cost, as trial 5's tap on a steady part does.
- **A secret is not a tool, and that is all the game says.** Giving a secret moves nothing on; the message says that the
  thing is a secret and not a tool. The wisp is not shown refusing it or protecting it: that would teach that a helper
  keeps secrets safe for the child, which is on the "do not teach" list. Trial 4's "the shadow heard it" is not repeated:
  there is no shadow here, and the lesson in trial 6 is that a secret does not belong among the things a helper needs.
- **A tool that does not fit is tried, then given again.** The wisp does exactly what it is given (trial 2's rule), so
  the give accepts any tool and the go tries it. Going back to the give, not to the tell, keeps what was told.
- **Only three jobs.** The lock would put trial 2's key next to trial 4's house key, and a 6-year-old cannot be expected
  to tell a tool key from a secret key. The roof puzzle is trial 2's cat. Leaves, boards and a rope each come once in a
  visit, so three jobs are enough.
- **Two parts, not three.** The tell step needs a row of cards for each part, and three rows with "Tell" do not fit above
  the hero's strip at 80 pixels a target. The roof and the light are the two rows; the handle is not drawn.
- **The title's fifth button goes between the card and the art.** Under the art it would cover the middle of the title,
  which the smoke and many children tap to start trial 1, or push the buttons off the canvas. Smaller buttons are below
  the 80 x 80 minimum. Moving the name and card up and the card 16 pixels shorter is the smallest change; the art and the
  four buttons stay. The newest trial at the top of the buttons continues spec 07's and 08's order.
- **`CheckLamp { same }`, not two events.** One event with a flag keeps the alphabet of the model small and the reducer
  one case; the view sends `same: true` from "Same" and `same: false` from "Not the same".
- **Guard by `trial`, not by a new phase.** INV-1 keeps its three phases.
- **No parent text.** The parent screen is out of scope (`parents.*.json` keeps its empty list). The playtest notes in
  `docs/device-checklist.md` should record whether children say the steps in order.

## Risks

- WebKit does not start in the authoring sandbox (`docs/evidence/didnt-work.md`). The mobile smoke runs there on
  Chromium with the iPhone 13 touch profile, labelled as such; the real WebKit run is CI's.
- The first check of a chain is always "not the same". A child may learn to press it without looking. The second check
  is not predictable, and the fix needs the child to find the part. The next playtest should note whether children
  compare the panels before the first check.
- A chain is about ten taps and the trial thirty. A 6-year-old may tire before the third lamp. There is no clock, the
  town's lamps show the progress, and "Title" is always there. If playtests show it, the lever is two chains.
- Pixel probes depend on the drawing; the probes and the drawing share `crown-layout.ts`.
- The art is code and is judged by eye in the screenshots.
