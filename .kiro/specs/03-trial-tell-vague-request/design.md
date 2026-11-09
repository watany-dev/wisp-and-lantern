# Design: a vague request brings a different item

Implements `requirements.md` (REQ-3.n). Follows ADR 0001 (pure reducer), ADR 0003 (gates) and the
layout rules in `.kiro/steering/structure.md`. No new dependency, no new asset, no new ADR. It changes
`02-trial-tell`'s design in the places the table in `requirements.md` names, and nowhere else.

## Play flow

```text
choosing --PickCard--> choosing   (0, 1 or 2 cards)
choosing --Ask, >= 1 card--> result (right | wrong, with the item that was brought)
choosing --Ask, 0 cards--> choosing (same state; the message invites a card)
result   --Retry--> choosing      (same wish after wrong, next wish after right)
```

Before: `Ask` needed 2 cards. After: `Ask` needs 1 or 2. A result for one card is a vague result.

## Domain (`src/domain/`)

### State: unchanged

`Lane = { wish, pick, asked }` stays. The brought item is **not** stored. It is a function of `pick`
and `wish`, so storing it would copy state that can only go out of step (the old design made the same
choice: "no separate found item"). It also makes INV-11 to INV-13 true by construction of one function
instead of by agreement between two fields. The doc comment on `Lane` changes: `asked` now means "the
child tapped the wisp with at least one card picked".

### Functions (`lane.ts`)

```ts
export function hasPick(pick: Pick): boolean;                 // color !== null || thing !== null
export function canAsk(lane: Lane): boolean;                  // !lane.asked && hasPick(lane.pick)
export function deliver(pick: Pick, wish: Wish): Wish;        // the rule below
export function delivered(lane: Lane): Wish | null;           // lane.asked ? deliver(pick, wish) : null
export function outcome(lane: Lane): Outcome;                 // see below
```

`isComplete` stays: the view uses it to tell a complete request from a vague one.

`deliver` is total, so it has no branch for a case that cannot happen:

```ts
const following = <T>(order: readonly T[], item: T): T =>
  order[(order.indexOf(item) + 1) % order.length]!;

deliver(pick, wish) = {
  color: pick.color ?? following(colors, wish.color),
  thing: pick.thing ?? following(things, wish.thing),
}
```

`outcome(lane)`: `"choosing"` when `delivered(lane)` is null; otherwise `"right"` when the brought item
equals the wish, else `"wrong"`. A vague request is `"wrong"`: it never equals the wish (REQ-3.3.5).

`asked` with an empty pick cannot be reached (`Ask` needs `hasPick`), and the model check holds that as
a state invariant. For that unreachable state `deliver` still returns an item, by the same rule.

### The rule (REQ-3.3)

What the child said is kept. What the child left out is filled in by the wisp, from the wish:

- the missing **object** is the one after the wish's object in `things` (pumpkin, lantern; wraps);
- the missing **color** is the one after the wish's color in `colors` (red, blue, yellow; wraps).

So the brought item matches the child's words and differs from the wish exactly where the child said
nothing. The child sees a right color with a wrong object, or the reverse, and the fix is to say the
missing part. Both lists are the order already in the domain, so no new constant exists.

For a color-only request `x` the item is `(x, other object)`; it depends only on the wish's object. For
an object-only request `y` it is `(next color, y)`; it depends only on the wish's color.

Brought items for the three wishes of `balance.wishes`, for every single card (the unit test writes
all 30 rows, for all six possible wishes, by hand, not computed with the rule):

| wish | red only | blue only | yellow only | pumpkin only | lantern only |
|---|---|---|---|---|---|
| yellow lantern | red pumpkin | blue pumpkin | yellow pumpkin | red pumpkin | red lantern |
| red pumpkin | red lantern | blue lantern | yellow lantern | blue pumpkin | blue lantern |
| blue lantern | red pumpkin | blue pumpkin | yellow pumpkin | yellow pumpkin | yellow lantern |

With both cards the item is the pair itself, so `red` + `lantern` for the yellow lantern wish brings the
red lantern, as before.

### This is a staging device, not a claim about AI

The fill-in is a fixed, visible rule so a 6-year-old can compare the result with the wish and see what
was left out. Real agents do not fill gaps by "the next one in a list". They often guess, sometimes
well, and a specific request can also go wrong. The trial does not say that a specific request always
works or a vague one always fails (`docs/learning-design.md`, "What we do not teach"). It shows one
case so the child can feel "I did not say it, so it chose for me". The closing line says only what
happened (REQ-3.5.6).

### Events and reducer

`reducer.ts` is unchanged: `Ask` still means "`canAsk` ? `asked = true` : same state", and `canAsk`
changes meaning. `Retry`, `PickCard` and the others are unchanged. `nextWish` still advances only after
`"right"`.

### Invariants

INV-5 stays. INV-6 and INV-7 are retired; INV-8 to INV-14 are new (table in `requirements.md`). Each
new one has a property in `reducer.pbt.test.ts` using `checkProperty`, over the same event arbitrary as
the others (picks weighted so that single-card asks are common):

