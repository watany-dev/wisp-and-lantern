# Requirements: Trial 1, The Dark Lane ("tell it clearly")

Spec `02-trial-tell`. Teaches learning goal L1 (`docs/learning-design.md`): a helper does exactly what
you ask, so ask clearly. Requirement ids are `REQ-2.n`; `REQ-1.n` belongs to the missing
`01-core-loop` spec (for example `REQ-1.11` in `e2e/helpers.ts`) and is not reused.

## Scope

In: trial 1 only, from the title tap to the result and the retry, on top of the existing scaffold
(title scene, `reduce`, `window.__game`, hero drag). Touches `src/domain`, `src/game`,
`src/content` and their tests, plus `e2e/` for the smoke.

Out: trials 2 to 6, the parent screen, judge features (`?judge=1&trial=n` jumps), sound, a language
switch inside the game, a service worker, and any shared framework for future trials. Anything a
second trial would need is built when that trial is specified.

## Reading of the learning design

`docs/learning-design.md` says trial 1 has the child pick 2 to 3 picture cards (color, object, place)
and the helper searches exactly by the cards. This spec uses two cards: color and object. A third
card (place) is not needed to teach "say which one".

`docs/device-checklist.md` has a provisional criterion that a missing card "brings the wrong thing".
This spec takes the stricter reading from the request: with a missing card the helper does **not**
search at all, and the wrong-thing lesson comes from picking a different card (REQ-2.4, REQ-2.7). The
checklist wording is not changed here; see the PR's Decisions.

## Glossary

- **Wish**: the picture the villager shows, one of `balance.wishes`. The child must ask for it.
- **Color card** / **object card**: picture cards. Colors: red, blue, yellow. Objects: pumpkin, lantern.
- **Pick**: the color card and object card currently chosen (each may be empty).
- **Ask**: the child taps the wisp (the helper). This is the only way the helper searches.
- **Lane**: six dark slots, one for every color and object pair. The helper lights one slot.
- **Result**: right (the lit item is the wish) or wrong (it is another item).

## Requirements

### REQ-2.1 Play trial 1 from start to retry

As a 6-year-old, I want to start, ask, see what happens and try again, so that I can finish the trial
by myself.

1. When the child taps the title screen, the game shows The Dark Lane: the wish picture, the six dark
   lane slots, the wisp, the message line and the card tray.
2. The state moves `title` to `trial` and sets `trial` to 1; the lane starts with the first wish,
   an empty pick and no search.
3. The flow is choose, ask, result, retry (choose again). No screen other than the title and this trial
   exists.

### REQ-2.2 Pick two picture cards

1. The tray shows three color cards and two object cards. Each card is a picture with a short label.
2. Tapping a color card sets the pick's color; tapping an object card sets its object. Tapping a card
   in the same row replaces the previous one. A different row is unaffected.
3. The picked cards are marked by a thick frame and a tick shape, never by color alone.
4. After the helper has searched, the cards cannot be changed until the retry.
5. Picking never starts a search.

### REQ-2.3 The helper searches only when asked

1. The helper searches only after the child taps the wisp while both cards are picked.
2. In any state reached by events that contain no ask, the helper has not searched, whatever else was
   done (picking, replacing, language change, hero movement, retry).
3. While a card is missing, the wisp is dimmed. While a card is missing or a result is showing, the
   wisp shows no ask ring.

### REQ-2.4 A missing card is not a search

1. Asking with no card, only a color or only an object does not search and does not change the state.
2. The message line says what is missing: both, the color, or the object, each as an invitation
   ("pick ..."), never as an error.
3. Nothing is shown in red, no cross is shown and no sound or shake is used.

### REQ-2.5 The helper searches exactly what was asked

1. A search covers exactly the picked color and object; the helper never substitutes another item.
2. The wisp flies to the one slot for that pair, the slot lights up and shows the item with its color,
   pattern and shape.
3. After a search, the message names the item by its labels (for example "red pumpkin") in the child's
   language, for the right result and for a different one.

### REQ-2.6 The right result is clear

1. When the lit item matches the wish, the result is right.
2. The right result shows a star shape and the "found it" message, so it is not carried by color alone.
3. A "play again" button then starts the next wish: the wishes cycle in a fixed order, and the pick is
   cleared.

### REQ-2.7 A different request is not blamed

1. When the lit item is another item, the result is wrong. The message states what the wisp brought
   "just as you said". It does not use the words wrong, bad, no or failed, nor a cross or red.
2. The wish stays visible. A "let's tell it again" button returns to choosing with the same wish and
   an empty pick.
3. A different request is exactly as available as the first: nothing is used up.

### REQ-2.8 The child can always finish

1. From every reachable state the right result remains reachable (no soft-lock), including after any
   number of wrong results and retries.
2. Retry has no limit and no cost.
3. After a right result and a retry, the new wish is a valid wish and the state is again choosing.

### REQ-2.9 Japanese and English

1. Every child-facing string exists in `ja` and `en`; the card labels too.
2. The language is the existing one: `?lang=ja|en`, else the browser language, else English. The
   language can change at any time without changing the pick, the wish or the result.
3. A language change never starts a search.

### REQ-2.10 Color is never the only signal

1. Each color has its own shape and pattern (`cards.json`): red circle with vertical stripes, blue
   square with dots, yellow triangle with no pattern.
2. Color cards, lane items and the wish picture all show the shape and the pattern of their color.
3. Object cards and lane items differ by silhouette (pumpkin, lantern).

### REQ-2.11 Portrait, one finger, mouse

1. The trial plays in the existing 390 x 844 portrait canvas.
2. Every action is a single tap or click on an object of at least 80 x 80 game pixels, with no drag,
   hold, double tap or second finger.
3. The existing hero drag on the floor still moves the hero in the trial. A press that starts on a card
   or the wisp does not move the hero.

### REQ-2.12 Offline after the first load

1. The trial needs no network request after the page and its bundled assets have loaded.
2. All art of this trial is drawn in code or comes from the bundled placeholder images; the font is
   bundled.
3. With the network switched off after loading, a full playthrough (wrong result, retry, right result)
   finishes.

### REQ-2.13 Text lives in `src/content`

1. No child-facing literal appears in `src/game/` or `src/domain/`.
2. Japanese text uses hiragana and katakana only, at most 12 characters per line and 2 lines
   (hard rule 2), including after the item name is inserted.
3. `npm run kid` and `npm run font` pass; the subset font covers every character.

### REQ-2.14 Pure rules, checked three ways

1. The rules are in `reduce` (ADR 0001); `src/domain` imports nothing from Phaser, the DOM or the clock.
2. The invariants INV-5 to INV-7 in `.kiro/steering/domain-invariants.md` each have a property test.
3. The retry and the no-soft-lock claim are checked with `checkModel` over the real reducer.
4. A mobile smoke plays the trial to the end with real taps. A desktop smoke plays it with the mouse.

### REQ-2.15 No gate gets weaker

1. No threshold, config, check script or existing test is loosened or deleted to pass.
2. `npm run check` passes, and `npm run build` followed by `npm run smoke` passes.
