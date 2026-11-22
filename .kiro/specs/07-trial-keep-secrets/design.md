# Design: Trial 4, The Listening Shadows

Implements `requirements.md` (REQ-7.n). Follows ADR 0001 (pure reducer), ADR 0003 (gates) and the layout rules in
`.kiro/steering/structure.md`. No new dependency, no new asset, no new ADR: the reducer stays pure and the scene
stays thin, which ADR 0001 and 0003 already say. The module layout copies trial 3's (`06-trial-verify-stars`,
revision 3), so a reviewer who knows the field knows the bag: a small domain module with its own reducer, a view
function that returns plain data, a layout table, a thin scene, and the shared run, top row, "Title" button and end
screen.

## What the child does

```text
title  --tap the bag button (the game draws a seed)--> giving, round 0, nothing given
giving --GiveItem i, i is safe and still with the child--> giving, i given (message: safe to give), scores
giving --GiveItem i, i is the last safe thing--> done (the closing line, "Next"), scores
giving --GiveItem i, i is a secret--> giving, nothing given (message: a secret, a shadow may be listening), streak ends
giving --GiveItem i, i given already or not a thing--> same state
done   --RetryBag ("Next")--> giving, the next round
any    --Tick, the clock reaches zero--> over (the end screen; the bag is kept as it was)
over   --StartBag ("Play again")--> giving, round 0 of a new seed, a new run (the best kept)
any    --LeaveBag ("Title", in a run or on the end screen)--> title
```

The child's only decision is which things to tap. The game never hands a secret over, whatever the child taps, so a
secret is safe by a rule of the reducer (INV-47), not by the screen.

## Domain (`src/domain/`)

### State

`GameState` gains one field and no new `phase`:

```ts
// bag.ts
export const itemCount = 5;
export const bagRounds = 4;    // rounds before the table starts again (even, so neighbours differ)
export const safeItems = ["candy", "flower", "acorn", "leaf"] as const;
export const secretItems = ["key", "address", "password"] as const;
export type ItemId = SafeItem | SecretItem;
export type Bag =
  | { stage: "giving"; seed: number; round: number; given: readonly boolean[]; last: number | null }
  | { stage: "done"; seed: number; round: number };
export const initialBag: Bag = { stage: "giving", seed: 0, round: 0, given: [false x5], last: null };

// state.ts
export const trials = { lane: 1, shed: 2, field: 3, bag: 4 } as const;
export type GameState = { /* as before */ bag: Bag };
```

Why this shape:

- **The truth is not stored.** Which things a round has, and which are secrets, is a function of `seed` and `round`
  (`itemsOf`). The state holds only what the child did: which things were handed over (`given`) and the last thing
  tapped (`last`). So a mark can never disagree with the round.
- **`given` can only hold safe things.** The reducer sets `given[i]` only when thing `i` is safe. There is no
  branch that hands a secret over, so "a secret is never handed over" (INV-47) is a property of the reducer and is
  checked by the property test and the model check over every reachable state.
- **`last` is for the message.** The view is a function of the state only, so the state remembers the last tap:
  `GiveItem` on a thing that is still with the child sets it, whether the thing was safe (handed over) or a secret
  (held back). Whether the last tap was a secret is derived (`isSecretAt`).
- **`done` has no more fields.** It is reached with every safe thing given, so the marks are known (every safe
  thing given, every secret kept); storing them again would be a second copy.
- **`phase` stays `title | trial | over`.** The bag is `phase` `trial` with `trial` 4; the scene follows `trial`.
  **`bag` is always present** and is `initialBag` everywhere except while `trial` is 4 (INV-53).
- **`round` is bounded**: 0 to 3, so the state space is finite for the model check; `RetryBag` wraps from 3 to 0.

### The things of a round: a seed, not a table

