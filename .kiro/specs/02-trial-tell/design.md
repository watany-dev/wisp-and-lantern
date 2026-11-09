# Design: Trial 1, The Dark Lane

Implements `requirements.md` (REQ-2.n). Follows ADR 0001 (pure reducer), ADR 0003 (gates) and the
layout rules in `.kiro/steering/structure.md`. No new dependency, no new asset, no new ADR.

## Play flow

```text
title --tap--> choosing --PickCard x2--> ready --Ask (tap wisp)--> asked
  ^                ^                                            |
  |                +-------------- Retry (button) --------------+
  +-- (no way back; the title is only shown at load)
```

- `choosing`: the pick has 0 or 1 card, or 2 cards and the child has not asked.
- `asked` with `outcome` `right` or `wrong`: the pick is locked and the result shows.
- `Retry` from a wrong result keeps the wish. `Retry` from a right result moves to the next wish.

## Domain (`src/domain/`)

### Types (`lane.ts`, new)

```ts
export const colors = ["red", "blue", "yellow"] as const;
export const things = ["pumpkin", "lantern"] as const;
export type ColorId = (typeof colors)[number];
export type ThingId = (typeof things)[number];
export type CardId = ColorId | ThingId;
export type Pick = { color: ColorId | null; thing: ThingId | null };
export type Lane = { wish: number; pick: Pick; asked: boolean };
```

`asked: true` means the child tapped the wisp with both cards picked; the helper searched exactly
`pick`. There is no separate "found item": the item is `pick`, so it cannot differ from what was asked
(REQ-2.5).

Pure helpers in `lane.ts`: `initialLane`, `isColor(card)`, `isComplete(pick)`, `wishAt(index)` and
`outcome(lane)` which returns `"choosing" | "right" | "wrong"` (`right` when `asked` and `pick` equals
the wish).

`GameState` gains `lane: Lane`. `phase` stays `"title" | "trial"`, so INV-1 and INV-2 hold unchanged;
`trial` is 0 on the title and 1 in the trial.

### Balance (`balance.ts`)

`wishes`: `[yellow lantern, red pumpkin, blue lantern]`. Each of the six color and object pairs is a
lane slot; a wish is always one of them. Cycling is `(wish + 1) % wishes.length`, so `wish` is bounded
and the model check stays finite. `wispSpeed` is the flight speed for the wisp's decoration.

### Events (`events.ts`)

| event | effect |
|---|---|
| `Start` (existing) | Sets `phase` `trial`, `trial` 1 and the optional `lang`, with no branch and no lane change. From the title this enters the trial; a second `Start` changes only `lang`, because the rest is already set (a stray start never resets a game). |
| `PickCard { card }` | In `trial`, not asked: sets the pick's color or object (by `isColor`). Otherwise no change. |
| `Ask` | In `trial`, not asked, pick complete: `asked = true`. Otherwise returns the same state object (REQ-2.4). |
| `Retry` | In `trial`, asked: pick cleared, `asked` false, `wish` advances only after a right result. Otherwise no change. |
| `SetLang`, `MoveHeroTo` (existing) | Unchanged. They never touch `lane`. |

Events other than these never touch `lane`; lane events never touch `lang` or `hero`. In `title` the
lane events are ignored. `reduce` stays a `switch` that delegates to small functions in `reducer.ts`.

### Named invariants (new, with property tests in the same task)

| id | invariant |
|---|---|
| INV-5 | Over any event sequence, `lane.asked` is false unless the sequence contains an `Ask`. The helper never searches unprompted. |
| INV-6 | `Ask` while the pick is incomplete, or while already asked, returns the same state. A missing card is not a search. |
| INV-7 | When `lane.asked` is true the pick is complete, and every event except `Retry` leaves `lane` equal. What was asked cannot change after the search. |

The model check (`reducer.model.test.ts`) also holds these state invariants: `wish` is an index into
`wishes`; `asked` implies a complete pick; `phase` `title` implies `trial` 0 and the initial lane. Its
goal is the right result, reachable from every state. A second run uses "choosing in a trial" as the
goal, so a wrong result can always be left. Both cover the "no soft-lock" claim (REQ-2.8).

## Content (`src/content/`)

- `cards.json` gets a `kind` (`"color"` or `"thing"`) on every card and two new object cards. Existing
  fields stay (`id`, `color`, `shape`, `pattern`, `label`). For an object card `shape` is the
  silhouette (`pumpkin`, `lantern`), `pattern` is `plain` and `color` is a neutral grey, so the
  existing card gate (unique color, shape, pattern; non-empty fields) passes without a change to
  `scripts/check-*`.
- `strings.ja.json` and `strings.en.json` get a `lane` group. `{0}` stands for the item name (in the right and the different-result messages, REQ-2.5); the gate
  rejects Latin letters in Japanese text, so the placeholder is a digit.

| key | ja | en |
|---|---|---|
| `lane.wish` | ほしいのは これ | I want this one |
| `lane.pickBoth` | いろと ものを えらんでね | Pick a color and a thing |
| `lane.pickColor` | いろを えらんでね | Pick a color |
| `lane.pickThing` | ものを えらんでね | Pick a thing |
| `lane.ready` | ウィスプを タップして⏎たのもう | Tap the wisp to ask it |
| `lane.right` | {0}が⏎ぴったり みつかった | Found the {0}! Just right |
| `lane.wrong` | {0}を⏎もってきたよ | The wisp brought the {0}, just as you asked |
| `lane.again` | もういちど あそぶ | Play again |
| `retry` (existing) | もういちど つたえてみよう | Let's tell it again |

Item names are the card labels joined with a space (ja `あかい かぼちゃ`, en `red pumpkin`). A test
renders every message with every item name and applies the Japanese rules to the result, because the
gate only sees the template.

