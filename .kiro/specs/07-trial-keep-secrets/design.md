# Design: Trial 4, The Listening Shadows

Implements `requirements.md` (REQ-7.n). Follows ADR 0001 (pure reducer), ADR 0003 (gates) and the layout rules in
`.kiro/steering/structure.md`. No new dependency, no new asset, no new ADR: the reducer stays pure and the scenes
stay thin, which is what ADR 0001 and 0003 already say. The module layout copies trials 2 and 3
(`05-trial-grant-tools`, `06-trial-verify-stars`), so a reviewer who knows the shed or the field knows the shadows.

The one thing this spec does differently from the two before it: **trial 4 is a 60-second time attack from its first
version.** Trial 2 and trial 3 were each built without a clock and then revised after the same three comments
("I can't go back to the title", "there is no game in it", "add a 60-second time attack"). Trial 4 starts with the
answer to all three: trial 1's `Run` (clock, score, streak, best), trial 1's end screen, and the shed's "Title"
button in every stage. The cost is one design question that the field did not have: how a quick child can still not
be rewarded for not looking (see Decisions).

## What the child does

```text
title --tap the padlock button (the game draws a seed)--> deciding, round 0
deciding --DecideItem give--> decided (the item goes to the shadow's bubble)
deciding --DecideItem keep--> decided (a padlock on the tile, quiet dots in the bubble)
decided  --DecideItem--> same state
deciding --NextItem--> same state
decided  --NextItem--> deciding, the next round (the next item of the seed)
any      --Tick, the clock reaches zero--> over (the end screen; trial 4 is kept as it was)
over     --StartShadows--> deciding, round 0, a new run (a full clock, a score of 0, the best kept)
any      --LeaveShadows (a run or the end screen)--> title
```

Each `DecideItem` also scores: a right decision (a secret kept, or a thing that is fine to give, given) adds 100 plus
50 for each right decision in a row, up to 4; a wrong one ends the streak. A tap on the title anywhere else still
starts trial 1.

A round has one picture and two buttons, so a 6-year-old sees the thing, hears (if a parent reads) "a shadow is
listening", and chooses. The decision is one tap; the reading of the result is the second step ("Next"), so the
closing line has a moment on screen.

## Domain (`src/domain/shadows.ts`)

### State

```ts
type Shadows =
  | { stage: "deciding"; seed: number; round: number }
  | { stage: "decided"; seed: number; round: number; choice: "give" | "keep" };
```

`GameState.shadows` is `initialShadows` whenever `trial` is not 4 (INV-51). The item is never stored: `itemOf(shadows)`
derives it from `seed` and `round`. The result is never stored: `shadowsOutcome` derives it from the item and the
choice, so a state can never disagree with the rules (REQ-7.8.5). `heardItem` derives what the shadow heard: the item
after a give, nothing otherwise.

### The items: a seed and four orders

`items` are six ids: `houseKey`, `address`, `password` (secrets) and `candy`, `ball`, `flower`. `isSecret` is the one
place that says which are secrets (INV-47). `itemAt(seed, round)` picks one of four hand-written orders by
`seed % 4`, starts at `floor(seed / 4) % 6` and walks the order with the round, wrapping, so every six rounds show
all six items.

The four orders, by kind (S secret, G fine to give): `SGGSSG`, `GSSGSG`, `SGGSGS`, `GGSSGS`. Each is a cycle with no
item repeating the one before it and no kind running three in a row, wrap included, and any rotation of a cycle keeps
both properties. A unit test checks all of this for 100 seeds from every start (INV-46), and pins the order of
seeds 0 to 4, 9, 23, 24 and 2^32 - 1.

### Events (`events.ts`) and the reducer

`ShadowsEvent = DecideItem { choice } | NextItem`, and two top-level events like the shed's and the field's:
`StartShadows { seed }` and `LeaveShadows`. The names are their own so that no event of trials 1 to 3 can act on trial
4 and no event of trial 4 on another trial (INV-51).