| id | how the property checks it |
|---|---|
| INV-8 | End of any sequence: if the pick is empty or `asked`, `reduce(end, Ask)` is the same object. |
| INV-9 | End of any sequence in a trial: if `hasPick` and not `asked`, `reduce(end, Ask).lane.asked` is true. |
| INV-10 | For every step with event `Ask` that changes the lane: before and after differ only in `asked`, and `pick` is deeply equal. |
| INV-11 | After any sequence, when `asked`: a picked color equals the brought color and a picked object equals the brought object. |
| INV-12 | After any sequence, when `asked` with exactly one card: the brought item differs from the wish. |
| INV-13 | After any sequence, when `asked` with both cards: the brought item equals the pick. |
| INV-14 | Every step that starts with `asked`: the pick has a card, and any event other than `Retry` leaves the lane equal. |

Each property is shown to fail on a deliberately broken reducer or rule before it is kept (recorded in
`tasks.md`).

### Model check (`reducer.model.test.ts`)

The alphabet is unchanged. The state invariants change in one place: "a search has a complete pick"
becomes "a search has at least one card". Goals, all over the real reducer:

1. the right result is reachable from every state (kept);
2. choosing is reachable from every state (kept);
3. a result for a **color-only** request is reachable from every state;
4. a result for an **object-only** request is reachable from every state.

The reached state count changes from 220 to 280: 4 title states, then 2 languages x 2 hero positions x
3 wishes x 23 lane states (12 picks, with 4 color options and 3 object options, before the ask; 11
non-empty picks after it). The test asserts the count.

The new goals would be empty checks if they passed for the old rule too. So one case runs the same
alphabet with the old rule put back in a wrapper step (`Ask` ignored unless both cards are picked) and
expects goals 3 and 4 to report `stuck`, with the counterexample recorded in `tasks.md`.

## Content (`src/content/`)

`cards.json` is unchanged. `lane` strings change as follows. `{0}` is the item name; a digit, because
the gate rejects Latin letters in Japanese.

| key | ja | en | change |
|---|---|---|---|
| `lane.wish` | ほしいのは これ | I want this one | kept |
| `lane.pickAny` | カードを えらんでね | Pick a card | new; replaces `pickBoth`, `pickColor`, `pickThing` |
| `lane.ready` | ウィスプを タップして⏎たのもう | Tap the wisp to ask it | kept; now used for 1 or 2 cards |
| `lane.right` | {0}が⏎ぴったり みつかった | Found the {0}! Just right | kept |
| `lane.wrong` | {0}を⏎もってきたよ | The wisp brought the {0}, just as you asked | kept; complete request, different item |
| `lane.vague` | {0}を⏎もってきたよ | The wisp brought the {0} | new; one-card request |
| `lane.lesson` | いろと ものを つたえて⏎ぴったり みつかったね | You told it⏎color & item | new; closing line |
| `lane.again` | もういちど あそぶ | Play again | kept |
| `retry` | もういちど つたえてみよう | Let's tell it again | kept |

(⏎ is a line break.) Why these:

- `pickAny` replaces three keys that told the child which single card was missing. They are the
  messages that taught "both are required". `ready` replaces them for one card: it names one action,
  tap the wisp, and says nothing about a second card (REQ-3.1.7).
- `vague` is its own key because "just as you asked" is not honest when the wisp chose the object. The
  Japanese is the same as `wrong`: with the item name inserted the two lines have no room for more (the
  first line holds the name, up to 8 characters; the second 12). The comparison with the wish, and the
  retry button, carry the meaning.
- `lesson` is the user's draft, adjusted. The Japanese is as drafted. Each line is 10 characters. The
  English draft was `Color & item / Just right!`, but the found message already ends with "Just right",
  so the two would repeat each other on one screen. `You told it / color & item` says what the child
  did, matches the Japanese "tell", and fits in 12 characters a line.
- kid-reader reading (the rubric in `.kiro/agents/kid-reader.md`, applied by hand in task 4.1; the
  agent itself is not runnable from this session): `つたえて` is already on the retry button, `ぴったり`
  is in the found message, `カード` is the word for the objects the child is touching; the words are
  separated at phrase breaks and no line splits a word; one idea per line; no blame; no claim about AI.

`scripts/check-kid-strings.mjs` checks only the Japanese templates. The content test renders every
message that takes an item name with all six Japanese names and applies the rules to the result. It also
checks that every key has the same set of placeholders in both languages.

## Game (`src/game/`)

### `lane-view.ts`

`laneView(state)` changes as follows; everything else in it stays.

- `lit` is the brought item (`delivered(lane)`), not the pick. So are `wispTarget` and the name in the
  message. `star` is still `outcome === "right"`.
- `armed` is `canAsk(lane)`: one card is enough.
- `messageKey`: choosing gives `ready` when `canAsk`, else `pickAny`; right gives `right`; a result with
  a complete pick gives `wrong`; with one card, `vague`.
- New `lesson: string | null`: `strings[lang].lane.lesson` on the right result, else null.
- New `messageAt: Point`: where the message goes (below).
- `cards[].picked` still follows the pick only: an unpicked card is never marked.

