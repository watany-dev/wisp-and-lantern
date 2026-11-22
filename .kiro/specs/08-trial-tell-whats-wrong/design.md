# Design: Trial 5, The Flickering Lantern

Implements `requirements.md` (REQ-8.n). Follows ADR 0001 (pure reducer), ADR 0003 (gates) and the layout rules in
`.kiro/steering/structure.md`. No new dependency, no new asset, no new ADR: the reducer stays pure and the scenes stay
thin, which is what ADR 0001 and 0003 already say. The module layout copies trial 4 (`07-trial-keep-secrets`), so a
reviewer who knows the shadows knows the lantern.

Like trial 4, trial 5 is a 60-second time attack from its first version: trial 1's `Run` (clock, score, streak, best),
trial 1's end screen, and the shed's "Title" button in every stage. What is new is the two-step instruction. In trials
1 to 4 one tap (or one pair of cards) is the whole request. Here the child first says **where** (a tap on the
flickering part) and then **how** (a card for that part), and the wisp changes only what was said.

## What the child does

```text
title   --tap the lantern button (the game draws a seed)--> looking, round 0
looking --TapPart the flickering part--> pointing (its two cards open)
looking --TapPart a steady part--> looking, with the note "that part is fine"
pointing --TapPart a steady part--> looking, with the note (the cards close)
pointing --TapPart the flickering part--> pointing (an equal state)
pointing --FixPart a right card--> lit
pointing --FixPart a wrong card--> looking, the part changed and still flickering, the note "you said ..."
pointing --FixPart a look that is not one of the two cards--> the same state
lit     --TapPart / FixPart--> the same state
lit     --NextLantern--> looking, the next round (the next wish and lantern of the seed)
any     --Tick, the clock reaches zero--> over (the end screen; trial 5 is kept as it was)
over    --StartLantern--> looking, round 0, a new run (a full clock, a score of 0, the best kept)
any     --LeaveLantern (a run or the end screen)--> title
```

Each `FixPart` that counts also scores: a right card adds 100 plus 50 for each right card in a row, up to 4; a wrong
card ends the streak. A point scores nothing. A tap on the title anywhere else still starts trial 1.

## Domain (`src/domain/lantern.ts`)

### Parts and looks

`parts` are `handle`, `roof` and `light`, from the top. `looksOf[part]` gives each part's three looks, in a fixed
order: the handle is `ring`, `bow` or `bell`; the roof is `pointy`, `round` or `flat`; the light is `candle`, `star` or
`moon`. A `Shape` is a look for each part. The nine look ids are all different, so a `FixPart` with a look of another
part can be told apart and ignored (REQ-8.5.1, INV-57).

### State

```ts
type Note = { kind: "fine"; part: PartId } | { kind: "said"; look: LookId } | null;
type Lantern =
  | { stage: "looking"; seed: number; round: number; shape: Shape; note: Note }
  | { stage: "pointing"; seed: number; round: number; shape: Shape; part: PartId }
  | { stage: "lit"; seed: number; round: number };
```

`GameState.lantern` is `initialLantern` whenever `trial` is not 5 (INV-60). The wish, the fault part and the lantern the
wisp brought are never stored: `wishAt`, `faultAt` and `broughtAt` derive them from `seed` and `round`. `shape` is the
lantern as it is now, which is the brought lantern until a wrong card changes its fault part. A lit lantern stores no
shape: it is the wish (`shapeOf`). `flickerOf` derives the flickering part (the one part where `shape` is not the wish),
and `cardsOf` the two cards (the looks of the pointed part other than the one it has). Whether a card is right is
`fixRight(lantern, look)`: `true`, `false`, or `null` when the event is not a fix (not pointing, or a look that is not
one of the two cards). The reducer scores with it, as trial 4's `decisionRight`.

### The rounds: a seed in base 3

The seed is read as base-3 digits (`digit(seed, n)` is the n-th digit). For a round `r`:

- the wish's handle is look `(digit 0 + r) mod 3`, its roof `(digit 1 + 2r) mod 3`, its light `(digit 2 + r) mod 3`, so
  every part's look changes each round and no wish repeats the one before it (REQ-8.8.2);
- the fault part is part `(digit 3 + r) mod 3`, so it moves each round and each part is the fault once in every three
  rounds (REQ-8.8.3);