`reducer.ts` gains `startShadows`, `leaveShadows` and `decide`; `Tick` runs in trial 4 (a list of the four trials
replaces a three-way `||`); `start` also drops `shadows`. `reduce` hit the complexity limit with the field's events,
so the trial events are in a second switch; the shadows' events go in a third (`reduceLaterTrial`) that hands the
field's events on. `decide` scores through `scoreSearch`, as trials 1 to 3 do: `decisionRight(shadows, choice)` is
the one place where a decision is graded (`true`, `false`, or `null` when there is nothing to decide), and
`reduceShadows` records it.

### Invariants

INV-46 to INV-53 (see `requirements.md`) each have a property test in `shadows.pbt.test.ts`, which also runs INV-1 to
INV-4 and INV-15 to INV-17 over sequences that contain the new events. `.kiro/steering/domain-invariants.md` has the
rows and a note on the scope.

### Model check (`shadows.model.test.ts`)

The real reducer is wrapped with an independent record of what the child did: `expected` (the choice pressed in
this round), `rights` (the right decisions so far, 2 meaning "at least 2") and `scoreOk` (false from the first step
that moved the score when it should not have). The alphabet has two seeds (the house key first, the ball first), both
decisions, `NextItem`, the leave, both languages, two hero places, a short and a run-ending `Tick`, `Start` in a
run, and the events of trials 1 to 3 that must do nothing here. A state's identity does not follow the score and the
round without end: the score is "none or some", the clock "full, running or zero", the round modulo 6. It has 2,664
states and runs in about 1 second.

Invariants: phase, trial and `shadows` agree; `shadows` is initial outside trial 4; the other trials stay untouched;
the clock is between 0 and 60 seconds and over exactly at zero; a decided state holds the choice the child pressed; a
decision is right exactly when a secret was kept or a thing that is fine to give was given; the score moves only on a
right decision, by exactly the points for the streak. Goals, from every state: a right and a wrong decision, each of
the four kinds, the title, the end screen; and with neither the clock nor the leave, a fresh round, the next round and
a second right decision. Eight deliberate breaks (a secret cannot be kept; `NextItem` ignored; a decision recorded
as "give" whatever was pressed; a second `DecideItem` changing the decision; `Tick` not running in trial 4;
`LeaveShadows` ignored; a wrong decision that scores; a right decision that does not) each fail the check that is
meant to notice it, with the shortest trace.

## Content (`src/content/`)

A group `shadows` in `strings.ja.json` and `strings.en.json`, same keys in the same order: `enter`, `timeAttack`,
`guide`, `ask`, `givenSafe`, `keptSecret`, `givenSecret`, `keptSafe`, `give`, `secret`, `next`, `items` (six names)
and `why` (six closing lines). The five messages take the item's name once (`{0}`). Which item each message can be
about is part of the rules the content test follows: `givenSafe` and `keptSafe` are only for the three that are fine
to give, `keptSecret` and `givenSecret` only for the three secrets, `ask` for any.

English (the source):

| key | text |
|---|---|
| guide | A shadow is listening! / Give it or keep it secret? |
| ask | You have the {0} / What will you do? |
| givenSafe | The shadow heard / the {0}. That is fine! |
| keptSecret | The shadow heard nothing / You kept the {0} |
| givenSecret | The shadow heard / the {0}! |
| keptSafe | You kept the {0} / It was fine to give |
| why (a secret) | A house key is a secret / We give it to nobody (and the same for an address and a password) |
| why (the rest) | A candy is just a candy / It is fine to give (and the same for a ball and a flower) |

The Japanese is in `strings.ja.json` and its translation of the rules in `jp/design.md`. The words never say what the
shadow wants or will do; they say what it heard. The kid-reader rubric (`.kiro/agents/kid-reader.md`) was applied by
hand: every Japanese line is at most 12 characters with spaces between phrases, each string says one thing, the
Japanese and English say the same, and no string uses fear to make the child obey or shames after a wrong
decision. A wrong decision is told in the same plain tone as a right one.

`shadows-content.test.ts` checks keys and order, one `{0}` where it belongs and none elsewhere, the Japanese rules
and the English length (26 characters a line) with every applicable item inserted, that the closing line never
repeats a line of a message, that the words say what the rules do (heard, heard nothing, fine to give, secret and
nobody), and lists of blame, fear and claim words in both languages. The claim list rules out "always", "every",
"all", "know", "friend", "family", "robot", "real", "anyone", "anything", and the Japanese counterparts.