`itemsOf(seed, round)` gives the five things of a round, in their places 0 to 4. The number of secrets is one in the
even rounds and two in the odd ones. A small linear congruential step on integers (`Math.imul`, no `Math.random`, no
clock), seeded by `seed` and `round`, draws that many distinct secrets from the three, the rest (4 or 3) distinct
safe things from the four, and then the order of the five.

- **Why a seed.** With a fixed table a child who plays twice would learn "the third card is the one to keep" and stop
  reading the things, which is the opposite of the lesson. The unit tests pin the exact things of seeds 0 to 3.
- **Where the seed comes from.** The title scene and the end screen draw it with `newSeed()` (`src/game/seed.ts`,
  the field's) and send `StartBag { seed }`. The domain stores it whole (`seed >>> 0`) and never draws a number.
- **Neighbouring rounds differ.** The number of secrets alternates 1, 2, 1, 2, so two rounds in a row, and the wrap,
  never have the same set.
- **Every secret comes up.** Over many seeds each secret and each safe thing appears in every place (checked by a unit
  test: no place is always safe, no secret never appears).

Functions (`bag.ts`): `itemsOf`, `itemAt`, `isSecret`, `isSecretAt`, `newBag`, `isDone`, `givenItems`, `handOver`
(whether a tap on thing `i` hands it over: `true`, `false` for a secret held back, or `null` when there is nothing to
do), `reduceBag` (returns `bag` itself when nothing changes).

`reduceBag`:

- `GiveItem { index }`: while giving, when `index` is an integer from 0 to 4 and that thing is not given yet. A safe
  thing becomes given and `last` becomes `index`; if no safe thing is left, the bag becomes `done`. A secret changes
  only `last`. Otherwise no change.
- `RetryBag`: from `done`, a fresh `giving` of the next round (`(round + 1) % 4`), same seed. Otherwise no change.

### Events (`events.ts`) and the reducer

```ts
export type BagEvent = { type: "GiveItem"; index: number } | { type: "RetryBag" };
export type GameEvent = /* as before */ | { type: "StartBag"; seed: number } | { type: "LeaveBag" } | BagEvent;
```

Where each event applies ("same" means the same state object is returned):

| event | `title` | trials 1 to 3 | trial 4 (bag) | `over` |
|---|---|---|---|---|
| `Start` | begins a run (trial 1) | language only | language only | begins a run (trial 1; the bag is dropped) |
| `StartBag { seed }` | begins a run of the bag | same | same | a new run if the end screen is the bag's, otherwise same |
| `Tick` | same | the clock | the clock | same |
| `GiveItem` | same | same | `reduceBag`, and scores | same |
| `RetryBag` | same | same | `reduceBag` | same |
| `LeaveBag` | same | same | the title | the title if the end screen is the bag's, otherwise same |
| other trials' events | as before | as before | same | as before |
| `SetLang`, `MoveHeroTo` | as before | as before | as before | as before |

`reducer.ts` gains `startBag` (like `startField`), `leaveBag` (like `leaveField`), and `reduceBagTrial` for the two
bag events, guarded by `inTrial(state, trials.bag)`. `GiveItem` goes to `giveItem`, which asks `handOver` whether the
tap hands a thing over and scores it with `scoreSearch` like the shed's `give`. `reduceTrial` would pass the lint
limit of 15 with two more cases, so its default branch sends the field's and the bag's events to
`reduceLaterTrial`, which picks one of the two (no behavior change for the field). `Start` also resets the bag, and
`tick` runs in trial 4. Every earlier guard already tests its own trial number, so trials 1 to 3 need no code change
to ignore trial 4.

`LeaveBag` and `StartBag` change more than `bag`: they set `phase`, `trial`, `bag` and restart `run` (only the best
is kept). That is why INV-53 leaves them out and INV-56 and INV-57 have their own rules.

### Why the secrets are named and the game holds them back (REQ-7.6.4)

The trial is a staged scene for one idea (L4): a key, an address and a password stay with me, even when a helper is
ready to take things, because someone else may be listening. To let a 6-year-old practise that, the game names the
three secrets on the screen (the guide in words, the rule card in pictures), and holds a tapped secret back. This is
a rule of the game, not a claim about real AI or real privacy:

- Real privacy is harder. Real secrets are not labelled, and a real app or agent will take what it is given. The game
  does not say otherwise: its words say only what happened to these five things.
- The game holds a secret back instead of letting it "go" to the shadows. Showing a secret taken, heard or lost would
  teach through a small fright, which `docs/learning-design.md` rules out ("Fear as a way to make children obey"). The
  hold-back keeps the consequence out of the picture; the message says why it matters (a shadow may be listening),
  and the score says it was not the thing to tap.
- The shadows are listeners, not enemies. They are drawn soft, with round eyes and a big ear, and they do nothing.
  They never move toward a thing, never take one, and are never said to be bad. The message says "may be listening"
  (`きいてるかも`), not "is listening" or "will take".
- The wisp is not the danger either. It never asks for a secret and its face does not change. The lesson is that a
  secret is not given to anyone, the helper included; the shadows are why.
- A child can tap every card. Each secret tap is held back with the same kind message and ends the streak, so the
  cheap path costs points, not fear. A child who reads the things scores more.

### Invariants

The new ones are in `requirements.md`. Their scope with respect to the existing ones:

| id | covers | with the bag |
|---|---|---|
| INV-1, INV-2 | `phase`, `trial` | global; `trial` may be 4. Re-run over sequences with the bag events |
| INV-3, INV-4 | no mutation, determinism | global; re-run over sequences with the bag events (`bag.pbt.test.ts`) |
| INV-5, INV-8 to INV-14, INV-18 to INV-24, INV-26 to INV-45 | the lane, the shed, the field | unchanged; they hold on every sequence because INV-53 and INV-54 keep the bag and the other trials apart |
| INV-15 to INV-17 | the run | widened to the bag (`bag.pbt.test.ts`) |
| INV-46 | the round | new |
| INV-47 to INV-50 | the hand-over and the hold-back | new |
| INV-51, INV-52 | the done round and the next | new |
| INV-53, INV-54 | the bag and the other trials | new |
| INV-55 to INV-57 | the score, the start, the leave | new |

### Model check (`bag.model.test.ts`)

Scope: the entrance from the title by the bag button with two seeds, every state after it (the run, the rounds, the
end screen), and the leave back to the title. It does not ask that every state of trials 1 to 3 can reach the bag,
and it drops no state of the bag to pass. The model checks of trials 1 to 3 are not changed.

The alphabet is finite and includes events that must not matter: `StartBag` for seeds 0 and 1, `SetLang` (ja, en),
`MoveHeroTo` (two positions), `GiveItem` for each thing and for two indexes that do not exist, `RetryBag`,
`LeaveBag`, a half-run `Tick` (30,000 ms) and a run-ending one, one trial 1 card, `Ask`, `Retry`, the shed's and the
field's events. Inside a run also `Start`, `Start` with a language, `StartShed` and `StartField`.

The model wraps the real reducer's state with an independent record written from the spec and not from the reducer
(`record`: the stage, seed, round, the things given and the last tap; `null` on the title), `left` (the milliseconds
on the clock: 60,000, 30,000 or 0) and `scoreOk`. The test has its own copy of the things of seeds 0 and 1, so a
change to `itemsOf` fails the test. A state's identity leaves out the language and the hero, keeps the clock exactly,
and keeps the score and the best only as "none" or "some".

| check | what |
|---|---|
| invariants | the title and the record agree; the clock agrees with the record and the run is over exactly when it is zero; `bag` is initial outside trial 4; the lane, the shed and the field stay initial; the bag equals the record; no secret is ever given; a round is done only when the record says every safe thing was given; the score moves only as the spec says |
| goals | from every state: a done round; the title; the end screen; a fresh round; a score; a second done round (round 1 or later) |
| goal without the clock and the leave | a done round and a second done round are still reachable: the bag's own taps give a way on |
| witnesses | the shortest trace to a secret tap (2 events), to a score (2), to a done round (the entrance and one tap per safe thing), to the end screen (2), and the way back from a run and from the end screen (1 each) |
| number of states | 1,442, recorded in the test |

It must fail when the rules are broken on purpose, and the counterexamples are kept in the test (each break is a
wrapper `step` around the real `reduce`; no source is edited):

| deliberate break | which check fails |
|---|---|
| a secret tap hands the secret over | "no secret is ever given", after 2 events |
| a safe tap hands over nothing | the bag differs from the record |
| a tap hands over the thing next to the one tapped | the bag differs from the record |
| the round is done with a safe thing left | the done-too-early invariant |
| a secret tap scores | the score invariant |
| a secret tap keeps the streak | the score invariant |
| `RetryBag` is ignored | the second done round is unreachable |
| `LeaveBag` is ignored | the title is unreachable once the bag is entered |
| `Tick` is ignored in the bag | the end screen is unreachable |
| the end screen takes nothing | the title is unreachable once the time is up |

As in the field's model check, a broken game drifts away from the record, so the broken checks use one seed, a small
alphabet, and one state for all states that already break an invariant.

## Content (`src/content/`)

A `bag` group is added to `strings.ja.json` and `strings.en.json` under the same keys. `{0}` is a thing's name or a
number. `⏎` is a line break.

| key | ja | en | used |
|---|---|---|---|
| `bag.enter` | ないしょを まもろう | Keep the secrets | the title's bag button |
| `bag.timeAttack` | 60びょうで いくつ？ | How many in 60 seconds? | its caption |
| `bag.guide` | かぎ じゅうしょ あいことば⏎だれにも わたさないよ | Keys, address, password:⏎never give them to anyone | the top, always |
| `bag.start` | ウィスプに わたすものを⏎えらんで タップしてね | Tap the things that are⏎OK to give the wisp | nothing tapped yet |
| `bag.given` | {0}は⏎わたして だいじょうぶ | The {0} is safe to give | a safe thing handed over |
| `bag.secret` | {0}は ないしょ！⏎かげが きいてるかも | The {0} is a secret!⏎A shadow may be listening | a secret tapped |
| `bag.done` | いいものを⏎{0}こ わたせたよ | You gave {0} safe things | a done round (3 or 4) |
| `bag.lesson` | ないしょは まもって⏎いいものだけ わたせたね | You kept the secrets⏎and gave the safe ones | closing line, after every done round |
| `bag.next` | つぎへ | Next | after a done round |
| `bag.items.candy` | あめ | candy | |
| `bag.items.flower` | はな | flower | |
| `bag.items.acorn` | どんぐり | acorn | |
| `bag.items.leaf` | はっぱ | leaf | |
| `bag.items.key` | おうちの かぎ | house key | |
| `bag.items.address` | じゅうしょ | address | |
| `bag.items.password` | あいことば | password | |

Why these words:

- **The guide is the lesson's own sentence** ("鍵・住所・合言葉は誰にも渡さない" in kana): the three secrets and
  "never to anyone" (`だれにも`). It stays on screen, so the child can check it at any time.
- **`かぎ` in the guide, `おうちの かぎ` on the card.** Trial 2 asks the child to hand the wisp a key (the shed's,
  a tool). The card here says "house key" so the two do not read as the same thing; the guide names all keys.
- **`じゅうしょ` and `あいことば`** are the plain words for address and password that a 6-year-old meets ("おなまえと
  じゅうしょ", "あいことばは？"). The pictures (a house with a pin, a speech bubble with hidden letters) carry them
  for a child who cannot read yet. Both are marked "playtest".
- **A safe hand-over says why it was fine** (`わたして だいじょうぶ` / "safe to give"), so the child hears the rule
  from both sides, not only when something is held back.
- **A secret tap names the fact and the reason, softly.** `ないしょ！` / "is a secret!" names it; `かげが きいてるかも`
  / "A shadow may be listening" is the reason, with "may" (`かも`). No word of blame, danger or loss; a content test
  checks that with word lists of its own.
- **The closing line** looks back at both halves of what happened: the secrets stayed, and only safe things went.
  It shares no sentence with the guide or the done message.
- **`つぎへ` / "Next"** are the lane's words for its own next button (`lane.again`), so a child already knows them;
  the bag has its own key so the two can change apart.
- **No name item.** A first name is safe in some places and not in others; the game does not teach either way.
- **Not run:** the `kid-reader` agent cannot be run from this session; its rubric is applied by hand (see the pull
  request). `じゅうしょ`, `あいことば` and `かげが きいてるかも` are marked "playtest".

A content test renders every message that takes a name with every name it can take (`given` with the four safe
things, `secret` with the three secrets) and `done` with 3 and 4, and applies the Japanese rules and the English
lengths. `lane`, `shed`, `field` and `run` strings are not changed.

## Game (`src/game/`)

### Entrance and scene choice

- `TitleScene` gets a third entrance from the same `createEntrance` (picture, label, caption); its handler dispatches
  `StartBag { seed: newSeed() }`. The "a press that hit no object starts trial 1" guard covers it.
- `route.ts`: `sceneFor(state)` returns `"bag"` for `trial` 4 (`SceneKey` gains `"bag"`); the trial-to-scene choice
  becomes a lookup table.
- `boot.ts` registers `BagScene`.
- `over-view.ts` names the bag's two actions (`playBag`, `leaveBag`); `OverScene` turns them into `StartBag` with a
  new seed and `LeaveBag`.

### The title (`title-layout.ts`, `field-layout.ts`, `bag-layout.ts`)

Three buttons need 88 more pixels than two. The field's and the shed's buttons stay where they are; the bag's goes
above the field's, at (195, 560), 8 apart. Everything above moves up:

| thing | before | after |
|---|---|---|
| the name | (195, 230) | (195, 160) |
| trial 1's card | (195, 372), 340 x 144 | (195, 300), 340 x 144 |
| its "tap to start" | (195, 338) | (195, 266) |
| its 60 seconds | (195, 400) | (195, 328) |
| the wisp | (285, 538) | (285, 444) |
| the hero | (110, 548) | (110, 454) |
| `titleArtBottom` | 606 | 512 |

The card ends at 372, above the wisp's head (382) and the hero's hat (390); the art ends at 509, above the bag button
(520). The middle of the canvas (195, 422), where the smoke taps to start trial 1, is on no button.

### Layout (`bag-layout.ts`)

All numbers are game pixels on the 390 x 844 canvas. The guide is the shed's (`guideText`), the top row the lane's,
the "Title" button the shed's (`leaveButton`), the wide button the field's (`buttonRects.single`), the wisp the
field's place (`fieldWisp`).

| thing | center | size |
|---|---|---|
| guide | (195, 68) | wrap 340, 2 lines |
| things 0, 1, 2 | (75, 160), (195, 160), (315, 160) | 104 x 100 |
| things 3, 4 | (135, 268), (255, 268) | 104 x 100 |
| message | (195, 354) | wrap 340, height 60 |
| rule card, then the closing line | (195, 440) | 340 x 96 |
| "Next" | (195, 534) | 300 x 80 |
| the wisp (not a target) | (195, 720) | art 60 |
| the shadows (not targets) | (92, 708) and (298, 708) | about 56 x 72 |
| "Title" | (347, 788) | 80 x 80 |
| title's bag button | (195, 560) | 300 x 80 |

Inside a card (offsets from its center): the picture at (0, -12), 48 across; the name at (0, +32) in 16 px; the tick
badge and frame of `drawPickedMark` (the badge at (44, -42)); the padlock badge at the top left (-38, -36), radius 13. The tick and the padlock are on
opposite corners and have different shapes, so a handed-over thing and a kept secret differ by shape and place.

The rule card shows the three secrets' pictures at x 105, 195 and 285, 44 across, each with a padlock badge. After a
done round the same panel holds the closing line with a gold edge, so the layout does not jump between stages.

**Probes** for the smoke: the tick badge's upper half (`givenProbe(i)`, gold only on a handed-over thing), the padlock
badge's dark disc left of the padlock (`keptProbe(i)`, dark only on a secret of a done round; the card is cream), the
rule card's padlocks on their white bodies (`ruleProbes`), the red head of the pin on the rule card's address picture
(`rulePinProbe`), the lesson panel's gold edge, and the text boxes of the message and the closing line.

The rule card is told from the closing line by the pin's red, not by the padlocks: the closing line lies over the
padlocks, so a padlock left under it is partly covered and "all three white" is false whether the card is gone or not.
The closing line has no red. The pin's offset (`addressPin`) is in `bag-layout.ts`, and `ui/bag-items.ts` draws the
pin from it, so the drawing and the probe cannot drift. Measured on Chromium (iPhone 13 profile, 3x): about 55 red
CSS pixels around the pin while the card is shown, 0 after a done round, and about 5 when a scene broken on purpose
leaves the card under the closing line; the smoke asks for more than 20 and less than 1.

### View (`bag-view.ts`)

`bagView(state)` returns plain data; the scene draws it:

```ts
type ItemView = { index; item: ItemId; label: string; given: boolean; kept: boolean };
type BagView = {
  guide: string; message: string; items: ItemView[];
  rules: readonly SecretItem[] | null;   // the rule card while a round is played
  lesson: string | null;                 // the closing line, once a round is done
  buttons: ButtonView[];                 // "Next" once done; the field's button shape
  leave: string;
  last: { index: number; secret: boolean } | null;   // for the flourish
  finished: boolean;
};
```

The message is `done` (with the number) after a done round, `start` before any tap, `given` (with the name) after a
safe hand-over, and `secret` (with the name) after a secret tap. Helpers `justGiven` and `justHeld` compare the view
before and after for the scene's flourish and the points pop; they compare by value, so a change of language does
not replay them.

### Scene (`scenes/BagScene.ts`) and art (`ui/`)

Thin, like `FieldScene`: create the objects from the layout, subscribe to the game, render `bagView`, dispatch
`GiveItem` for a card's tap and the button's event for "Next", dispatch `Tick` from `update`, and play a short
flourish. The fields are reset in `create`, because Phaser reuses the scene object. The hero floor drag is the field's.

Painting is code only: `ui/bag-items.ts` (the seven pictures and the padlock), `ui/item-card.ts` (the card: face,
picture, name, tick, padlock), `ui/shadow.ts` (a shadow: a soft dark body, round eyes, a big ear), `ui/bag-rules.ts`
(the rule card and the closing line). "Next" reuses `ui/field-buttons.ts` (its lock of 450 ms included). The key's
picture is the shed's key (`drawTool`) with a small house on its bow. The flourish: a hand-over sends a copy of the
picture to the wisp, which hops once, and pops the points; a secret tap makes the card wobble once and the shadows'
ears twitch once; a done round sends sparks from the wisp. No red, no shake of the screen, no sound.

## Reuse and alternatives

| need | reused | alternative and why not |
|---|---|---|
| state and events | `reduce`, `GameState`, `GameEvent`, `createGame`, `window.__game` | a second store: not needed |
| the bag's rules | the `reduceField` pattern | putting the things into `Shed` or `Field`: breaks INV-18 to INV-45 |
| events | new `StartBag`, `GiveItem`, `RetryBag`, `LeaveBag` | reusing `GiveTool` or `KeepStars`: a shared name lets one trial's handler act on another's state |
| run, top row, end screen, "Title" | `Run`, `scoreSearch`, `createHud`, `hudView`, `OverScene`, `createLeaveButton` | none needed |
| the wide button and its lock | `ui/field-buttons.ts`, `button-lock.ts` | a copy: two buttons that must behave the same |
| the key | `drawTool(g, "key", …)` | a new key drawing |
| property and model tests | `checkProperty`, `checkModel` | none |
| smoke | `tapper`, `clicker`, `pressUntil`, `pixels.ts`, `colorsAt`, `collectErrors`, `expectBundledFont` | none |

## Test plan and traceability

| layer | what | requirement |
|---|---|---|
| unit (`bag.test.ts`) | `reduceBag` for each event in each stage; `itemsOf` pinned for seeds 0 to 3 and its spread; `handOver`, `givenItems`, `isDone`; a repeated secret tap; an index out of range; the last safe thing; the lock of a done round; the next round and the wrap | REQ-7.3 to 7.5 |
| unit (`reducer.test.ts`, new cases at the end) | `StartBag` from the title and the bag's end screen only; the bag events outside the bag; the other trials' events in the bag; `Tick`, `Start`, `SetLang` in the bag; the score; time up; play again; the leave; `lane`, `shed` and `field` untouched | REQ-7.1, 7.7, 7.8 |
| property (`bag.pbt.test.ts`) | INV-1 to INV-4 with the bag events; INV-46 to INV-57; INV-15 to INV-17 for the bag; coverage of the situations | REQ-7.8, 7.12 |
| model (`bag.model.test.ts`) | the state space and goals above; deliberate breaks | REQ-7.4, 7.5, 7.7, 7.12 |
| content (`bag-content.test.ts`) | same keys; placeholders; Japanese rules with every name inserted; English lengths; no blame or fear words; no claims; the guide names the three secrets; the closing line is its own text | REQ-7.4, 7.6, 7.11 |
| view (`bag-view.test.ts`, `title-view.test.ts`, `over-view.test.ts`) | per stage and language: message, items, marks, rule card, the closing line only after a done round, "Next" only then; the flourish helpers; the title's words; the end screen's buttons | REQ-7.1 to 7.7 |
| layout (`bag-layout.test.ts`, `field-layout.test.ts`, `route.test.ts`) | inside the canvas, no overlap, targets of 80 or more, the hero strip free, the probes where they say; the title's three buttons and card apart; the scene follows `trial` | REQ-7.1, 7.8, 7.9 |
| mutation | any surviving mutant fails | REQ-7.12, 7.14 |
| mobile smoke (`smoke.mobile.bag.spec.ts`) | real taps; the paths in REQ-7.13; pixels for the tick, the padlocks, the rule card, "Next" and the closing line; ja and en screenshots; the title; offline | REQ-7.1 to 7.13 |
| desktop smoke (`smoke.desktop.bag.spec.ts`) | the same with the mouse; a held press on a thing leaves the hero still | REQ-7.9, 7.13 |

## Decisions and alternatives

- **One tap hands a thing over; there is no "keep" button.** Alternatives: a "give / keep" pair of buttons for each
  thing (trial 3's look-and-decide, one more step per thing, and a second "keep" action that does nothing to the
  state); dragging a thing to the wisp or to a pocket (a drag, against the one-finger tap rule); a "done" button that
  the child presses when they think they are finished (it makes "give nothing" a way to finish). With one tap, keeping
  a secret is simply not handing it over, which is the real-life habit, and the round ends when every safe thing is
  gone, so there is always something to do and the secrets are what is left.
- **A tapped secret is held back, not taken.** Alternatives: the secret goes to the wisp and a shadow "hears" it (a
  small fright, ruled out by the learning design; it would also put a secret into the state, against INV-47); the
  round fails and restarts (a punishment, and a lost round for a 6-year-old). Holding it back with a kind message, and
  ending the streak, keeps the cost in the score.
- **The shadows sit beside the wisp and do nothing.** They stand for "someone may be listening" to what is handed to
  the helper. Alternatives: shadows that move toward the cards (a chase, which is fear), shadows that grab a secret
  (fear, and a secret leaves), no shadows at all (the trial's name and the reason for the rule would be missing).
- **The secrets are named on the screen (the guide and the rule card).** The lesson is the rule itself, so the child
  practises applying it; a hidden rule would turn the trial into guessing. The rule card puts the rule in pictures for
  a child who cannot read yet. The alternative of learning the secrets only from the messages after a tap would teach
  by mistakes, which is the cost this design keeps small.
- **Safe things are candy, a flower, an acorn and a leaf; secrets are the house key, the address and the password.**
  The request names the key, the address, the password and candy. The learning-design row listed "house key, name,
  candy" as safe, which contradicts L4; the row is corrected (REQ-7.14.4). A name is left out of both groups (see
  Content).
- **The round is done automatically when the last safe thing is handed over.** Alternatives: a keep button like the
  field's (one more step that adds no decision); a timer per round (a second clock). The done round waits for "Next"
  so the child can see the closing line and the padlocked secrets.
- **One or two secrets, alternating.** Two neighbouring rounds always differ, and a child cannot count "keep two" as
  a rule. Three secrets would leave two safe things, a very short round.
- **A seed, not a table**, like the field's, so the places of the secrets change from visit to visit.
- **The same 60-second run as trials 2 and 3**, with the same score (100 plus 50 per hand-over in a row, up to 4).
  Trials 2 and 3 were changed to this after playtest comments; starting the new trial there avoids the same comments.
  Why the score does not teach "tap fast": a secret tap ends the streak, so a child who taps every card loses the
  streak bonus (up to 200 a hand-over) every round. The worked case: eight safe hand-overs in a row score 1,900; the
  same eight with a secret tapped before the first and before the fifth score 1,400. The speed is rewarded only
  through the number of safe hand-overs.
- **Separate events and a `trial` guard, not a new phase**, as in trials 2 and 3 (INV-1 keeps its three phases).
- **The bag button goes above the field's, and the title moves up.** The other two buttons keep their places, so the
  smoke of trials 2 and 3 taps where it did. The only pinned value that changes is `titleArt` in
  `field-layout.test.ts`, with the reason in `tasks.md`.
- **The key is the shed's key picture plus a small house**, and its name is "house key", so it does not read as the
  shed's tool. The game does not say the shed's key was wrong to give: it was a tool for the shed.
- **"Next" reuses the field's wide button** (same place, same lock), so a quick double tap on the last safe thing and
  then on "Next" cannot skip the done screen: the cards are not where the button is, and the button ignores presses
  for 450 ms after it appears.
- **The model's `record`** is in the test, not in `GameState`: the game has no use for it.

## Risks

- WebKit does not start in the authoring sandbox (`docs/evidence/didnt-work.md`). The mobile smoke runs there on
  Chromium with the iPhone 13 touch profile, labelled as such; the real WebKit run is CI's.
- A child may tap every card, and the lesson then rests on the messages, the rule card and the closing line. The next
  playtest should note whether children leave the secrets alone after the first rounds, whether they can say in their
  own words why the key, the address and the password stay with them, and how they read "a shadow may be listening"
  (curious, or scared).
- `じゅうしょ` and `あいことば` may be new words for some 6-year-olds; the pictures carry them, and the playtest should
  note whether they do.
- A child may read the held-back secret as "the game took care of it for me". The message says "it is a secret",
  which puts the decision back with the child; the playtest should note it.
- The pixel probes depend on the drawing. The probes and the drawing share `bag-layout.ts`, so a moved badge fails in
  one place.
