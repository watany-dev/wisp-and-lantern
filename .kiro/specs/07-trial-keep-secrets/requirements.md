# Requirements: Trial 4, The Listening Shadows ("keep secrets")

Spec `07-trial-keep-secrets`. Teaches learning goal L4 (`docs/learning-design.md`): a helper hears what you give it,
and someone else may be listening, so a house key, an address and a password are given to nobody, while a candy is
fine to give. Requirement ids are `REQ-7.n`. `REQ-6.n` belongs to `06-trial-verify-stars`, `REQ-5.n` to
`05-trial-grant-tools`, `REQ-4.n` to `04-score-attack`, `REQ-3.n` to `03-trial-tell-vague-request`, `REQ-2.n` to
`02-trial-tell` and `REQ-1.n` to the missing `01-core-loop`; none is reused.

> **Scope note: a fifth trial now exists ([`08-trial-tell-whats-wrong`](../08-trial-tell-whats-wrong/requirements.md)).**
> "Trials 5 and 6" being out below describes this spec's scope. Trial 5 (The Flickering Lantern) is added by `08`,
> which also moves the title's name, card, wisp and hero up 88 pixels and puts its button above the shadows button.
> The shadows', the field's and the shed's buttons do not move, and nothing else in this spec changes.

This adds a fourth trial on top of the existing base. It does not rebuild trials 1 to 3: the lane, the shed and the
field keep their flows, clocks, scores and end screens. Trial 4 is built as a 60-second time attack with a score, a
streak, trial 1's end screen and a "Title" button from its first version, because those were the three comments that
trials 2 and 3 each had to be revised for (`05-trial-grant-tools` revision 2, `06-trial-verify-stars` revision 3).

## Why

`docs/learning-design.md` lists trial 4 as "hand over only the items that are safe to give; shadows = third parties who
listen in". The child holds one thing at a time, and a shadow is listening beside the wisp. The child decides:
**give** it, or keep it **secret**. A house key, an address and a password are secrets, and a candy, a ball and a
flower are fine to give. A right decision scores, more when several in a row are right. Giving a secret away is the
one move that cannot be undone, so the shadow "hears" it, the streak ends and nothing is scored; the game says so
kindly and goes on to the next thing. Keeping a thing that was fine to give also scores nothing and ends the streak,
so a child who answers "secret" to everything scores about as little as one who answers "give" to everything, and the
score rewards knowing which is which.

The shadow is a third party that may be listening, never an enemy. Nothing in the trial is dark, scary or
threatening, and no word says that someone will do something to the child. The words say what the shadow heard, and
what is a secret.

The table in `docs/learning-design.md` says "house key, name, candy". A first name is not clearly a secret and not
clearly safe for a 6-year-old, so it is not used (see `design.md`, Decisions); the items are the house key, the
address and the password, against a candy, a ball and a flower.

## Scope

In: trial 4 only, from a tap on the title to the end screen of the run, the replay and the way back to the title.
Touches `src/domain`, `src/game`, `src/content`, their tests, `e2e/`, this spec, the steering invariants file, and the
smallest notes that keep other documents true. The title gains a third button and its art and card move up to make
room (REQ-7.1). The end screen is shared with trials 1 to 3 and gains a button pair for trial 4.

Out: trials 5 and 6, the parent screen (`parents.*.json` keeps its empty list), judge features (no `?trial=n` jump or
judge-only entrance), a trial-select screen or a general router, network use or measurement, saving, a service
worker, sound, a shared framework for future trials, new dependencies. No change to `vite.config.ts`,
`stryker.config.json`, `package.json`, `scripts/check-*` or `.github/`. Teaching what to do when a real AI asks for a
secret, or what a real password manager is, is not in scope: the items and the rule are a staging device (see
REQ-7.4.5).

## Relation to earlier specs

Earlier specs say "trials 4 to 6 are out" (06). That sentence was true of its scope, not a ban on a fourth trial.
Nothing is silently replaced; spec 06 gains one pointer note at the top of its requirements (and its `jp/` copy), as
05 did for 06.

### Inherited (applies to trial 4 as it is)