- the brought look of the fault part is the wish's look plus a step of 1 or 2, mod 3. The cards follow the look the
  part has (`now + 1`, `now + 2`), so a step of 2 puts the right card on the left and a step of 1 on the right. The
  steps come from one of two hand-written cycles of six, by side `LRRLLR` and `RLLRLR`; digit 4 (even or odd) picks the
  cycle and `floor(seed / 3^5) mod 6` where in it the run starts. Neither cycle simply alternates or puts the right
  card on one side three times in a row, the wrap included (REQ-8.8.4).

The whole pattern repeats every 6 rounds. A unit test pins the first rounds of seeds 0 to 3, 27, 81, 242, 243 and
2^32 - 1, checks the rules for 100 seeds over 12 or 24 rounds, and checks that the right card is on both sides in every
six rounds and never three times in a row on one.

### Events (`events.ts`) and the reducer

`LanternEvent = TapPart { part } | FixPart { look } | NextLantern`, and two top-level events like the other trials':
`StartLantern { seed }` and `LeaveLantern`. The names are their own so that no event of trials 1 to 4 can act on trial
5 and no event of trial 5 on another trial (INV-60).

`reduceLantern(lantern, event)` returns the lantern itself when nothing changes:

- `TapPart` in `lit` returns the lantern. On the flickering part it gives `pointing` at that part; on a steady part it
  gives `looking` with the note `fine`.
- `FixPart` asks `fixRight`; `null` returns the lantern. `true` gives `lit`; `false` gives `looking` with the pointed
  part set to the look sent and the note `said`.
- `NextLantern` in `lit` gives round + 1 (`looking` at `broughtAt(seed, round + 1)`, no note); anywhere else the
  lantern.

`reducer.ts` gains `startLantern`, `leaveLantern` and `fix`; `Tick` runs in trial 5 (the list of trials gains one);
`start` also drops `lantern`. The trial events go through `reduceLaterTrial`, which now hands the shadows' and the
lantern's events on (`reduceLanternTrial` takes `TapPart`, `FixPart` and `NextLantern`), so no function grows past the
complexity limit.

### Invariants

INV-54 to INV-62 (see `requirements.md`) each have a property test in `lantern.pbt.test.ts`, which also runs INV-1 to
INV-4 and INV-15 to INV-17 over sequences that contain the new events. `.kiro/steering/domain-invariants.md` has the
rows and a note on the scope.

### Model check (`lantern.model.test.ts`)

