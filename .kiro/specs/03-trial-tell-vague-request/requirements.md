# Requirements: Trial 1, a vague request brings a different item

Spec `03-trial-tell-vague-request`. A small change to the published trial 1 (The Dark Lane),
which `02-trial-tell` built. It teaches learning goal L1 (`docs/learning-design.md`) in the way the
playtest asked for: if you ask vaguely, a different item arrives; if you say the color and the object,
the wanted item is found. Requirement ids are `REQ-3.n`. `REQ-2.n` belongs to `02-trial-tell`
and `REQ-1.n` to the missing `01-core-loop`; neither is reused.

This is not a rebuild. Trial 1 is live and playable. Everything this spec does not name keeps working
as `02-trial-tell` specified it.

## Why (the 2026-11-09 playtest of the published build)

- Picking only a color, or only an object, and tapping the wisp did nothing except change the message
  to "pick a thing" or similar. The child cannot see what a vague request gets. The child learns "you
  must pick both cards" as a rule instead of "the helper only knows what you tell it".
- A specific request for the wrong item works well: the wisp brings what was asked, the message names it,
  the child compares it with the wish and retries without blame. That stays.
- The found message names the item. That stays. Nothing yet tells the child why this one was found.

`02-trial-tell` chose "a missing card is not a search" on purpose (its REQ-2.4). This spec reverses
that choice on the evidence above. The old spec stays as written, with a pointer to this one.

## Scope

In: trial 1 only, from the first tap on a card to the result and the retry. Touches `src/domain`,
`src/game`, `src/content`, their tests, `e2e/` for the smoke, this spec, the steering invariants file,
and the smallest notes that keep the other documents true.

Out: trials 2 to 6, the parent screen, judge features, network use or measurement, a service worker,
a shared framework, new card kinds (no third attribute, no place card), sound, a language switch in the
game. No change to `vite.config.ts`, `stryker.config.json`, `package.json`, `scripts/check-*` or `.github/`.

## Relation to `02-trial-tell`

What this spec replaces, keeps and retires. "Replaced" means the old text no longer holds; the new
requirement is named.

| old | status | now |
|---|---|---|
| REQ-2.3.1 the helper searches only when both cards are picked | replaced | REQ-3.1: at least one card |
| REQ-2.3.2 no ask in the events means no search | kept | INV-5 stays |
| REQ-2.3.3 dimmed and no ring while a card is missing | replaced | REQ-3.1.5 and REQ-3.1.6 |
| REQ-2.4.1 asking with no card, only a color or only an object searches nothing | replaced | REQ-3.2 keeps "no card"; one card now searches (REQ-3.1) |
| REQ-2.4.2 message says what is missing, as an invitation | replaced | REQ-3.2.2: with no card, invite picking a card. REQ-3.1.7: with one card, the message says to tap the wisp |
| REQ-2.4.3 no red, cross, sound or shake | kept | REQ-3.2.3 and REQ-3.4.2 |
| REQ-2.5.1 the search covers exactly the picked color and object, nothing substituted | replaced | REQ-3.3: picked cards are kept as asked; a card not picked is filled in by a fixed rule; a request with both cards is still exact |
| REQ-2.5.2 the wisp flies to the slot for that pair, which lights up | kept, meaning widened | the slot of the item that was brought (REQ-3.3.6) |
| REQ-2.5.3 the message names the item in the child's language | kept | the item that was brought (REQ-3.4.1) |
| REQ-2.6.1 the right result is when the lit item matches the wish | kept | "lit item" is the item that was brought |
| REQ-2.6.2 star and found message | kept | REQ-3.5 adds a closing line |
| REQ-2.6.3 play again moves to the next wish | kept | REQ-3.4.6 |
| REQ-2.7 a different request is not blamed | kept, widened | applies to vague requests too (REQ-3.4) |
| REQ-2.8 the child can always finish | kept | REQ-3.4.5 |
| REQ-2.14.2 INV-5 to INV-7 | changed | INV-6 and INV-7 are retired; INV-8 to INV-14 are new. See "Invariants" below |
| REQ-2.1, 2.2, 2.9 to 2.13, 2.15 | kept | REQ-3.7 and REQ-3.8 restate what this change must not break |