| old | what | now |
|---|---|---|
| REQ-2.9 | Japanese and English, `?lang=`, then the browser language; a language change never changes progress | REQ-7.11 |
| REQ-2.10 and hard rule 7 | meaning is never carried by color alone | REQ-7.2.6, 7.10.3 |
| REQ-2.11 | 390 x 844 portrait, one finger or a mouse, targets of 80 x 80 or more, the hero's floor drag | REQ-7.9 |
| REQ-2.12 and hard rule 4 | no network after the first load, art drawn in code, bundled font | REQ-7.10 |
| REQ-2.13, REQ-3.6 | text lives in `src/content`; Japanese rules for the kid text; placeholders replaced | REQ-7.11 |
| REQ-2.15, REQ-3.9, REQ-5.15, REQ-6.14, ADR 0003 | no gate gets weaker | REQ-7.14 |
| REQ-4.1 to REQ-4.3, REQ-4.5, REQ-4.6.1 | a 60-second run: the clock, the top row, the score and the streak, the end screen, play again | the same `Run`, the same top row and end screen (REQ-7.7) |
| REQ-5.16, REQ-6.7.5 | a way back to the title, in a run and on the end screen | the same, for trial 4 (REQ-7.7.5) |
| REQ-6.9.5, REQ-6.7.6 | a new set of buttons ignores presses for 450 ms; the title ignores taps for 0.7 s after a trial sends the child back | the same (REQ-7.9.5, REQ-7.7.6) |
| REQ-4.9 to REQ-4.11 | sharp rendering, characters drawn in code, motion that never carries the only meaning | REQ-7.10 |
| REQ-5.4.3, REQ-5.6.1, REQ-6.4 (the tone) | kind words; nothing red, no cross, no shake, no sound; the fact is not hidden | REQ-7.3.4, REQ-7.4 |
| ADR 0001, hard rule 3 | the domain is pure; time and randomness reach it only through events | REQ-7.1.2, REQ-7.12.1 |

### Trials 1 to 3 only (kept as written; trial 4 does not use them)

| old | what | in trial 4 |
|---|---|---|
| REQ-2.1 to REQ-3.5, REQ-4.4 | cards, asking the wisp, the villager's wishes | not used |
| REQ-5.2 to REQ-5.8 | tools, the hand-over, the door | not used. The hand-over here is a decision about one thing, not a tool |
| REQ-6.2 to REQ-6.6 | stars, the lens, verdicts, the keep | not used. The decision here is "give" or "secret" about the thing in front of the wisp |
| INV-5, INV-8 to INV-14 | trial 1's lane | still hold for every sequence, including the new events; INV-51 says trial 4 cannot touch the lane |
| INV-15 to INV-17 | the 60-second run | widened to trial 4 (its `Tick`, its score, its end screen) |
| INV-18 to INV-24, INV-40 to INV-43 | trial 2's shed | unchanged; INV-51 says trial 4 and the shed cannot touch each other |
| INV-26 to INV-36, INV-38, INV-39, INV-44, INV-45 | trial 3's field | unchanged; INV-51 says trial 4 and the field cannot touch each other |

### Changes to a shared entrance or event

Each row names the old requirement, what the code does today, and the new requirement. The old text is not edited.