The real reducer is wrapped with an independent record of what the child did: `said` (the look of the last card that
counted in this round), `rightSaid` (a right card was picked in this round), `lits` (lanterns lit so far, 2 meaning "at
least 2") and `scoreOk` (false from the first step that moved the score when it should not have). The alphabet has two
seeds, a point at each of the three parts, a card for each of the nine looks, `NextLantern`, the leave, both languages,
two hero places, a short and a run-ending `Tick`, `Start` in a run, and the events of trials 1 to 4 that must do nothing
here. A state's identity does not follow the score and the round without end: the score is "none or some", the clock
"full, running or zero", the round modulo 6 (the period of the rounds). It has 4,996 states and the whole file runs in
about 3 seconds.

Invariants: phase, trial and `lantern` agree; `lantern` is initial outside trial 5; the other trials stay untouched; the
clock is between 0 and 60 seconds and over exactly at zero; until the lantern is lit it differs from the wish in exactly
the round's fault part; after a wrong card the fault part has the look the child said; the lantern is lit only after a
right card in this round; the score moves only on a right card, by exactly the points for the streak. Goals, from every
state: pointing at the flickering part, a wrong card, a lit lantern, the title, the end screen; and with neither the
clock nor the leave, a lit lantern, the next round and a second lit lantern. Eight deliberate breaks (a wrong card that
lights the lantern; a fix that starts over with a new lantern; a fix that changes another part; a point at a steady part
that opens its cards; `NextLantern` ignored; `Tick` not running in trial 5; `LeaveLantern` ignored; a wrong card that
scores) each fail the check that is meant to notice it, with the shortest trace. The break "a point at a steady part
opens its cards" lets every part change, which takes the broken game past the checker's 100,000 states, so it runs on
trial 5's own events only (the seeds, the points, the cards and `NextLantern`).

## Content (`src/content/`)

A group `lantern` in `strings.ja.json` and `strings.en.json`, same keys in the same order: `enter`, `timeAttack`,
`guide`, `wish`, `brought`, `look`, `point`, `fine`, `said`, `lit`, `next`, `parts` (three words) and `looks` (nine
words). `point` and `fine` take a part's word (`{0}`); `said` and `lit` take a look's word. `look` and the others take
none.

English (the source):

| key | text |
|---|---|
| guide | One part flickers! / Tap it and say the fix |
| wish, brought | Your wish; The wisp's lantern |
| look | Look at your wish / What is different? |
| point | Which {0} is right? / Look at your wish |
| fine | The {0} is fine / Tap the part that flickers |
| said | You said: {0} / It still flickers |
| lit | Just right: {0}! / Only that part was fixed |
| parts | handle, roof, light |
| looks | ring, bow, bell; pointy, round, flat; candle, star, moon |

The Japanese is in `strings.ja.json` and its translation of the rules in `jp/design.md`. The Japanese look words are
put in corner brackets in `said` and `lit` (`「{0}」`), so a one- or two-kana word (`ほし`, `すず`) reads as the word the
child said. The kid-reader rubric (`.kiro/agents/kid-reader.md`) was applied by hand: every Japanese line is at most 12
characters with spaces between phrases, each string says one thing, the Japanese and English say the same, and no
string blames the wisp or the child. A wrong card is told in the same plain tone as a right one.

`lantern-content.test.ts` checks keys and order, one `{0}` where it belongs and none elsewhere, the Japanese rules and
the English length (26 characters a line) with every part's and look's word inserted, the button words' length, that
the words say what the rules do (tap, which, you said, still flickers, just that part, fixed), and lists of blame, fear
and claim words in both languages. The blame list is trial 4's without `ちがう`, which is the lesson word here and is
allowed only in `look`; the test checks that no other string uses it.

## Game (`src/game/`)

### Entrance and scene choice

`route.ts` maps trial 5 to the `lantern` scene through its table. `boot.ts` adds `LanternScene`. `TitleScene` gets a
fourth entrance in `createEntrances`; the seed is drawn there (`newSeed`), as for the other trials. `OverScene` gets
`playLantern` and `leaveLantern`, and `over-view.ts` names them for trial 5.

### The title

Four buttons need 4 x 80 + 3 x 8 = 344 pixels. The shed (y 736), field (y 648) and shadows (y 560) buttons do not move;
the new button goes above them at y 472 (432 to 512). Everything above it moves up 88 pixels: the name to y 62, trial
1's card to y 194 (its prompt to y 160, its rule to y 222), the wisp to y 360 and the hero to y 370 (`titleArtBottom`
becomes 426). The gaps between the card, the art and the buttons stay as they were (32 pixels between the card and the
wisp; 6 between the art and the top button). `titleText`, `titleCard`, `titlePrompt`, `titleIntro`, `titleArt` and
`titleArtBottom` change; the pinned numbers of `titleArt` in `field-layout.test.ts` change with them, and the other title
tests are relations and still hold (see `tasks.md`, "Tests of the old behavior"). The mobile smoke's "tap the middle of
the title" (195, 422) lands 10 pixels above the new button, on no object, and still starts trial 1.

### Buttons (`button-view.ts`, `ui/field-buttons.ts`, `ui/look-icons.ts`)

The cards and "Next" are the field's and the shadows' buttons: two side by side (`left`, `right`) and one wide
(`single`), at y 534 (`buttonRects`). `ButtonIcon` gains the nine looks, and `ui/look-icons.ts` draws them in ink at
button size; `field-buttons.ts` merges them into its table. The pictures and behavior of trials 3 and 4 are unchanged,
including the 450 ms lock on a new set of buttons (REQ-8.11.5).

### Layout (`lantern-layout.ts`; the guide and the way back come from `shed-layout.ts`, the buttons and the wisp from `field-layout.ts`)

From the top, in game pixels: the run's top row (y 24); the guide (y 68, two lines); the panels' labels (y 110, 16
pixels); the wish's panel (170 x 264 at (97, 260)) and the wisp's lantern's panel (170 x 264 at (293, 260)); in each
panel the three parts on rows y 176 (handle), 260 (roof) and 344 (light), each part 160 x 80 (the tap targets on the
right panel); the message (y 432, 340 wide); the buttons (y 534, 80 high); the wisp (y 720); the "Title" button (80 x
80 at (347, 788)); the hero's strip (y 612, free). The tick badge is `drawPickedMark`'s disc on the right panel's top
right corner (370, 136), with its gold frame round the panel. The light's glass is 96 x 56 in the middle of the light's
row.