## Game (`src/game/`)

### Entrance and scene choice

`route.ts` maps trial 4 to the `shadows` scene through a small table (trials 2, 3 and 4; the lane is the fallback).
`boot.ts` adds `ShadowsScene`. `TitleScene` gets a third entrance, created in its own method so that `create` stays
within the 30 lines the lint allows for a scene; the seed is drawn there (`newSeed`), as for the shed and the field.
`OverScene` gets `playShadows` and `leaveShadows`, and `over-view.ts` names them for trial 4.

### The title

Three buttons need 3 x 80 + 2 x 8 = 256 pixels, and the title already fills the canvas to y 776. The shed button
(y 736) and the field button (y 648) do not move, which keeps trial 2's and trial 3's layout and their tests; the
new button goes above them at y 560. Everything above it moves up: the wisp and hero by 90 pixels (to y 448 and 458;
`titleArtBottom` becomes 514), trial 1's card by 90 (to y 282) and the name by 80 (to y 150). The gaps between the
card, the art and the buttons keep the proportions the earlier layout had (32 pixels between the card and the wisp;
the buttons at least 8 apart). The pinned numbers in `field-layout.test.ts` change with it; the other title tests
are relations and still hold (see `tasks.md`, "Tests of the old behavior").

### Buttons (`button-view.ts`, `ui/field-buttons.ts`)

The field's two verdict buttons and its single wide button are exactly the shape of trial 4's two decision buttons
and its "Next" button, in the same places (`buttonRects`). `ui/field-buttons.ts` is shared. Its `ButtonView` moved to
a small types-only module (`button-view.ts`), and its icon drawing became a table with two more pictures: an arrow
("Give") and a padlock ("Secret"). The field's pictures and behavior are unchanged, including the 450 ms lock on a new
set of buttons (`button-lock.ts`), which here stops a quick double tap on "Give" from also pressing the "Next" that
takes its place (REQ-7.9.5).

### Layout (`shadows-layout.ts`; the guide and the way back come from `shed-layout.ts`, the buttons and the wisp from `field-layout.ts`)

From the top, in game pixels: the run's top row (y 24); the guide (y 68, two lines); the speech bubble (88 x 60 at
(290, 138)); the tile (140 x 140 at (112, 232)) beside the shadow (130 x 120 at (290, 246)); the message (y 352, 340
wide); the closing line's panel (340 x 88 at (195, 440)); the buttons (y 534, 80 high); the wisp (y 720); the "Title"
button (80 x 80 at (347, 788)); the hero's strip (y 612, free). Inside the tile: the picture 76 pixels high at -14, the
name at +50, the tick badge at the top right (62, -62) and the padlock badge at the top left (-62, -62), each 15
radius. The layout test checks the canvas bounds, no overlap in each stage (deciding, decided), 80 x 80 targets, the
order from the top, the hero's strip, and the title's three buttons with the card and the art.

### View (`shadows-view.ts`)

`shadowsView(state)` returns the guide, the message (named for the item and the stage), the tile (the item, its name,
its alpha, its tick and its padlock), the bubble (`none`, `item`, `quiet`), the closing line (after a decision), the
buttons, the label of the "Title" button, and the result for the flourish. The tick is the right result; the padlock is
the kept state; the item fades when it was given. `justDecided(before, after)` says a decision has just been made.

### Scene (`scenes/ShadowsScene.ts`) and art (`ui/`)