| old requirement | the code today | change | new |
|---|---|---|---|
| REQ-6.1.1 "a second extra tap target" on the title | the title has the field button at (195, 648) and the shed button at (195, 736) | one more button, for trial 4, above the field button, at (195, 560). The other two buttons do not move | REQ-7.1.1, 7.1.3 |
| title art and card positions (REQ-6.1.1) | the title text is at y 230, trial 1's card at y 372, the wisp at (285, 538) and the hero at (110, 548); `titleArtBottom` is 606 | all of them move up so that three buttons fit under the art: the title text to y 150, the card to y 282, the wisp to (285, 448), the hero to (110, 458); `titleArtBottom` becomes 514. The pinned numbers in `field-layout.test.ts` (`titleArt`) change with them; `shed-layout.test.ts` only compares positions and still holds | REQ-7.1.1 |
| title texts | each button has a label and the caption "How many in 60 seconds?" | the third button has the same caption (`shadows.timeAttack`) | REQ-7.1.6 |
| `sceneFor` (REQ-6.8.2) | `trial` 2 is the shed, 3 is the field, anything else in a trial is the lane | `trial` 4 is the shadows | REQ-7.8.2 |
| `GameEvent` | has the lane, shed and field events | gains `StartShadows` (with a seed), `DecideItem`, `NextItem`, `LeaveShadows` | REQ-7.8.3 |
| `GameState` | has `lane`, `run`, `shed`, `field` | gains `shadows`, the initial value whenever `trial` is not 4 | REQ-7.8.1, INV-51 |
| `Tick` (REQ-4.2.2; REQ-5.7.1; REQ-6.7.1) | runs the clock in trials 1 to 3 | also in trial 4 | REQ-7.7.1, INV-15 |
| `Start` on the end screen | begins trial 1 (the shed's and the field's state are dropped) | also drops trial 4's state | REQ-7.8.4 |
| the end screen (REQ-4.5, REQ-5.7.5, REQ-6.7.4) | one button (trial 1), or two (the shed, the field: play again, title) | trial 4's end screen has the same two buttons: play again (sends `StartShadows`) and title (sends `LeaveShadows`) | REQ-7.7.4 |
| `TitleScene` | after a trial sends the child back, taps are ignored for 0.7 s | unchanged, and now also true after trial 4 | REQ-7.7.6 |
| `e2e/helpers.ts` `GameState` type | has `shed` and `field` | gains the `shadows` field | REQ-7.13 |
| `ui/field-buttons.ts` | two verdict pictures (a tick, a ring of dots) | two more pictures (an arrow, a padlock); the field's pictures and behavior do not change | REQ-7.3.2 |

## Glossary

- **Shadows**: the place of trial 4, The Listening Shadows, where a shadow listens beside the wisp.
- **Item**: the one thing in front of the wisp in a round. There are six: three secrets (house key, address,
  password) and three that are fine to give (candy, ball, flower).
- **Secret**: an item that is given to nobody: the house key, the address, the password.
- **Round**: one item, from its appearance to the "Next" that brings the next one. A 60-second run has as many as the
  child gets through.
- **Run**: the 60 seconds of trial 4, from the tap on the title's button (or on play again) to the time up. It uses
  the same `Run` as trial 1: the clock, the score, the streak and the best of the session.
- **Seed**: a whole number the game draws when trial 4 opens (not the domain). The same seed always gives the same
  items in the same rounds.
- **Decision**: the child's choice for the item: **give** it to the wisp, or keep it **secret**. It is made once per
  round, by one of two buttons.
- **Right decision**: giving an item that is fine to give, or keeping a secret. Any other decision is a **wrong
  decision**: giving a secret, or keeping an item that was fine to give.
- **Heard**: what the shadow has taken in. A given item is heard, whatever it is; a kept item is not.
- **Streak**: the right decisions in a row. A wrong decision ends it. The points for a right decision are 100 plus 50
  for each one in the streak, up to 4.
- **Closing line**: a short sentence, shown after every decision, that says what kind of thing the item is: a secret
  that is given to nobody, or a thing that is fine to give. It is its own text.
- **End screen**: what the run shows when the clock reaches zero: the score and the best, with "play again" and
  "title".

## Requirements

### REQ-7.1 Enter the shadows with a tap

As a 6-year-old, I want to open the shadows from the title with my finger, so that I can play without a grown-up.

1. The title screen shows a third extra tap target, for trial 4: a button with a picture of a padlock and a short
   label in the child's language, at least 80 x 80 game pixels, above the field button and clear of it, of trial 1's
   card, of the title's wisp and of the hero.
2. Tapping the button opens trial 4 and begins its run. The state moves from `title` to `trial` with `trial` 4,
   round 0 of a new seed, a full clock of 60 seconds, a score of 0 and a streak of 0. The best score of the session
   carries over. The lane, the shed and the field are untouched. The game draws the seed (outside the domain) and
   sends it with the event; the domain draws nothing.
3. A tap on this button never also starts trial 1, opens the shed or the field, and a tap on another button never
   opens the shadows. A tap on the title anywhere else starts trial 1 as before, and the end screen's play-again
   button still starts a new run of its own trial.
4. The entrance is an ordinary tap on the ordinary screen. It is not a judge URL, a hidden gesture, a console call or
   a query parameter.
5. There is no trial-select screen and no general router. The only new screen is the shadows.
6. Every sentence on the title matches the trial it sits with. The third button carries the caption
   `60びょうで いくつ？` / `How many in 60 seconds?` like the other two; its label has no number in it.

### REQ-7.2 What the screen shows