The frame of dots is a row of dots 16 pixels apart, 4 pixels inside the part's rectangle, on all four sides
(`frameDots`); the solid frame is a 4-pixel line on the same path. The layout test checks the canvas bounds, no overlap
in each stage, 80 x 80 targets, the order from the top, the hero's strip, the rows of the two panels, the probes, and
the title's four buttons with the card and the art.

### View (`lantern-view.ts`)

`lanternView(state)` returns the guide, the two labels, the message (named for the stage and its note), the wish (a
look for each part), the wisp's lantern (for each part its look and its mark: `none`, `dots` for the flickering part,
`solid` for the pointed part), whether it is lit, the buttons (two cards while pointing, "Next" when lit, none while
looking), the label of the "Title" button, and the result for the flourish (`lit`, `said` after a wrong card, or
`null`). `justFixed(before, after)` says a card has just been picked.

### Scene (`scenes/LanternScene.ts`) and art (`ui/`)

The scene draws the view and turns taps into events; `update` dispatches `Tick`. It has no rules. The art is drawn in
code: `lantern-art.ts` (the three parts in their nine looks, the glass dim or bright, the glow), `look-icons.ts` (the
nine small ink pictures for the cards), and `lantern-stage.ts` (the two panels, their labels, the parts, the frames, the
tick badge, and the three tap targets). The flickering part's picture fades to 35% and back in 0.8 s (1.25 times a
second); the frame of dots is drawn on its own and does not move. On a right card the lantern's glow comes on with a
ripple and sparks; on a wrong card the changed part pops once. Nothing is red and nothing shakes.

## Reuse and alternatives

| need | reused | alternative and why not |
|---|---|---|
| state and events | `reduce`, `GameState`, `GameEvent`, `createGame`, `window.__game` | a second store: not needed |
| rules | the `reduceShadows` pattern: a small reducer that returns its input when nothing changes | putting the lantern into `Lane` (trial 1 also has a lantern): breaks INV-5 to INV-14 |
| events | new `TapPart`, `FixPart`, `NextLantern`, `StartLantern`, `LeaveLantern` | reusing `PickCard` and `Ask`: a shared name lets another trial's handler act on this state |
| the run | `Run`, `scoreSearch`, `restartRun`, `finishRun`, `OverScene` | a copy of the clock and score: two sources for one rule |
| buttons, lock, "Title" | `ui/field-buttons.ts`, `button-lock.ts`, `createLeaveButton`, `leaveButton`, `overLeave` | new card widgets: more art for no new meaning |
| background, camera, text, wisp, hero, sparks, the picked mark | `drawBackground`, `fitCamera`, `textStyle`, `createWispArt`, `createHero`, `burst`, `ripple`, `drawPickedMark` | none needed |
| the title's picture | `drawLantern` from `ui/items.ts` (trial 1's lantern) | a new drawing: the same idea twice |
| property and model tests | `checkProperty`, `modelChecker` | none |
| smoke | `tapper`, `clicker`, `pressUntil`, `colorsAt`, `rigSeed`, `collectErrors`, `expectBundledFont`, `expectButtons`, `fingerprint` | none |

## Test plan and traceability

| layer | what | requirement |
|---|---|---|
| unit (`lantern.test.ts`) | parts and looks; the rounds pinned for several seeds; the rules for 100 seeds; each event in each stage; the cards; the grading of a card | REQ-8.3 to 8.6, 8.8 |
| unit (`reducer.test.ts`) | `StartLantern` from the title and the end screen only, with a seed; the events of trial 5 outside it; the other trials' events and `Tick` in trial 5; `Start` and `SetLang`; the score (100 to 300) and the streak; the leave; that trying the cards in turn scores less | REQ-8.1, 8.9, 8.10 |
| property (`lantern.pbt.test.ts`) | INV-1 to INV-4 and INV-15 to INV-17 with the new events; INV-54 to INV-62; the generator reaches every point, both kinds of card, a card that is not one of the two, an early next, the later rounds, every fault part, the end screen, play again and the leave | REQ-8.9, 8.10, 8.14 |
| model (`lantern.model.test.ts`) | every reachable state; the invariants and goals above; shortest traces; eight deliberate breaks | REQ-8.4, 8.5, 8.9, 8.14 |
| content (`lantern-content.test.ts`) | keys, placeholders, Japanese rules, English length, no blame, fear or claims | REQ-8.1.6, 8.7, 8.13 |
| view (`lantern-view.test.ts`, `title-view.test.ts`, `over-view.test.ts`, `route.test.ts`) | per stage and language: message, wish, marks, light, buttons; the title's words; the end screen's two buttons; the scene choice | REQ-8.1 to 8.6, 8.9 |
| layout (`lantern-layout.test.ts`, `field-layout.test.ts`) | inside the canvas, no overlap in each stage, targets of 80 or more, the hero's strip, the probes, the title's four buttons, the card and the art | REQ-8.1, 8.11 |
| mutation | any surviving mutant fails | REQ-8.14, 8.16 |
| mobile smoke (`smoke.mobile.lantern.spec.ts`) | real taps; the paths in REQ-8.15; pixels for the frames, the badge, the light, the buttons and the message; grayscale and silence; ja and en screenshots; the title; offline | REQ-8.1 to 8.15 |
| desktop smoke (`smoke.desktop.lantern.spec.ts`) | the same with the mouse; a held press on a part leaves the hero still | REQ-8.11, 8.15 |