## Game (`src/game/`)

Plain modules, unit-tested and mutation-tested:

- `lane-layout.ts`: every position and size in one table (game pixels, 390 x 844).

  | thing | center | size |
  |---|---|---|
  | wish text / picture | (130, 62) / (265, 62) | picture 64 |
  | lane slot (color column x thing row) | x 75, 195, 315 for red, blue, yellow; y 170 pumpkin, 270 lantern | 88 |
  | wisp | (195, 370) | tap area 96 |
  | message | (195, 454), wrap width 340 | height 60 |
  | button | (195, 528) | 300 x 80 |
  | color cards | x 75, 195, 315; y 690 | 96 x 92 |
  | object cards | x 135, 255; y 788 | 96 x 92 |

  The hero starts at (195, 600), between the button (ends at y 568) and the color cards (start at y 644), so the floor drag from the
  scaffold keeps a free strip. All hit areas are at least 80 x 80 (REQ-2.11).
- `lane-view.ts`: `laneView(state)` returns what the scene shows, with no Phaser type: the message
  text, the button (`{ text, event }` or none), whether the wisp is `armed`, each card's label,
  picked mark and fade, the wisp's fade, the lit slot, the result mark, the wish item and `wispTarget`. Text is chosen here from `src/content`.
- `pattern.ts`: `patternMarks(pattern, size)` returns plain marks (`line` or `dot`) for `stripes-v`,
  `dots` and `plain`. The drawing code only paints them.

Scene code (excluded from coverage and mutation, so thin: 30 lines per function, complexity 5):

- `scenes/LaneScene.ts`: creates the objects from the layout, subscribes to the game, renders
  `laneView`, dispatches `PickCard`, `Ask` and the button event, moves the wisp with `stepToward`, and
  keeps the scaffold's hero drag for presses that start outside any object.
- `ui/art.ts`: draws cards, items, the star and the dark slots with `Phaser.GameObjects.Graphics`.
- `scenes/TitleScene.ts`: when the phase becomes `trial`, starts `LaneScene`. Its own hero drag
  moves to `LaneScene`.
- `boot.ts`: registers `LaneScene`.

### Why code-drawn art

The placeholder PNGs are solid squares and cannot show a pumpkin, a lantern, a stripe or a dot. Drawing
the six items and five cards in code keeps the bundle free of new assets and licenses (hard rule 5),
and loads nothing after boot (REQ-2.12). The wisp and hero keep their placeholder PNGs, which the
title already loads.

### Input

Interactive objects use `pointerdown` and no drag. A scene-level `pointerdown` handler records whether
the press hit an object; only presses outside every object walk the hero (REQ-2.11). Two active
pointers stay enabled in `boot.ts`; a second finger changes nothing in the trial.

### Offline

The game makes no request after boot. Phaser loads the two PNGs and the CSS loads the font before the
first frame. The smoke switches the browser context offline after the title is up and plays through,
and fails on any request made after that. A service worker is out of scope: "offline after the first load" is
met because nothing is fetched later.

## Test plan and traceability

| layer | what | requirement |
|---|---|---|
| unit (`reducer.test.ts`) | every event and branch of the lane rules | REQ-2.1 to 2.8 |
| property (`reducer.pbt.test.ts`) | INV-1 to INV-7 over random sequences that now include the lane events | REQ-2.3, 2.4, 2.5, 2.14 |
| model (`reducer.model.test.ts`) | all reachable states: invariants, right result reachable, choosing reachable | REQ-2.8 |
| content (`src/content/__tests__`) | cards match the domain ids; every rendered message obeys the Japanese rules | REQ-2.9, 2.10, 2.13 |
| unit (`src/game/__tests__`) | layout, `laneView`, `patternMarks` | REQ-2.2 to 2.7, 2.10, 2.11 |
| mutation (`npm run mutation`) | any surviving mutant fails | REQ-2.14, 2.15 |
| mobile smoke (`e2e/smoke.mobile.spec.ts`) | real taps: missing card, wrong item, retry, right item, in ja; the full run again offline | REQ-2.1 to 2.8, 2.11, 2.12 |
| desktop smoke | mouse-only run; hero drag still works; a held press on a card leaves the hero still | REQ-2.9, 2.11 |

`tasks.md` carries the requirement, test and result for each task.

## Decisions and alternatives

- **Missing card does nothing.** The request asks for it; a "wrong thing for a missing card" would
  need an invented fallback item. The lesson of a vague request is carried by the exact-but-different
  result of a wrong pick.
- **`asked` is a boolean, not a stored item.** Smaller state, and exactness holds by construction.
- **Retry clears the pick.** A kept pick would let a child change one card without looking at the
  other; clearing asks for a fresh, deliberate request. Revisit after a playtest.
- **Wish stays after a wrong result, advances after a right one.** The child retries the same task, then
  gets a new one.
- **Tap the wisp to ask** (device-checklist wording: "tapped the helper to send it"), not a text button.
- **No in-game language switch.** The Japanese label for the other language would need kanji or Latin
  letters, which the Japanese rules forbid; parents use `?lang=`. The parent screen is out of scope.
- **No random wish.** Randomness would have to come in through an event; a fixed cycle is enough.

## Risks

- WebKit does not start in the authoring sandbox (missing system libraries). The mobile smoke is
  run there on Chromium with the iPhone 13 touch profile, and on WebKit by CI only.
- Hero drag and card taps share the canvas. The "press outside every object" rule is covered by the
  existing desktop drag test and a new desktop test (a held mouse press on a card leaves `hero`
  unchanged). A touch tap is too short to walk the hero, so the mobile smoke cannot see this case.