### Layout (`lane-layout.ts`) and where the closing line goes

Before a result the message sits at y 454 (the wisp's ring is above it). After a result the wisp has
flown to a lane slot, so the area it left (y 322 to 418) is free. The result block uses it, so nothing
shrinks and nothing is hidden:

| thing | center | box | stage |
|---|---|---|---|
| message while choosing | (195, 454) | 340 x 60 | choosing (unchanged) |
| message after a result | (195, 380) | 340 x 60, spans y 350 to 410 | result (new) |
| closing line panel and text | (195, 448) | 340 x 64, spans y 416 to 480 | right result only (new) |
| button | (195, 528) | 300 x 80, spans y 488 to 568 | result (unchanged) |

Slots end at y 314, the button starts at 488, and the hero strip (568 to 644), the cards and the wish
row are untouched. The layout test checks each stage on its own, since the choosing message and the
result message share the same area at different times, and the wisp is at a slot after a result.

### Scene (`scenes/LaneScene.ts`, `ui/art.ts`)

Thin, as before. It adds a panel and a text for the closing line (22 px, the same size as the message),
shows them when `view.lesson` is set, and puts the message at `view.messageAt`. No timer, no tween that
hides text. The scene is excluded from coverage and mutation (ADR 0003), so the smoke checks it.

## Test plan and traceability

| layer | what | requirement |
|---|---|---|
| unit (`lane.test.ts`) | `hasPick`, `canAsk`, `deliver` over all six wishes x all five single cards (30 rows, by hand) x both-cards x no card, `delivered`, `outcome` | REQ-3.1, 3.2, 3.3 |
| unit (`reducer.test.ts`) | no card, color only, object only, both; ask twice; the lock; retry after vague, wrong and right; wish cycle | REQ-3.1, 3.2, 3.4 |
| property (`reducer.pbt.test.ts`) | INV-5 and INV-8 to INV-14 over event sequences | REQ-3.3, 3.8 |
| model (`reducer.model.test.ts`) | 280 states; invariants; goals 1 to 4; the old rule fails goals 3 and 4 | REQ-3.4, 3.8 |
| content (`lane-content.test.ts`) | same keys in both languages; placeholders; Japanese rules for every item name and the closing line; English length; no blame words | REQ-3.4, 3.5, 3.6 |
| view (`lane-view.test.ts`) | message key per stage, `armed`, ring and fade, `lit` and `wispTarget` equal the brought item, picks not filled in, `lesson` only on right, ja and en | REQ-3.1 to 3.6 |
| layout (`lane-layout.test.ts`) | the result block fits and does not overlap, per stage; targets at least 80 px | REQ-3.5.4, 3.7 |
| mutation (`npm run mutation`) | any surviving mutant fails | REQ-3.8, 3.9 |
| mobile smoke | color only and object only paths with real taps, pixel check of the closing line, ja and en screenshots, offline run | REQ-3.1 to 3.8 |
| desktop smoke | the same with the mouse; hero stays still on a held press on a card | REQ-3.7, 3.8 |

`tasks.md` carries the requirement, test and result for each task.

### How the smoke sees text

The text is drawn on the canvas, so the DOM has no copy of it. A game state that says "right" would
pass even if the closing line never appeared. The smoke therefore takes a screenshot of the closing
line's area and counts light text pixels in it: many on the right result, none on a different result,
and a different pattern in Japanese and in English. It decodes the PNG with `node:zlib` (no new
dependency). It also keeps whole-page screenshots, which are looked at by eye.

## Decisions and alternatives

- **Derive the brought item.** Alternative: store it in `Lane`. Rejected: duplicate state; the model
  check and INV-11 to INV-13 would have to prove two fields agree.
- **Fill in from the wish, not from a fixed first item.** A fixed "first object is pumpkin" would bring
  the wish on a vague request whenever the wish is a pumpkin. The requirement is a different item for
  every wish and every single card.
- **One next-in-order rule for both attributes.** Alternative: ask a coin, or light all matches. Both
  need randomness or a new display, and the second hides which item was brought.
- **A separate `vague` key.** Alternative: reuse `wrong`. Rejected for English honesty (see Content).
- **Closing line as its own text and panel in the freed wisp area.** Alternatives: append to the found
  message (4 lines, forbidden by the request); replace the wish row (hides the goal); shrink the text
  (forbidden). A later playtest may want the line to appear after a beat; that needs a timer and is out
  of scope.
- **`pickAny` says "Pick a card".** It does not say which kind, because naming one kind would again
  teach an order.

## Risks

- WebKit does not start in the authoring sandbox (missing system libraries; `docs/evidence/didnt-work.md`).
  The mobile smoke is run there on Chromium with the iPhone 13 touch profile, labelled as such; the real
  WebKit run is CI's. A change is not called done until CI's smoke is green.
- The pixel check looks for the message text color. It reads that color from `textStyle` in
  `src/game/ui/text.ts` (a module with only a type import from Phaser), so a color change there moves
  the check with it instead of silently breaking it.
- A real child may still read "Pick a card" as "pick any card" and never learn to say both. The next
  playtest should note whether children try one card first and what they say after the vague result.