1. The screen shows the run's top row (the whole seconds left, the bar and the score, as in trials 1 to 3), a guide
   text, the item in a tile with its name under it, the shadow with a speech bubble above its head, a message, a
   closing line (after a decision), the wisp, and a "Title" button (REQ-7.7.5). The two decision buttons and the
   "Next" button appear only when they can be used (REQ-7.3.2, REQ-7.3.5).
2. The guide is one short sentence in two lines at most. It says that a shadow is listening and asks to give the item
   or keep it secret. It stays on screen in every stage.
3. The item is one of the six, drawn in code, each with a silhouette that differs from the others, and named in
   words under it in the child's language.
4. The shadow is on screen in every stage, drawn with a round soft body, an ear turned toward the item, and eyes that
   look at the item. It is never drawn angry, sly, hungry or scary. It is not a tap target.
5. The speech bubble over the shadow shows what it heard: nothing while the child decides; the picture of the item
   after the item was given; three quiet dots after the item was kept.
6. The result of a decision is told in a still picture and in words, not by color: a right decision puts a tick badge
   on the tile; a kept item has a padlock on its tile; a given item fades on its tile and appears in the bubble. A
   wrong decision shows no cross and nothing red.
7. The wisp is on screen in every stage, with its usual friendly face. It is never drawn angry, sly, scared or hurt.
   It is not a tap target in this trial.

### REQ-7.3 Decide: give or keep it secret

As a 6-year-old, I want to say what I do with the thing, so that I find out what a secret is.

1. While the child has not decided, two buttons are on screen: "Give" with a picture of an arrow and "Secret" with a
   picture of a padlock, each with its word. They appear in no other stage.
2. Pressing "Give" or "Secret" is the decision, once. The decision is recorded exactly as it was pressed; the game
   never changes it, corrects it or chooses it for the child. A second press in the same round changes nothing.
3. A right decision scores (REQ-7.7.3) and the message says so kindly. A wrong decision scores nothing and ends the
   streak.
4. A wrong decision is no disaster and no scene of fear. It is told in one plain sentence of what the shadow heard,
   or what was kept, and in the closing line. Nothing is red, no cross is shown, nothing shakes and there is no
   sound. A short flourish may play (REQ-7.3.6).
5. After a decision the result stays on screen, with its message and closing line, until the child presses "Next".
   Nothing but the end of the run removes the result by itself. "Next" brings the next item.