## Invariants

`.kiro/steering/domain-invariants.md` rules apply: an id is never reused, a retired invariant is
deleted together with its test, and each new invariant gets a property test in the same pull request.

| old | retired because | replaced by |
|---|---|---|
| INV-6 `Ask` with a card missing, or after a search, returns the same state | one card is now a valid request, so "a card missing" no longer means "no search" | INV-8 (no card, or after a search, is no change) and INV-9 (one card is a request) |
| INV-7 after a search the pick is complete, and only `Retry` changes the lane | the pick is no longer always complete after a search | INV-14 (the pick has at least one card, and only `Retry` changes the lane), INV-10 to INV-13 (what is brought) |
| INV-5 the helper never searches unprompted | still true | kept as is |

New invariants:

| id | invariant |
|---|---|
| INV-8 | `Ask` with no card picked, or after a search, returns the same state. No card is not a request. |
| INV-9 | `Ask` with at least one card picked and no search yet starts the search. One card is a request. |
| INV-10 | `Ask` changes only `lane.asked`. The pick stays as the child left it, so a card the child did not pick is never filled in for them. |
| INV-11 | What the wisp brings keeps every card the child picked: the picked color is the color brought, and the picked object is the object brought. |
| INV-12 | A request with only one card never brings the wish. |
| INV-13 | A request with both cards brings exactly that pair, the wish or not. |
| INV-14 | After a search the pick has at least one card, and only `Retry` changes the lane. |

## Glossary

Terms from `02-trial-tell` (wish, color card, object card, pick, ask, lane, result) keep their meaning.
New or changed:

- **Request**: the pick at the moment of the ask. **Complete** when both cards are picked, **vague**
  when exactly one is.
- **Brought item** (also "delivered item"): the lane item the wisp lights and flies to. It is a
  function of the request and the wish. It is not stored.
- **Closing line**: a short sentence on the right result that looks back at what the child did.

## Requirements

### REQ-3.1 One card is enough to ask

As a 6-year-old, I want to send the wisp with only a color or only an object, so that I can see what
a vague request gets.

1. The child can ask when at least one card is picked and no result is showing. Tapping the wisp then
   starts the search.
2. A color card alone and an object card alone are both enough.
3. Picking a card never starts a search (REQ-2.2.5 stays).
4. A tap on the wisp while a result is showing changes nothing.
5. The wisp shows the ask ring whenever it can be sent: at least one card picked, no result showing.
   It shows no ring with no card, or while a result is showing.
6. The wisp is dimmed only while it cannot be sent because no card is picked.
7. While choosing, no message says or suggests that a second card is needed to send the wisp. With one
   or two cards the message says to tap the wisp.

### REQ-3.2 No card is not a request

1. With no card picked, tapping the wisp starts no search and leaves the state unchanged.
2. The message then invites the child to pick a card, in a kind way.
3. Nothing is red, no cross is shown, and there is no sound or shake.

### REQ-3.3 What the wisp brings

1. The brought item is always one of the six lane items.
2. With both cards picked, the wisp brings exactly that pair, whether or not it is the wish. A complete
   request is never corrected toward the wish.
3. With only a color picked, the wisp brings that color, with the object that follows the wish's object
   in the object order (pumpkin, lantern; after the last comes the first). So it is an object other than
   the wish's.
4. With only an object picked, the wisp brings that object, with the color that follows the wish's color
   in the color order (red, blue, yellow; after the last comes the first). So it is a color other than
   the wish's.
5. Because of 3 and 4, a vague request never brings the wish, for every wish and every single card. For
   the wish red pumpkin: red only brings the red lantern; pumpkin only brings the blue pumpkin.
6. The request and the brought item are kept apart. The search never changes the pick and never marks
   an unpicked card as picked. The picture of the item, the slot that lights, the place the wisp flies
   to, the result (right or not) and the message all use the brought item.
7. The brought item depends only on the request and the wish. It does not depend on language, time,
   randomness, or when anything is drawn. The same state and event always give the same result.
8. The rule and its table for every wish are written in `design.md`, with the reason it is not a claim
   about real AI.

### REQ-3.4 Compare, retry without blame

1. After any search, the message names the item that was brought, in the child's language, and the wish
   stays on screen.