`tasks.md` carries the requirement, test and result for each task.

### How the smoke sees the picture

The lantern is drawn on the canvas, so the DOM has no copy of it and a state that says "lit" would pass even if the
light stayed dim. The smoke reads points from a screenshot (the probes in `lantern-layout.ts`) and turns each into
brightness with the weights of a grayscale screen, so a grayscale screen reads the same.

| reading | how |
|---|---|
| the frame of a part | two points on the top edge of its frame path: one on a dot, one halfway to the next dot, each brighter than 130 or not. Both dark is "none", dot bright and gap dark is "dots", both bright is "solid" |
| the tick badge | a point inside the badge's disc, above the panel, where the sky is when there is no badge; brighter than 130 is on |
| the light | a point inside the glass, clear of the light's picture: brighter than 150 when lit |
| the message | light pixels in its box, as the other trials' smoke counts them |
| the buttons | the gold faces of the slots, as the field's and the shadows' smoke read them |
| a part's picture | a fingerprint of the part's rectangle while it does not flicker (pointing, lit), before and after the fix |

"Silent" is checked as trials 3 and 4 check it: wrapping `AudioContext.createOscillator`, `createBufferSource` and
`HTMLMediaElement.play` before the page loads and requiring that none is called. The readings were not logged one by
one; each threshold sits between a gold mark (about 200) and the dark panel or sky (under 60), and the grayscale test
reads the same frames, badge and light with all color removed.

## Decisions and alternatives

- **L5 is "tell it what's wrong", and the learning design gets a fifth goal.** `docs/learning-design.md` listed L1 to L4
  and left trial 5 as "TBD"; the user chose L5 for it. The learning-goals table gains the row (child's words "Tell it
  what's wrong", concept "Feedback: say where and how", in a real agent "When a result is almost right, say what to
  change instead of asking again from the start"). `.kiro/steering/product.md` says "L1 to L5". The child's words in
  Japanese (`どこが ちがうか つたえる`) are in the specs only, because the learning design is English (hard rule 1).
- **The flicker shows where; the wish shows how.** The game marks the part that is different (it flickers and has a
  frame of dots) and never says which look is right. Alternatives: no mark, the child finds the different part (a
  "spot the difference" game; the lesson would be looking, which is trial 3's); a mark and a hint of the right look (the
  child would not need to compare, and saying "how" is the half of the lesson that the child does). The pointing still
  matters: it is the act of saying where, and the cards are for that part only.
- **Two cards, not three.** The cards are the looks of the part other than the one it has now. A card that says "make it
  what it already is" changes nothing, and a 6-year-old would read it as a broken button. The cost: a guess is right half
  the time; the streak answers it (below).
- **A wrong card changes the part.** The wisp does exactly what it is told (the game's first rule since trial 1). So a
  wrong card changes the part to the look the child said, and the part still flickers because it is still not the wish.
  Alternatives: a wrong card changes nothing (the wisp would be judging the instruction, which is the opposite of the
  lesson); a wrong card brings a new lantern (starting over, which is what the lesson replaces).
- **A wrong card closes the cards.** After a wrong card the child points again, so every fix is "where, then how".
  Alternative: keep the cards open (one tap fewer, but the second try would skip the "where" half).
- **No "ask again from the start" button.** The only way to change the lantern is a point and a card, and a fix never
  touches another part. A start-over button would let the child see that it is slower, but it would also make starting
  over a choice the game offers, and REQ-8.7.4 says the words never suggest it. The contrast is told by the result
  instead: "Only that part was fixed"
- **A point at a steady part is free.** It ends no streak and costs no time; the message says the part is fine and to
  tap the flickering one. The flicker is on screen, so a tap on a steady part is a slip of the finger, not a wrong
  instruction. Alternatives: it ends the streak (punishes a slip); it opens that part's cards (a fix there would make a
  second part different, and the lantern would no longer be "almost right").
- **The pointed part stops flickering.** While its cards are open the part has a solid frame and holds still: the child
  has said "here", and the flicker has done its job. It also lets the smoke fingerprint the part's picture before the
  fix.
- **Why the score does not teach "try every card".** A right card is worth 100 to 300 depending on the streak, and a
  wrong one ends the streak. A child who picks the left card first and the other one after lights every lantern, but
  loses the streak every time the left card was not the wish's look. Over the first eight rounds of seed 0 that child
  scores 1,000 (1,050 when the right card is tried first) against 1,900 for eight right cards; `reducer.test.ts` pins
  the three numbers.
- **A seed in base 3, not a table.** A random draw in the domain would break ADR 0001 and make the model check infinite;
  one fixed table lets a child memorize positions. Reading the seed's base-3 digits and two cycles of sides gives many
  different starts, keeps the rules checkable (every part changes, the fault moves, the right card's side follows a
  cycle) and has a period of 6 rounds, which the model check uses. The first version alternated the step with the
  round and kept the cards in the order of the looks; seed 2 then had the right card on the right in every round
  (`docs/evidence/didnt-work.md`), so the cards follow the part's look and the sides come from the cycles.
- **Three parts with three looks each.** The parts are on three rows of the lantern, from the top, so the wish and the
  wisp's lantern compare row by row; the looks are things a 6-year-old names without help (a ring, a bow, a bell; a
  pointy, round or flat roof; a candle, a star, a moon). Each look has its own silhouette, so color carries no meaning
  (hard rule 7). Colors of the glass were rejected for that reason.