6. The result of a decision is decided at once by the reducer. It never waits for an animation or a timer. A short
   flourish (the item sliding to the shadow's bubble, or a lock closing on it) may play and may be ignored without
   losing information.
7. A given secret cannot be taken back in the same round: after "Give" on a secret there is no second try for that
   item, and the round goes on with "Next". This is the lesson: some things cannot be taken back once told. It costs
   the points of that round and the streak, and no time.

### REQ-7.4 The shadow listens; it is not an enemy

1. The words call the shadow `かげ` / "the shadow". They say what it heard (`かげが ... を きいたよ` / "The shadow heard
   the ..."). They never say it wants, takes, steals, tricks, follows or hurts anything, and never say that something
   bad will happen to the child, the home or the family.
2. No word in the child-facing text is on the content test's list of fear and blame words (for example "enemy",
   "thief", "steal", "stranger", "scary", "afraid", "danger", "monster", "spy", "wrong", "bad", "mistake", "oops",
   "sorry", "naughty", and their Japanese counterparts; the lists are in `shadows-content.test.ts`). No sentence blames
   the child or the wisp.
3. The fact is not hidden: when a secret was given the message says the shadow heard it; when a thing was kept that
   was fine to give, the message says so plainly.
4. For a thing that is fine to give, the shadow hearing it is told as fine: "That is fine to share." The shadow is not
   made to look pleased or greedy.
5. The words never say or suggest that the helper is always right or always wrong, knows everything, is a friend or
   family, or does anything on purpose, and make no claim about what a real AI does with what it is given
   (`docs/learning-design.md`, "What we do not teach"). They say only what happened in this game and what kind of
   thing the item is. That a real helper also may pass on what it is given is a staging device (see `design.md`), not
   a claim stated in the game.
6. Fear is never the way the game makes the child obey. The rule is stated flatly and kindly, after the fact: "A house
   key is a secret. We give it to nobody."

### REQ-7.5 The items, and their order

1. There are six items: `houseKey`, `address`, `password` (the secrets) and `candy`, `ball`, `flower` (fine to give).
   Whether an item is a secret is a rule of the pure domain: the first three are, the last three are not, and nothing
   else decides it.
2. The item of a round comes from the seed and the round number only (a fixed rule, no other randomness) and does not
   change while the round lasts. A new seed gives a different order.
3. No item repeats the one before it, in any seed, the wrap included. The kinds never run three in a row: after two
   secrets comes an item that is fine to give, and the other way round. Six rounds show each of the six items once.
4. The order has no pattern that a child can use instead of looking at the item: the kinds do not simply alternate,
   and the seed changes where each kind falls (`design.md`, "The items: a seed and four orders").

### REQ-7.6 The closing line says what kind of thing it is

1. After every decision, in the place under the message, a closing line states what kind of thing the item is. For a
   secret: "A house key is a secret. We give it to nobody." (and the same for the address and the password). For a
   thing that is fine to give: "A candy is just a candy. It is fine to give." (and the same for the ball and the
   flower).
2. It is its own text, shown only after a decision, with its own panel. It is not joined to the message. The message,
   the tile, the bubble and the button stay visible, and no text gets smaller to make room.
3. It says only what is true of this game's items. It does not say that a real AI always leaks, never leaks, or that
   a secret is dangerous (REQ-7.4.5).

### REQ-7.7 A 60-second run, a score, and the way back

As a 6-year-old, I want to find out how many I can get right in a minute, and to go back to the title whenever I like,
so that I want to play again and never feel stuck.

1. Trial 4 is a 60-second run. It uses trial 1's `Run`: a full clock of 60 seconds at the entrance, a score of 0, a
   streak of 0, and the best score of the session carried over. The clock counts down whatever the child is doing.
   Time reaches the game only as `Tick` (a frame counts as at most 250 ms), and `Tick` acts in trial 4 as it does in
   trials 1 to 3. The top row shows the seconds, a bar and the score.
2. After a decision, the button "Next" starts the next round: the next item of the seed, nothing decided. Nothing ends
   the trial but the clock.
3. Scoring. A right decision scores 100 plus 50 for each right decision in a row before it, up to 4 (100, 150, 200,
   250, 300, 300 ...). A wrong decision scores nothing and ends the streak. "Next" scores nothing and leaves the
   streak. A decision is still the child's alone (REQ-7.3.2), and a wrong decision costs no time. The score is
   decided at once by the reducer. A right decision pops its points ("+150") from the tile for a moment; the score
   in the top row is the record of it.
4. Time up ends the run at once, in any stage (deciding or decided). The end screen is trial 1's: "Time's up!", the
   score, the best of the session, and "New best!" when the run beat it. It has two buttons: "Play again" begins a
   new run of trial 4 (a full clock, a score of 0, round 0 of a new seed, only the best kept) and "Title". It ignores
   taps for a moment so that a last quick tap does not press a button.
5. A "Title" button is on trial 4's screen in every stage and on its end screen: 80 x 80 on the screen (the shed's and
   the field's button, at the same place), wide on the end screen. It returns to the title: `phase` `title`, `trial`
   0, trial 4 initial, the run restarted with only the best kept. Nothing else changes (the language and the hero
   stay), and from there trials 1 to 4 open as usual.
6. The title ignores taps for 0.7 s after a trial sends the child back, so a double tap on "Title" cannot start
   trial 1.
7. No soft-lock: from every state of trial 4 (deciding, decided, the end screen) the child can reach a right
   decision, a wrong decision, the next round, a second right decision, the end screen and the title, with the screen's
   own buttons; and without the clock and without the "Title" button the buttons still give a way on.
8. Why the score does not teach "tap fast": a right decision is worth 100 to 300 depending on the streak, and a wrong
   one ends the streak. A child who answers the same thing to everything is right about half the time and scores less
   than a quarter as much as one who knows: 450 against 1,900 in the first eight rounds of seed 0 (`design.md`,
   Decisions).

### REQ-7.8 Trials stay apart

1. Entering trial 4 starts no run of another trial and leaves `lane`, `shed`, `field` and the other trials' `run`
   state as they were on the title. `shadows` is the initial value whenever `trial` is not 4.
2. The scene shown follows `trial`: 1 is the lane, 2 is the shed, 3 is the field, 4 is the shadows. A state with
   `trial` 4 never shows another trial's scene.
3. In trial 4 the events of trials 1 to 3 (`Ask`, `PickCard`, `Retry`, `PickTool`, `GiveTool`, `RetryShed`,
   `LeaveShed`, `InspectStar`, `SortStar`, `KeepStars`, `RetryField`, `LeaveField`) return the same state. Outside a
   run of trial 4 the shadows' events (`DecideItem`, `NextItem`) return the same state, the end screen included.
   `LeaveShadows` is accepted in trial 4 only (a run or its end screen), and `StartShadows` from the title and from
   trial 4's own end screen only.
4. `Start` in a run of trial 4 sets the language only; on trial 4's end screen it begins trial 1 and drops trial 4's
   state. `SetLang` changes the language only and never changes a decision or the result. `MoveHeroTo` moves the hero
   only.
5. What the child decided is one value: the item is derived from the seed and the round and never stored, and
   whether a decision was right is derived from the item and the decision, never stored.
6. The behaviour, texts, layout and tests of trials 1 to 3 are unchanged by this spec, except the title art's and
   card's position and the pinned numbers that follow from it (see "Changes to a shared entrance or event").

### REQ-7.9 Portrait, one finger, mouse

1. Trial 4 plays on the existing 390 x 844 portrait canvas.
2. Every action is one tap or click on an object of at least 80 x 80 game pixels: the title's trial 4 button, "Give",
   "Secret", "Next", the "Title" button and the two buttons of the end screen. There is no drag, hold, double tap or
   second finger.
3. The hero's floor drag still moves the hero in trial 4. A press that starts on a button does not move the hero; a
   press on the floor does.
4. Texts and pictures do not overlap each other or hide the tile, the shadow, the bubble, the message, the closing
   line or a button, in every stage (deciding, decided after each kind of decision), with the top row and the "Title"
   button, in both languages, with each item's name inserted. The buttons end above the hero's start place.
5. A new set of buttons ignores presses for a moment (450 ms) after it appears, so a quick double tap on "Give" or
   "Secret" never also presses the "Next" that takes its place.

### REQ-7.10 Drawn in code, no network, no color, no sound

1. The items, the shadow, the bubble, the padlock and the tile are drawn in code at the device pixel ratio, with the
   existing look (REQ-4.9 to REQ-4.11). No image file is added and no third-party art is used (hard rule 5).
2. Trial 4 needs no network request after the page and its bundled font have loaded, in Japanese and in English
   (hard rule 4). A full play of decide, next, time up and the way back works with the network switched off.
3. Motion never carries the only meaning, never flashes faster than 3 times a second, and can be ignored without
   losing information. Every result is told in a still picture (REQ-7.2.6).
4. The six items are told apart by silhouette and a word, not by color: on a screen with all color removed they are
   still different shapes with different names.
5. The game plays no sound, and nothing needs one: the smoke checks that nothing is played.

### REQ-7.11 Japanese and English, and text in content

1. The guide, the messages, the item names, the button labels, the closing lines and the title's label and caption
   are all in `src/content/strings.ja.json` and `strings.en.json`, under the same keys. No child-facing literal
   appears in `src/game/` or `src/domain/`.
2. Japanese follows hard rule 2 through `npm run kid`: hiragana and katakana only, at most 12 characters a line and 2
   lines, also after the item's name is inserted. English messages are at most 2 short lines.
3. A message that takes the item's name takes exactly one and keeps no unreplaced placeholder.
4. The language is the existing one (`?lang=ja|en`, else the browser language, else English). `SetLang` can change it
   at any time; the words change and nothing else changes.
5. `npm run kid` and `npm run font` pass after the strings change; the subset font covers every character.

### REQ-7.12 Pure rules, checked several ways

1. Which items are secrets, the order of the items, the decision, whether it is right, the score, the next round, the
   clock and the leave are rules of the pure reducer (ADR 0001). `src/domain` uses no Phaser, DOM, clock or
   randomness, and the result depends on no language or animation timing. The seed is an event field: the same seed
   and the same events always give the same states.
2. Each of INV-46 to INV-53, and INV-15 to INV-17 for trial 4 (below), has a property test over the real reducer with
   `checkProperty`, and the generators give both decisions, decide twice, go next before and after a decision, use
   events of the other trials, run out the clock, play again, leave, and go round the whole table of items. INV-3
   and INV-4 also run over sequences that contain the new events.
3. Unit tests cover: the six items and their kinds, the four orders and their wrap, the pinned items of several
   seeds, a right and a wrong decision for a secret and for a safe item, a second decision, a "Next" before a
   decision, the score of a right and a wrong decision and the streak (100, 150, 200, 250, 300), the clock, time up
   in both stages, play again from the end screen with the best kept, the leave in every stage and from the end
   screen and nowhere else, and the entry from the title. For content and view: ja/en same keys, placeholders,
   lengths, no blame, fear or claims, the closing line only after a decision, the buttons only when they can be used,
   the "Title" word that fits its 80 px button, the end screen's two buttons for trial 4, and the message follows
   the decision.
4. A model check over the real reducer (`shadows.model.test.ts`) covers the entrance from the title with two seeds
   and trial 4 after it, with a finite alphabet that includes invalid events of the other trials, both decisions at
   any time, a half-run and a run-ending `Tick`, `Start` and language changes. It checks that the state always
   equals an independent record of what the child did, a given secret is never scored as right, the clock agrees with
   the record, and the score moves only on a right decision by the points for the streak; from every reachable state
   a right decision, a wrong decision, the next round, a second right decision, the end screen and the title are
   reachable (and the next round without the clock and the "Title" button). It records the number of states and the
   counterexamples of deliberate breaks, and drops no state to pass.
5. Mutation testing finds no surviving mutant in the unit-tested code.

### REQ-7.13 The real taps and the real screen

1. The mobile smoke enters trial 4 from the title with a real tap (not `dispatch`) and plays: a safe item given
   (scores, tick, the item in the bubble, the closing line); a secret kept (scores, the padlock, quiet dots in the
   bubble, the closing line); a secret given (no score, streak ended, the item in the bubble); a safe item kept (no
   score, streak ended, the padlock); a second press in the same round changing nothing; "Next" bringing the next
   item; time up showing the end screen; "play again" starting the next run with the best kept; "Title" returning to
   the title from a run and from the end screen, with a quick second tap not starting trial 1. `window.__game` is
   used to read the state, never to do what a tap can do. `dispatch` is used only for `Tick` and `SetLang`, which
   have no button.
2. The smoke checks the screen, not only the state: the tick badge, the padlock, the bubble's content, the
   buttons, the clock, the score, the message and the closing line are seen in the pixels. A state that says "given"
   with a quiet bubble fails.
3. Japanese and English screens for the start, a given safe item, a kept secret, a given secret and the end screen,
   and the title in both languages, are looked at in screenshots. The desktop smoke plays the shadows with the mouse
   and checks that a held press on a button does not move the hero. Offline after the first load, in both
   languages, the whole path still works.
4. Trial 4 is played on the real clock, so each smoke test plays well under half of a run; a test that has to go past
   the clock ends the run with `Tick`, as the shed's and the field's do. The smoke of trials 1 to 3, including the
   score attack, still passes. The title's trial 4 button starts none of them, and a tap elsewhere on the title still
   starts trial 1.

### REQ-7.14 No gate gets weaker, and what is verified is said

1. No threshold, config, check script, workflow or existing test is loosened, deleted or relaxed to pass. Where this
   spec forces an old expectation to change, `tasks.md` names the old test and the new one, and why trials 1 to 3 are
   not weaker.
2. `npm run check` passes in every task. Tasks that connect input to the screen also pass `npm run build` followed by
   `npm run smoke`.
3. The smoke targets mobile WebKit and desktop Chromium. Where WebKit cannot start in the authoring sandbox, the
   result says that the mobile smoke ran on Chromium with the iPhone 13 touch profile, and CI's WebKit run is what
   counts. The work is not called done before CI's smoke is green. A Playwright run is never called a check on a real
   phone. A test, hook or agent that was not run is not reported as run, and a Result line states only what was
   measured.

## Invariants

Rules from `.kiro/steering/domain-invariants.md` apply: ids are never reused or renumbered, each new invariant gets a
property test in the same pull request, and only rules a child depends on are listed. Ids 6, 7, 25 and 37 are retired;
1 to 5, 8 to 24, 26 to 36, 38 to 45 are in use at the start of this spec. This spec adds 46 to 53.

| id | invariant | child depends on |
|---|---|---|
| INV-46 | The item of a round is `itemAt(seed, round)`. The seed holds for the whole run, the round grows only by 1 and only by `NextItem` after a decision, no item repeats the one before it, and the kinds never run three in a row. | what comes next is fair and the same for the same seed; no pattern replaces looking |
| INV-47 | Exactly the house key, the address and the password are secrets; the candy, the ball and the flower are not. For a secret `keep` is right and `give` is wrong, for the rest the other way round, in every seed and round. | a key, an address and a password are never "fine to give" |
| INV-48 | A decision is made only by `DecideItem` while deciding, once: the choice in the state is the choice that was sent, and a `DecideItem` after a decision returns the same state. The round and the seed do not change. | the game never decides for me, and a second press changes nothing |
| INV-49 | A decision scores once: a right one adds the points for the streak and extends the streak, a wrong one ends the streak and adds nothing. No other event moves the score or the streak, but a new run or the way back to the title. | knowing which is which pays; guessing does not |
| INV-50 | Once a decision is made, every event except `NextItem` (and the `StartShadows` and `LeaveShadows` that end the run) leaves `shadows` equal: the result stays until the child moves on. `NextItem` before a decision returns the same state; after one it starts the next round (round + 1, deciding, same seed) and changes nothing else. The clock may run out, which changes the phase and not `shadows`. | the result does not change by itself, and "Next" is the only way on |
| INV-51 | `DecideItem` and `NextItem` return the same state outside a run of trial 4 (the end screen included); in a run they change only `shadows` (`DecideItem` also scores, so it changes `run` too). `shadows` is the initial value whenever `trial` is not 4. In trial 4 the events of trials 1 to 3 return the same state, so the lane, the shed and the field stay initial. | the other trials cannot be broken from here, and trial 4 cannot be broken from them |
| INV-52 | `LeaveShadows` from a run or the end screen of trial 4 returns to the title (`phase` `title`, `trial` 0, `shadows` initial, the run restarted with only `best` kept) and changes nothing else. Anywhere else it returns the same state. | I can go back from anywhere; I cannot fall out of another trial |
| INV-53 | `StartShadows` from the title or the end screen of trial 4 begins a run: `phase` `trial`, `trial` 4, round 0 of the seed, a full clock, a score of 0, `best` kept. Anywhere else it returns the same state. | a new run is a fresh start and the best stays |
| INV-15 to INV-17 | (widened) the clock only runs down inside a run, between 0 and 60 seconds, and a new run or the way back sets it to 60; the score only goes up on a right decision (for trial 4); a run is over exactly when the clock is at zero, and the end screen takes only the events listed in `domain-invariants.md` | the 60 seconds are fair |

`.kiro/steering/domain-invariants.md` has the rows and the note on this scope. INV-1 to INV-5, INV-8 to INV-14,
INV-18 to INV-24, INV-26 to INV-36, INV-38 to INV-45 keep their text and their tests.

## Verification summary

| layer | what | requirement |
|---|---|---|
| unit (`shadows.test.ts`, `reducer.test.ts`) | the rules and the events of trial 4, the pinned seeds, the clock, the score (and that guessing scores less) and the leave | REQ-7.3 to 7.8 |
| property (`shadows.pbt.test.ts`) | INV-3 and INV-4 with the new events, INV-46 to INV-53, and INV-15 to INV-17 for trial 4 | REQ-7.7, 7.8, 7.12 |
| model (`shadows.model.test.ts`) | states, invariants, goals, the deliberate breaks | REQ-7.3, 7.7, 7.12 |
| content (`shadows-content.test.ts`) | keys, placeholders, Japanese rules, lengths, no blame, fear or claims, the title caption | REQ-7.1.6, 7.4, 7.6, 7.11 |
| view and layout (`shadows-view.test.ts`, `shadows-layout.test.ts`, `title-view.test.ts`, `over-view.test.ts`, `route.test.ts`, `field-layout.test.ts`) | what each stage shows, no overlap, targets of 80 or more, the title's card and three buttons, scene choice | REQ-7.1 to 7.9 |
| mutation (`npm run mutation`) | no surviving mutant | REQ-7.12, 7.14 |
| mobile and desktop smoke | real taps, pixels, silence, screenshots, offline | REQ-7.1 to 7.13 |