The scene draws the view and turns taps into events; `update` dispatches `Tick`. It has no rules. The art is drawn
in code: `item-art.ts` (six items by silhouette), `shadow-art.ts` (the shadow, its bubble, the quiet dots, the padlock
badge, the title's padlock), `item-tile.ts` and `shadow-stage.ts` (the widgets). The shadow is a round lavender
body with a big ear on the side that faces the tile, eyes that look at the tile, and a flat calm mouth: neither a
smile nor a frown. It has a soft shadow of its own and a lighter rim so that it reads on the dark sky. On a decision
the shadow leans in once, and a right decision plays a ripple and sparks from the tile; nothing is red and nothing
shakes. The house key is a ring bow with a little house inside it, so it is not mistaken for the shed's plain key.

## Reuse and alternatives

| need | reused | alternative and why not |
|---|---|---|
| state and events | `reduce`, `GameState`, `GameEvent`, `createGame`, `window.__game` | a second store: not needed |
| rules | the `reduceShed` pattern: a small reducer that returns its input when nothing changes | putting the items into `Field` or `Shed`: breaks INV-18 to INV-45 |
| events | new `DecideItem`, `NextItem`, `StartShadows`, `LeaveShadows` | reusing `GiveTool` or `SortStar`: a shared name lets another trial's handler act on this state |
| the run | `Run`, `scoreSearch`, `restartRun`, `finishRun`, `OverScene` | a copy of the clock and score: two sources for one rule |
| buttons, lock, "Title" | `ui/field-buttons.ts`, `button-lock.ts`, `createLeaveButton`, `leaveButton`, `overLeave` | new widgets: more art for no new meaning |
| background, camera, text, wisp, hero, sparks | `drawBackground`, `fitCamera`, `textStyle`, `createWispArt`, `createHero`, `burst`, `ripple` | none needed |
| property and model tests | `checkProperty`, `modelChecker` | none |
| smoke | `tapper`, `clicker`, `pressUntil`, `colorsAt`, `rigSeed`, `collectErrors`, `expectBundledFont`, `expectButtons` | none |

## Test plan and traceability

| layer | what | requirement |
|---|---|---|
| unit (`shadows.test.ts`) | the six items and their kinds; the four orders pinned; no repeat and no three in a row for 100 seeds; each event in each stage; the grading of a choice; what the shadow heard | REQ-7.3, 7.5 |
| unit (`reducer.test.ts`) | `StartShadows` from the title and the end screen only, with a seed; the events of trial 4 outside it; the other trials' events and `Tick` in trial 4; `Start` and `SetLang`; the score (100 to 300) and the streak; the leave | REQ-7.1, 7.7, 7.8 |
| property (`shadows.pbt.test.ts`) | INV-1 to INV-4 and INV-15 to INV-17 with the new events; INV-46 to INV-53; the generator reaches all four decisions, a second decision, an early next, the later rounds, every item, the end screen, play again and the leave | REQ-7.7, 7.8, 7.12 |
| model (`shadows.model.test.ts`) | 2,664 states; the invariants and goals above; shortest traces; eight deliberate breaks | REQ-7.3, 7.7, 7.12 |
| content (`shadows-content.test.ts`) | keys, placeholders, Japanese rules, English length, the closing line is its own text, no blame, fear or claims | REQ-7.1.6, 7.4, 7.6, 7.11 |
| view (`shadows-view.test.ts`, `title-view.test.ts`, `over-view.test.ts`, `route.test.ts`) | per stage and language: message, tile, badges, bubble, buttons, closing line; the title's words; the end screen's two buttons; the scene choice | REQ-7.1 to 7.7 |
| layout (`shadows-layout.test.ts`, `field-layout.test.ts`) | inside the canvas, no overlap in each stage, targets of 80 or more, the hero's strip, the probes, the title's three buttons, the card and the art | REQ-7.1, 7.9 |
| mutation | any surviving mutant fails | REQ-7.12, 7.14 |
| mobile smoke (`smoke.mobile.shadows.spec.ts`) | real taps; the paths in REQ-7.13; pixels for the badges, the bubble, the message and the closing line; grayscale and silence; ja and en screenshots; the title; offline | REQ-7.1 to 7.13 |
| desktop smoke (`smoke.desktop.shadows.spec.ts`) | the same with the mouse; a held press on a button leaves the hero still | REQ-7.9, 7.13 |

`tasks.md` carries the requirement, test and result for each task.

### How the smoke sees the picture

The shadows are drawn on the canvas, so the DOM has no copy of them and a state that says "given" would pass even if
the bubble stayed empty. The smoke reads points from a screenshot (the probes in `shadows-layout.ts`) and turns each
into brightness with the weights of a grayscale screen, so a grayscale screen reads the same.

| reading | how | measured (Chromium, iPhone 13 profile, 3x) |
|---|---|---|
| the tick, the padlock | a point 12 pixels inside each badge disc, clear of the glyph, the tile's gold frame and the picture; on when brighter than 150 | on 212, off 44 |
| the bubble | its corner reads the face (cream, 239) or the sky (13); then three points in a row across its middle: all darker than 90 is "quiet", otherwise "item" | none 13; quiet 239 then 28, 28, 28; item 239 then at least one of three at 119 or more |
| the message, the closing line | light pixels in their boxes, as trial 1 to 3's smoke counts them; the closing line's box has none while deciding | |
| the buttons | the gold faces (the wide button covers the gap between the narrow ones), as the field's smoke reads them | |

Before a decision the bubble is "none" and the tile has neither badge. The smoke also compares fingerprints of the
tile's picture and of the bubble's contents between two items, so a state that changes with a picture that does not
fails. "Silent" is checked as the field's smoke checks it: wrapping `AudioContext.createOscillator`,
`createBufferSource` and `HTMLMediaElement.play` before the page loads and requiring that none is called.

## Decisions and alternatives

- **One thing at a time, two buttons.** Alternatives: a tray of items and a tap on each one to give it (the tap is
  the decision, so a slip of a 6-year-old's finger gives a secret away; and it has no "I keep it" act, so the child
  never says that a thing is a secret); pick-then-hand-over as in the shed (one more tap per round for a decision the
  child either knows or does not); a sort into two baskets by dragging (two targets and a drag, against the one-finger
  rule). Two buttons with a picture and a word each reads without words and is one tap; naming the category ("Secret")
  is the act the lesson is about.
- **"Secret", not "Keep".** The button names what the item is, not what the child does with it: "Give" or "Secret".
  Alternatives: "Give" and "Don't give" (a negative as a button, harder to read for a 6-year-old); "Yes" and "No"
  (no picture, and a question to answer instead of a decision to make).
- **A decision cannot be taken back.** After "Give" on a secret the round goes on with "Next"; there is no second try
  for that item. The lesson of L4 is that what is told is told; a retry (as in the shed, and in the field after a wrong
  verdict) would teach the opposite. The cost to the child is only the points of the round and the streak, no time,
  and the same item comes back in six rounds. Alternatives: a retry without limit (rejected as above); a life or a
  time penalty for a given secret (a fear of being wrong, which REQ-7.4 rules out).
- **A wrong decision is also told for a thing that is fine to give.** Keeping a candy scores nothing and ends the
  streak, with the plain words "It was fine to give". Without it "Secret" for everything would be the best strategy,
  and the child would learn that everything is a secret, which is the opposite of judging. The streak makes a child who
  always presses the same button score less than a quarter as much as one who looks (over the first eight rounds of
  seed 0: 450 for the same button every time, whichever it is, against 1,900 for eight right decisions; a test pins
  both). Alternatives: a bonus for each secret kept (rewards "Secret" only); no cost for keeping (see above).
- **Why the score does not teach "tap fast".** As in trial 3: a right decision is worth 100 to 300 depending on the
  streak, and a wrong one ends the streak and costs no time. Speed pays only through the number of right decisions,
  and a right decision needs the picture and the name to be looked at first. The items repeat every six rounds, so
  a child who has learned the six is fast and right, which is the point of a game that teaches a fixed list. The
  design does not claim that a real helper's secrets are six things, or that deciding is this fast.
- **A seed and four orders, not a table or a random draw.** A random draw in the domain would break ADR 0001 and make
  the model check infinite; one fixed table lets a child memorize positions. Four hand-written cycles under a seed keep
  the rules checkable (no repeat, no three in a row, all six in six rounds) and make the kinds not alternate, so
  "every other one is a secret" is not a way to play. The cost is one event field and pinned unit tests.
- **The six items.** The learning design says "house key, name, candy". A first name is the one item in that list
  that is not clearly a secret and not clearly fine to give: whether it is a secret depends on who asks, which a
  6-year-old cannot judge, and a rule the game states flatly would be wrong half the time. The address is a secret that
  a child is already told to keep, and a password is the secret of L4 itself (`docs/learning-design.md` says "keys,
  addresses or passwords"). The three that are fine to give are things a child owns and shares without thinking:
  a candy, a ball, a flower. The Japanese for the password is the child's word, "あいことば", not "パスワード".
- **The shadow is a listener, and the wisp is the one who is given.** The child gives to the wisp, and the shadow is
  beside it: whatever is given, the shadow hears. This is the staging device for "something other than the helper may
  see what you give it". It is not stated as a fact about real AI in the game, and the words never say what the
  shadow will do with what it heard (REQ-7.4). Alternatives: the shadow asks for the item (a stranger who asks for a
  key is a different lesson, and "the shadow wants it" is a threat); the shadow is not drawn and only the message says
  what was heard (nothing to see, and the lesson is "a third party", which needs a picture).
- **The face of the shadow.** Round eyes that look at the tile, a flat mouth, a big ear: curious, never angry, never
  smiling at a secret. A smile would make it look pleased when a secret is given; a frown would make it an enemy.
- **The bubble.** The result is told in a picture twice: the item in the bubble for "heard" (and faded on the tile),
  three dots for "heard nothing" (and a padlock on the tile). Alternatives: a color change on the shadow (rejected by
  hard rule 7); a sound (the game plays none).
- **The closing line after every decision.** In the field it came after the keep only, because the lesson there is
  about what the child did across five stars. Here the lesson is about the item (what kind of thing it is) and the
  child may be wrong on any round, so it is shown after every decision, in its own panel with a gold edge, and the
  message says what happened without repeating it.
- **The title's order is trial 4, 3, 2 from the top.** Spec 06 put the field above the shed; continuing upward keeps
  the shed and the field buttons where they are and where their tests have them. The alternative, moving the shed and
  the field down to put the trials in order from the top, changes two layouts and four tests for no change in
  behavior.
- **The title's name, card, wisp and hero move up** (REQ-7.1.1, "Changes to a shared entrance or event"). Alternatives:
  smaller buttons (below the 80 x 80 minimum); two columns of buttons (a label and a caption of 24 characters do not
  fit 190 pixels); a trial-select screen (out of scope, REQ-7.1.5).
- **Button pictures: an arrow and a padlock.** Chosen because both mean what they do without a word or a color, and
  differ in outline. The field's tick and ring of dots stay as they were.
- **`DecideItem`, not two events.** One event with a `choice` keeps `reduceShadows` one case and lets
  `decisionRight` grade a choice before it is applied; two events (`GiveItem`, `KeepItem`) would repeat the guard.
- **Guard by `trial`, not by a new phase.** INV-1 keeps its three phases.
- **No parent text.** The parent screen is out of scope (`parents.*.json` keeps its empty list), so nothing says to a
  parent that the six items are a game and that a real family decides for itself whom to tell. The playtest notes
  in `docs/device-checklist.md` should record what parents say about that.

## Risks

- WebKit does not start in the authoring sandbox (`docs/evidence/didnt-work.md`). The mobile smoke runs there on
  Chromium with the iPhone 13 touch profile, labelled as such; the real WebKit run is CI's. A task is not called done
  until CI's smoke is green.
- Pixel probes depend on the drawing. A change to the badges, the bubble or the tile that moves a probe fails the
  smoke; the probes and the drawing share `shadows-layout.ts`, so the numbers change in one place. The readings sit far
  from their thresholds (212 against 150 and 44; 28 against 90 for quiet dots), which is the margin meant to absorb
  WebKit's anti-aliasing.
- The art is code and is judged by eye in the screenshots. The first house key looked like a birdhouse on a pole in
  the screenshots and was redrawn as a ring bow with a house inside.
- A child may press the same button every time, and the lesson then rests on the messages and the closing line. The
  next playtest should note whether children say the shadow is bad, whether a given secret upsets them, and whether
  they say "a secret" before they press.
- A child may read "the shadow heard the key" as "the shadow will come to my house". The words give no reason to, and
  the playtest should note it; if it happens the line is "heard" and not "knows".
- Six items are few. After one or two runs a child knows them, and the game then rewards speed more than judgment. If
  playtests show it, the lever is more items (and a new table), not a rule.
- The model check has 2,664 states and takes about 1 second; the broken-game runs take 1 to 2 seconds each.