- **The lit message is the closing line.** Trials 1 and 4 have a closing line in its own panel. Here the lit message
  already says the lesson ("Just right: round! Only that part was fixed"), and a second panel would push the buttons
  below the hero's strip. The message names what the child said, so it is not a generic "well done".
- **The Japanese "different".** `ちがう` is on trial 4's blame list, because there it would mean "wrong". Here it is the
  lesson word of L5 ("what is different?") and is allowed in that one question; the content test keeps it out of every
  other string.
- **The title's order is trial 5, 4, 3, 2 from the top**, continuing spec 07's choice, so the older buttons and their
  tests stay where they are. The name, the card and the art move up 88 pixels (REQ-8.1.1, "Changes to a shared entrance
  or event"). Alternatives: smaller buttons (below the 80 x 80 minimum); two columns (a label and a caption of 24
  characters do not fit 190 pixels); a trial-select screen (out of scope, REQ-8.1.5).
- **`TapPart` and `FixPart`, not one event.** The two events are the two halves of the instruction; one event with both
  (`Fix { part, look }`) would let a single tap say where and how, and the lesson is that both are said.
- **`look` ids are unique across parts.** A `FixPart` names only the look; the part is the one pointed at. A look of
  another part is not one of the two cards and returns the same state, so no event can change a part that was not
  pointed at.
- **Guard by `trial`, not by a new phase.** INV-1 keeps its three phases.
- **No parent text.** The parent screen is out of scope (`parents.*.json` keeps its empty list). The playtest notes in
  `docs/device-checklist.md` should record whether parents connect the lantern to "tell the helper what to change".

## Risks

- WebKit does not start in the authoring sandbox (`docs/evidence/didnt-work.md`). The mobile smoke runs there on
  Chromium with the iPhone 13 touch profile, labelled as such; the real WebKit run is CI's. A task is not called done
  until CI's smoke is green.
- Pixel probes depend on the drawing. A change to the frames, the badge or the glass that moves a probe fails the smoke;
  the probes and the drawing share `lantern-layout.ts`, so the numbers change in one place.
- The art is code and is judged by eye in the screenshots.
- A child may tap the cards in turn without looking at the wish. The lesson then rests on the message ("You said: ...")
  and the score. The next playtest should note whether children look at the wish before they pick a card, and whether
  they say the part and the look aloud.
- Nine looks are few. After a few runs a child knows them, and the game rewards speed more than judgment. If playtests
  show it, the lever is more looks or a fourth part, not a rule.