2. The message for a vague request, like the one for a complete one, uses no blame words (wrong, bad,
   no, failed, and their Japanese counterparts), no red, no cross, no threat, and no penalty.
3. "Let's tell it again" returns to choosing with the same wish, an empty pick and no result. It can be
   used any number of times and costs nothing.
4. While a result is showing, the cards cannot be changed (REQ-2.2.4 stays).
5. After any number of vague or different results and retries, picking the wish's color and the wish's
   object and asking always finds the wish.
6. After the right result, "play again" moves to the next wish as before (REQ-2.6.3).

### REQ-3.5 The right result closes the lesson

1. On the right result the screen keeps the found message with the item name and the star, and also
   shows a closing line that looks back at what the child did: they told the wisp the color and the
   object, and it was found just right.
2. The closing line shows only on the right result. It is not shown while choosing, on a vague result or
   on a different result.
3. It stays until the child taps the button. No timer removes it.
4. It is a separate text from the found message, not joined to it. The wish, the result, the cards and
   the button stay visible, and no text gets smaller to make room.
5. Words (reviewed as the `kid-reader` agent reads them; see `design.md`):
   - ja: `いろと ものを つたえて` / `ぴったり みつかったね`
   - en: `You told it` / `color & item`
6. The line says only what happened in this trial. It does not say that real AI always gets it right if
   you are specific, or always misses if you are vague, that AI knows everything, or that it is a
   friend or family (`docs/learning-design.md`, "What we do not teach"). It adds nothing about L2 to L4.

### REQ-3.6 Text lives in `src/content`

1. The guidance, result and closing texts are all in `src/content/strings.ja.json` and
   `strings.en.json`, under the same keys. No child-facing literal appears in `src/game/` or
   `src/domain/`.
2. Japanese follows hard rule 2 (hiragana and katakana only, at most 12 characters per line, at most
   2 lines), including after the item name is inserted.
3. English is short: at most 2 lines per message, and the closing line at most 12 characters per line.
4. No message keeps an unreplaced placeholder. A message that takes an item name takes exactly one.
5. `npm run kid` and `npm run font` pass; the subset font covers every character.

### REQ-3.7 What must keep working

1. The trial plays in the 390 x 844 portrait canvas. Every action is one tap or click on an object of
   at least 80 x 80 game pixels.
2. A press that starts on a card, the wisp or the button does not walk the hero; a press on the floor
   still does.
3. Color is never the only signal: shapes, patterns and labels stay (REQ-2.10).
4. After the first load the trial needs no network, in Japanese and in English.
5. No new card kind and no new dependency.

### REQ-3.8 Pure rules, checked several ways

1. The rules are in the pure reducer (ADR 0001). `src/domain` uses no Phaser, DOM, clock or randomness.
2. Each of INV-8 to INV-14 has a property test over the real reducer, using `checkProperty`. The other
   invariants stay and still pass.
3. The model check over the real reducer shows: a result for a color-only request and one for an
   object-only request are reachable; a retry is possible from them; the right result is reachable
   from every state. It records the number of reached states and a counterexample when the one-card
   ask is turned off.
4. Unit tests cover no card, a color only, an object only and both, over every wish, every color and
   every object: the brought item, its determinism and its difference from the wish, the specific but
   different request as before, the lock while a result shows, the retry, the closing line and its
   language switch, and the message lengths with every item name.
5. The mobile smoke plays two paths with real taps: color only, ask, a different item with its name,
   retry, color and object, found with the closing line; and object only, the same way. The desktop
   smoke does it with the mouse. Both languages are looked at in screenshots, and the offline run
   still finishes.

### REQ-3.9 No gate gets weaker

1. No threshold, config, check script or workflow is loosened. No existing test is deleted or relaxed
   to pass, except the tests of the old behavior that this spec replaces (REQ-2.3.1, REQ-2.4.1,
   REQ-2.4.2, REQ-2.5.1, INV-6, INV-7). Each replaced test is named in `tasks.md` with its new
   counterpart, and the new tests are shown to fail on the old behavior.
2. `npm run check` passes, and `npm run build` followed by `npm run smoke` passes. Where a browser
   cannot run in the authoring sandbox, the result says so, and CI's run is what counts.
