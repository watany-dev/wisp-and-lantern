# Requirements: Trial 4, The Listening Shadows ("keep secrets")

Spec `07-trial-keep-secrets`. Teaches learning goal L4 (`docs/learning-design.md`): some things are secrets, and
a secret is never handed over, to the helper or to anyone else, because someone may be listening. Requirement ids
are `REQ-7.n`. `REQ-6.n` belongs to `06-trial-verify-stars`, `REQ-5.n` to `05-trial-grant-tools`, `REQ-4.n` to
`04-score-attack`, `REQ-3.n` to `03-trial-tell-vague-request`, `REQ-2.n` to `02-trial-tell` and `REQ-1.n` to the
missing `01-core-loop`; none is reused.

This adds a fourth trial on top of the existing base. It does not rebuild trials 1 to 3: the lane, the shed and the
field keep their rules, clock, score and end screen. The fourth trial copies their shape (a 60-second run with a
score, rounds that go on while the time lasts, a "Title" button in every stage, the shared end screen), because
trials 2 and 3 were changed to that shape after their playtest comments ("I can't go back to the title", "make it
more of a game", "add a 60-second time attack"; see `05-trial-grant-tools` revision 2 and `06-trial-verify-stars`
revision 3). Starting from that shape avoids the same three comments.

## Why

`docs/learning-design.md` lists L4 as "Never hand over keys, addresses or passwords" and trial 4 as "The Listening
Shadows: hand over only the items that are safe to give. Shadows = third parties who listen in."

The child has five things in front of them. The wisp is ready to take things, and two shadows sit beside the wisp,
listening. Some of the five things are safe to give (candy, a flower, an acorn, a leaf). One or two are secrets:
the house key, the address (a house with a pin) or the password (a speech bubble with hidden letters). The child
taps a thing to hand it to the wisp. A safe thing is handed over and scores. A secret is never handed over: the
game holds it back, says kindly that it is a secret and that a shadow may be listening, and the child goes on.
When every safe thing has been handed over, the secrets are still with the child, a closing line says so, and the
next five things come. It is a 60-second run, so a child who taps everything without thinking keeps losing the
streak, and a child who keeps the secrets back scores more.

The shadows are not enemies. They do nothing, take nothing and never come closer. They stand for "someone else may
be listening", which is the reason a secret stays a secret (L4, "In a real AI agent": never hand over keys,
addresses or passwords). The words never say that a shadow is bad, that something bad will happen, or that the
child did something bad; fear is not used to make the child obey (`docs/learning-design.md`, "What we do not
teach").

The learning-design row says "house key, name, candy" are the safe items. That contradicts L4, which says a key is
never handed over, and this request ("the house key, the address and the password are never handed over, candy
may be"). The row is corrected in this spec (REQ-7.14.4; see `design.md`, Decisions). A name is not used as an item
in either group.

## Scope

In: trial 4 only, from a tap on the title to the end screen of the run, the replay, and the way back to the title.
Touches `src/domain`, `src/game`, `src/content`, their tests, `e2e/`, this spec, the steering invariants file, the
trial 4 row of `docs/learning-design.md` and the smallest notes that keep other documents true. The title gains a
third button and its art and card move up to make room (REQ-7.1.1). The end screen is shared and names the bag's
two actions.

Out: trials 5 and 6, the parent screen, judge features (no `?trial=n` jump), a trial-select screen or a general
router, network use, saving, sound, a "type your password" field or any other text input, real personal data of
any kind, a shared framework for future trials, new dependencies. No change to `vite.config.ts`,
`stryker.config.json`, `package.json`, `scripts/check-*` or `.github/`.

## Relation to earlier specs

Earlier specs say "trials 4 to 6 are out" (05, 06). Those sentences were true of their scope, not a ban on a fourth
trial. The earlier specs keep their text. Nothing is silently replaced.

### Inherited (applies to trial 4 as it is)

| old | what | now |
|---|---|---|
| REQ-2.9 | Japanese and English, `?lang=`, then the browser language; a language change never changes progress | REQ-7.11 |
| REQ-2.10 and hard rule 7 | meaning is never carried by color alone | REQ-7.2.3, REQ-7.10.3 |
| REQ-2.11 | 390 x 844 portrait, one finger or a mouse, targets of 80 x 80 or more, the hero's floor drag | REQ-7.9 |
| REQ-2.12 and hard rule 4 | no network after the first load, art drawn in code, bundled font | REQ-7.10 |
| REQ-2.13, REQ-3.6 | text lives in `src/content`; Japanese rules for the kid text; placeholders replaced | REQ-7.11 |
| REQ-2.15, REQ-3.9, REQ-5.15, REQ-6.14, ADR 0003 | no gate gets weaker | REQ-7.14 |
| REQ-4.1 to REQ-4.3, REQ-4.5, REQ-6.7 | a 60-second run: the clock, the top row, the score and the streak, the end screen, play again, the way back | the same `Run`, top row, end screen and "Title" button (REQ-7.7) |
| REQ-6.4.2 (the tone) | kind words; nothing red, no cross, no shake, no sound; no blame; the fact is not hidden | REQ-7.4 |
| REQ-6.9.5 | a new set of buttons ignores presses for 450 ms | REQ-7.9.5 |
| ADR 0001, hard rule 3 | the domain is pure; time and randomness reach it only through events | REQ-7.1.2, REQ-7.12.1 |

### Trials 1 to 3 only (kept as written; trial 4 does not use them)

| old | what | in trial 4 |
|---|---|---|
| REQ-2.1 to REQ-3.5, REQ-4.4 | cards, asking the wisp, the wishes | not used |
| REQ-5.2 to REQ-5.8 | tools, the hand-over of a tool, the door | not used. The bag's hand-over is its own event (`GiveItem`) |
| REQ-6.2 to REQ-6.6 | stars, the lens, verdicts, the keep | not used |
| INV-5, INV-8 to INV-14, INV-18 to INV-24, INV-26 to INV-45 | the lane, the shed, the field | unchanged; INV-53 and INV-54 keep the bag and the other trials apart |
| INV-15 to INV-17 | the 60-second run | widened to the bag: its `Tick`, its score, its end screen |

### Changes to a shared entrance or event

| old requirement | the code today | change | new |
|---|---|---|---|
| REQ-6.1.1, REQ-5.1.1 (the title's buttons) | two buttons, the field's at (195, 648) and the shed's at (195, 736) | a third button, for trial 4, above the field's at (195, 560). The field's and the shed's buttons do not move | REQ-7.1.1 |
| title art and card (REQ-6.1.1, `title-layout.ts`) | the title's name at y 230, trial 1's card at (195, 372), the wisp at (285, 538), the hero at (110, 548) | the name moves to y 160, the card to (195, 300) with its two texts, the wisp to (285, 444) and the hero to (110, 454); `titleArtBottom` becomes 512. One test pins the old art position (`field-layout.test.ts`); it is changed with the reason in `tasks.md` | REQ-7.1.1 |
| `sceneFor` (REQ-6.8.2) | `trial` 2 is the shed, 3 the field, anything else in a trial the lane | `trial` 4 is the bag | REQ-7.8.2 |
| `GameEvent` | the field's events | gains `StartBag` (with a seed), `GiveItem`, `RetryBag`, `LeaveBag` | REQ-7.8.3 |
| `Tick` (REQ-6.7.1) | runs the clock in trials 1, 2 and 3 | also in trial 4 | REQ-7.7.1, INV-15 |
| `Start` on the end screen | begins trial 1 (the shed's and the field's state are dropped) | also drops the bag's state | REQ-7.8.4 |
| the end screen (REQ-6.7.4) | trial 1: one button; the shed and the field: play again and title | the bag's end screen has the same two buttons (`playBag`, `leaveBag`) | REQ-7.7.4 |
| `TitleScene` return lock (REQ-6.7.6) | taps are ignored for 0.7 s after a trial sends the child back | unchanged, and true after the bag | REQ-7.7.6 |
| other trials' events | each acts only in its own trial | no code change: they already return the same state in trial 4 (INV-54) | REQ-7.8.3 |
| `e2e/helpers.ts` `GameState` type | has `shed` and `field` | gains `bag` | REQ-7.13 |

## Glossary

- **Bag**: the five things in front of the child in one round, and the child's state in trial 4. The code calls the
  trial's state `bag`; the screen shows the things as five cards.
- **Thing** (item): one of the five cards. Each is safe or a secret. Things are numbered 0 to 4, top row left to
  right, then the bottom row.
- **Safe thing**: candy, a flower, an acorn or a leaf. It may be handed to the wisp.
- **Secret**: the house key, the address or the password. It is never handed over.
- **Hand over**: the child taps a thing; a safe thing goes to the wisp, a secret does not.
- **Hold back**: what the game does with a tapped secret: it stays with the child and the message says why.
- **Shadow**: one of two soft shapes beside the wisp, with round eyes and a big ear. It stands for someone who may be
  listening. It is not a tap target, and it never moves toward anything or takes anything.
- **Round**: one bag, from five fresh things to the moment every safe thing is handed over. The rounds come from
  the seed, four in order, and then they start again.
- **Done**: a round where every safe thing has been handed over. The secrets are still with the child.
- **Run, seed, streak, end screen**: as in `06-trial-verify-stars`: the 60 seconds, a whole number the game draws
  when the bag opens, the right hand-overs in a row, and what the run shows when the clock reaches zero.
- **Rule card**: the panel under the message that shows the three secrets as pictures, each with a padlock, while a
  round is played. It is the guide for a child who cannot read yet.
- **Closing line**: a short sentence, shown in the place of the rule card after every done round, that looks back at
  what the child did: the secrets stayed with them and only safe things were handed over.

## Requirements

### REQ-7.1 Enter the bag with a tap

As a 6-year-old, I want to open the shadows' trial from the title with my finger, so that I can play it without a
grown-up.

1. The title screen shows a third extra tap target, for trial 4: a button with a picture of a padlock, a short
   label and the caption "How many in 60 seconds?" in the child's language, at least 80 x 80 game pixels. It sits
   above the field's button, 8 pixels apart, clear of the title's wisp, hero and trial 1's card. The field's and the
   shed's buttons do not move; the title's name, trial 1's card, the wisp and the hero move up to make room.
2. Tapping the button opens the bag and begins its run. The state moves from `title` to `trial` with `trial` 4,
   round 0 of a new seed, a full clock of 60 seconds, a score of 0 and a streak of 0. The best score of the session
   carries over. The lane, the shed and the field are untouched. The game draws the seed (outside the domain) and
   sends it with the event; the domain draws nothing.
3. A tap on this button never also starts trial 1, the shed or the field, and a tap on another button never opens
   the bag. A tap on the title anywhere else starts trial 1 as before.
4. The entrance is an ordinary tap on the ordinary screen. It is not a judge URL, a hidden gesture, a console call,
   or a query parameter. There is no trial-select screen and no general router.

### REQ-7.2 What the bag shows

1. The bag's screen shows the run's top row (the seconds left, the bar and the score), a guide, five things in two
   rows (three above, two below), a message, the rule card (or, after a done round, the closing line), the wisp, two
   shadows beside the wisp, and a "Title" button. The "Next" button appears only after a done round.
2. The guide is two lines at most and stays on screen in every stage. It names the three secrets and says they are
   never given to anyone.
3. Each thing is a card with a picture and its name. The pictures differ by outline, not only by color: candy (a
   round sweet with two twisted ends), a flower (petals round a middle), an acorn (a nut with a cap), a leaf (a
   pointed oval with a vein), the house key (a key with a small house on its bow), the address (a house with a
   pin), the password (a speech bubble with three stars for hidden letters). A handed-over thing gets a frame and a
   tick. After a done round every secret gets a padlock badge. Neither is told by color alone.
4. The wisp is on screen in every stage with its usual friendly face. It is never drawn angry, sly, scared or hurt,
   and it never asks for a secret. It is not a tap target.
5. The two shadows are on screen in every stage, beside the wisp. They have round eyes and a big ear, no teeth, no
   claws and no angry face. They do not move toward the child or the things, and nothing they do carries meaning.
   They are not tap targets.

### REQ-7.3 Hand over only what is safe

As a 6-year-old, I want to give the wisp the things that are fine to give, so that I see what I gave and score.

1. Tapping a safe thing that is still with the child hands it to the wisp: the card gets a frame and a tick, the
   message says that this thing is safe to give, and the run scores (REQ-7.7.3). Only that thing changes.
2. Tapping a thing already handed over, or tapping anywhere that is not a thing, changes nothing.
3. Things can be handed over in any order. The result for a thing does not depend on the order.
4. The result of a tap is decided at once by the reducer. It never waits for an animation or a timer. A short
   flourish may play (the thing's picture floats to the wisp), and may be ignored without losing information.

### REQ-7.4 A secret is never handed over

As a 6-year-old, I want the game to tell me kindly when I tap a secret, so that I learn to keep it, without being
scared.

1. Tapping a secret never hands it over, in any stage and any number of times. No secret is ever marked as handed
   over, and no round is done because of a secret.
2. The secret stays where it was. The message names the secret, says it is a secret, and says that a shadow may be
   listening. The words are plain and kind: no "bad", "wrong", "no!", "danger", "steal", "thief", "enemy", "scary",
   "lie", no blame for the child, the wisp or the shadows, and no threat of something happening.
3. Nothing is red, no cross is shown, nothing shakes and there is no sound. The card may wobble once and the
   shadows' ears may twitch once; neither carries meaning.
4. A secret tap costs no time, no life and no points: it scores nothing and ends the streak (REQ-7.7.3), and that
   is all. The child can tap it again, and any other thing, as often as they like. There is no count of tries.
5. The words never say or suggest that the helper is always wrong, always right, knows everything, is a friend or
   family, or that the shadows are bad, or that keeping secrets makes the child safe from everything
   (`docs/learning-design.md`, "What we do not teach").
6. The rule card shows the three secrets as pictures, each with a padlock, in every stage of a round in progress. It
   tells the child which things stay with them without reading.

### REQ-7.5 A round is done when every safe thing is handed over

1. Every round has five things: 1 or 2 secrets and the rest safe (4 or 3), each thing at most once. The first round
   of a run has one secret, the second two. Which things a round has, and where they are, comes from the seed and the
   round number only (a fixed rule, no other randomness), and does not change while the round lasts.
2. When the last safe thing is handed over the round is done at once: the message names the number of things handed
   over (3 or 4), every secret gets its padlock badge, the closing line takes the place of the rule card, and the
   "Next" button appears.
3. A done round stays on screen until the child taps "Next". Nothing but the end of the run removes it by itself. No
   thing can be handed over in a done round.
4. "Next" starts the next round: nothing handed over, the next things of the seed (1 secret in the even rounds, 2 in
   the odd ones; the table has four rounds and then starts again). Nothing ends the trial but the clock.

### REQ-7.6 The closing line looks back

1. A done round shows a closing line, a separate text, that looks back at the child's action: the secrets stayed
   with them and only the safe things were handed over. The wording is in `design.md`.
2. It is shown after every done round, in the place of the rule card, and not while the round is played. It is not
   joined to the message. The things, their marks and the button stay visible, and no text gets smaller to make
   room.
3. It says only what happened in this game. It does not claim that real AI always listens, never listens, that a
   secret kept here keeps the child safe in general, or that AI is a friend or family.
4. Why the secrets are named on the screen and every safe thing is accepted at once (a staging device so that the
   child can practise "a key, an address and a password stay with me", not a claim that real privacy is that easy)
   is written in `design.md`.

### REQ-7.7 A 60-second run, a score, and the way back

1. The bag is a 60-second run with trial 1's `Run`: a full clock at the entrance, a score of 0, a streak of 0, the
   best of the session carried over. The clock counts down whatever the child is doing. Time reaches the game only
   as `Tick` (a frame counts as at most 250 ms), and `Tick` acts in the bag as in trials 1 to 3. The top row shows
   the seconds, a bar and the score.
2. Nothing ends the trial but the clock: rounds go on while the time lasts.
3. Scoring. Handing over a safe thing scores 100 plus 50 for each hand-over in a row before it, up to 4 (100, 150,
   200, 250, 300, 300 ...). A secret tap scores nothing and ends the streak. "Next" and every other event score
   nothing and leave the streak. The score is decided at once by the reducer. A hand-over pops its points ("+150")
   from the card for a moment; the top row is the record of it.
4. Time up ends the run at once, in any stage. The end screen is trial 1's: "Time's up!", the score, the best, and
   "New best!" when the run beat it. It has two buttons: "Play again" begins a new run of the bag (a full clock, a
   score of 0, round 0 of a new seed, only the best kept) and "Title". It ignores taps for a moment as before.
5. A "Title" button is on the bag's screen in every stage (80 x 80, the shed's button at the same place) and on its
   end screen (wide). It returns to the title: `phase` `title`, `trial` 0, the bag initial, the run restarted with
   only the best kept. Nothing else changes (the language and the hero stay).
6. The title ignores taps for 0.7 s after the bag sends the child back, as after the shed and the field.
7. No soft-lock: from every state of the bag (a round in progress, a done round, the end screen) the child can reach
   a done round, a score, the end screen, a fresh round and the title with the bag's own buttons; and without the
   clock and without the "Title" button the bag's own taps still give a way on.

### REQ-7.8 Trials stay apart

1. Entering the bag leaves `lane`, `shed` and `field` as they were on the title.
2. The scene shown follows `trial`: 1 the lane, 2 the shed, 3 the field, 4 the bag. A state with `trial` 4 never
   shows another trial's scene.
3. In trial 4 (a run or its end screen) the events of the other trials (`Ask`, `PickCard`, `Retry`, `PickTool`,
   `GiveTool`, `RetryShed`, `LeaveShed`, `InspectStar`, `SortStar`, `KeepStars`, `RetryField`, `LeaveField`) return
   the same state. Outside a run of trial 4 the bag's events (`GiveItem`, `RetryBag`) return the same state, the end
   screen included. `LeaveBag` is accepted in trial 4 only (a run or its end screen), and `StartBag` from the title
   and from the bag's own end screen only.
4. `Start` in a run of the bag sets the language only; on the bag's end screen it begins trial 1 and drops the bag's
   state. `SetLang` changes the language only. `MoveHeroTo` moves the hero only.
5. Which things are secrets is derived from the seed and the round and never stored. What the child handed over is
   one value: the `given` marks while a round is played, and "every safe thing" once it is done.
6. The behaviour, texts and tests of trials 1 to 3 are unchanged by this spec, except the title's layout (see
   "Changes to a shared entrance or event").

### REQ-7.9 Portrait, one finger, mouse

1. The bag plays on the existing 390 x 844 portrait canvas.
2. Every action is one tap or click on an object of at least 80 x 80 game pixels: the title's bag button, each
   thing, "Next", the "Title" button and the end screen's two buttons. There is no drag, hold, double tap, second
   finger or text input.
3. The hero's floor drag still moves the hero in the bag. A press that starts on a thing or a button does not move
   the hero; a press on the floor does.
4. Texts and pictures do not overlap each other or hide a thing, the message, the rule card, the closing line or a
   button, in every stage, with the top row and the "Title" button, in both languages, with the names and numbers
   inserted. The "Next" button ends above the hero's start place.
5. The "Next" button ignores presses for 450 ms after it appears, as the field's buttons do.

### REQ-7.10 Drawn in code, no network, no color, no sound

1. The things, the badges, the rule card, the shadows and the screen are drawn in code at the device pixel ratio,
   with the existing look. No image file is added and no third-party art is used (hard rule 5).
2. The bag needs no network request after the page and its bundled font have loaded, in Japanese and in English
   (hard rule 4). A full play of hand-overs, a secret tap, a done round, "Next" and the way back works offline.
3. Motion never carries the only meaning, never flashes faster than 3 times a second, and can be ignored. Every
   state of a thing (with the child, handed over, a secret kept) is told in a still picture by shape: the tick, the
   padlock badge, the name.
4. The game plays no sound, and the trial needs none.

### REQ-7.11 Japanese and English, and text in content

1. The guide, the messages, the thing names, the button labels, the title's bag label and caption and the closing
   line are in `src/content/strings.ja.json` and `strings.en.json`, under the same keys. No child-facing literal
   appears in `src/game/` or `src/domain/`.
2. Japanese follows hard rule 2 through `npm run kid`: no kanji, no Latin letters, at most 12 characters a line and 2
   lines, also after a thing's name or a number is inserted. English messages are at most 2 lines of at most 28
   characters.
3. A message that takes a name or a number takes exactly one and keeps no unreplaced placeholder.
4. The language is the existing one. `SetLang` can change it at any time; the words change and nothing else.
5. `npm run kid` and `npm run font` pass after the strings change; the subset font covers every character.

### REQ-7.12 Pure rules, checked several ways

1. The round, the hand-over, the hold-back, the score, the next round, the clock and the leave are rules of the pure
   reducer (ADR 0001). `src/domain` uses no Phaser, DOM, clock or randomness. The seed is an event field: the same
   seed and the same events always give the same states.
2. Each of INV-46 to INV-57, and INV-15 to INV-17 for the bag, has a property test over the real reducer with
   `checkProperty`, and the generators tap every thing, safe and secret, tap a thing already handed over, use an
   index that does not exist, finish rounds, run out the clock, play again, leave, go to the next round before and
   after a done round, and go round the whole table. INV-1 to INV-4 also run over sequences with the new events.
3. Unit tests cover: the things of several seeds pinned (1 or 2 secrets, neighbouring rounds differ in the number,
   no thing twice), a safe hand-over, a secret tap for each secret, a repeated secret tap, a thing already handed
   over, an index out of range, the last safe thing ending the round, the lock of a done round, the next round and
   the wrap, the score and the streak (100, 150, 200, 250, 300), the clock, time up, play again with the best kept,
   the leave from a run and the end screen and nowhere else, and the entry from the title. For content and view:
   ja/en same keys, placeholders, lengths, no blame or fear words, no claims, the closing line only after a done
   round, "Next" only after a done round, the message follows the last tap, the badges, the title's words, the end
   screen's buttons.
4. A model check over the real reducer (`bag.model.test.ts`) covers the entrance from the title with two seeds and
   the bag after it, with a finite alphabet that includes the other trials' events, out-of-range things, a half-run
   and a run-ending `Tick`, `Start` and language changes. It checks against an independent record of what the child
   did that no secret is ever handed over, the bag equals the record, the clock agrees, and the score moves only on a
   safe hand-over by the points for the streak; from every reachable state a done round, a score, the end screen, a
   fresh round, the title and a second done round are reachable (and a done round without the clock and the
   "Title" button). It records the number of states and the counterexamples of deliberate breaks.
5. Mutation testing finds no surviving mutant in the unit-tested code.

### REQ-7.13 The real taps and the real screen

1. The mobile smoke enters the bag from the title with a real tap and plays: a safe thing handed over (tick drawn,
   score up); a secret tapped (nothing handed over, the score unchanged, the streak ended, the message changed), for
   each secret kind the seed shows; every safe thing handed over and the done round with the padlock badges, the
   closing line and "Next"; the second round with two secrets; time up and the end screen; "Play again" with the best
   kept; "Title" from a run and from the end screen, with a quick second tap not starting trial 1. `window.__game`
   reads the state; `dispatch` is used only for `Tick` and `SetLang`, which have no button.
2. The smoke checks the screen, not only the state: the tick of a handed-over thing, the padlock badges, the rule
   card, the "Next" button, the closing line's panel and its text are read from the pixels.
3. Japanese and English screenshots of the start, a secret tap, a done round and the end screen, and the title with
   its three buttons, are looked at. The desktop smoke plays the bag with the mouse and checks that a held press on a
   thing does not move the hero. Offline after the first load, in both languages, the whole path still works.
4. The smoke of trials 1 to 3, including the score attack and the title tests, still passes. The title's bag button
   starts none of them, and a tap elsewhere on the title still starts trial 1.

### REQ-7.14 No gate gets weaker, and what is verified is said

1. No threshold, config, check script, workflow or existing test is loosened, deleted or relaxed to pass. Where this
   spec forces an old expectation to change, `tasks.md` names the old test and the new one, and why trials 1 to 3
   are not weaker.
2. `npm run check` passes. The task that connects input to the screen also passes `npm run build` followed by
   `npm run smoke`.
3. The smoke targets mobile WebKit and desktop Chromium. Where WebKit cannot start in the authoring sandbox, the
   result says that the mobile smoke ran on Chromium with the iPhone 13 touch profile, and CI's WebKit run is what
   counts. A Playwright run is never called a check on a real phone. A test, hook or agent that was not run is not
   reported as run, and a Result line states only what was measured.
4. The trial 4 row of `docs/learning-design.md` says what the trial does, with the safe and the secret things as
   built (no "house key" among the safe things).

## Invariants

Rules from `.kiro/steering/domain-invariants.md` apply: ids are never reused or renumbered, each new invariant gets a
property test in the same pull request, and only rules a child depends on are listed. At the start of this spec the
ids in use are 1 to 5, 8 to 24, 26 to 36 and 38 to 45; 6, 7, 25 and 37 are retired. This spec adds 46 to 57 and
widens 15 to 17.

| id | invariant | child depends on |
|---|---|---|
| INV-46 | A round has five things, 1 or 2 of them secrets and the rest safe, no thing twice, and they are exactly `itemsOf(seed, round)`: the same seed and round always give the same things. The seed and the round do not change until `RetryBag`. | there is always something to give and something to keep; the same seed plays the same |
| INV-47 | A secret is never handed over: in every state no secret is marked as given, and a done round has handed over exactly the safe things of its round. | my key, address and password stay with me |
| INV-48 | `GiveItem` on a safe thing that is still with the child hands over exactly that thing: it becomes given, `last` is that thing, and every other thing keeps its mark; when it was the last safe thing the round is done. | what I give is what is given |
| INV-49 | `GiveItem` on a secret hands nothing over and never finishes the round: no mark changes and `last` is that secret. It can be tapped again, without limit and at no cost but the streak. | a secret tap is not scary and not final |
| INV-50 | `GiveItem` on a thing already given, on an index that is not a thing, or in a done round returns the same state. | a stray tap changes nothing |
| INV-51 | A round is done only by `GiveItem` on its last safe thing. Once done, every event except `RetryBag` (and the `StartBag` and `LeaveBag` that end the run) leaves the bag equal; the clock may run out, which changes the phase and not the bag. | the result does not change by itself |
| INV-52 | `RetryBag` after a done round starts the next round (the first after the last): nothing given, no `last`, the same seed, and nothing else in the state changes. Before a round is done it returns the same state. | the next bag, any number of times |
| INV-53 | `GiveItem` and `RetryBag` return the same state outside a run of trial 4 (the end screen included); in a run they change only `bag` (`GiveItem` also scores, so it changes `run` too). `bag` is the initial bag whenever `trial` is not 4. | the other trials cannot be broken from the bag |
| INV-54 | In trial 4 (a run or its end screen) the events of the other trials (`Ask`, `PickCard`, `Retry`, `PickTool`, `GiveTool`, `RetryShed`, `LeaveShed`, `InspectStar`, `SortStar`, `KeepStars`, `RetryField`, `LeaveField`) return the same state, so the lane, the shed and the field stay initial. | the bag cannot be touched from another trial |
| INV-55 | A hand-over scores once: `GiveItem` on a safe thing adds the points for the streak and extends the streak; on a secret it ends the streak and adds nothing. No other event moves the score or the streak, but a new run or the way back to the title. | keeping secrets pays; tapping everything does not |
| INV-56 | `StartBag` from the title or the end screen of trial 4 begins a run: `phase` `trial`, `trial` 4, round 0 of the seed, a full clock, a score of 0, `best` kept. Anywhere else it returns the same state. | a new run is a fresh start and the best stays |
| INV-57 | `LeaveBag` from a run or the end screen of trial 4 goes to the title (`phase` `title`, `trial` 0, `bag` initial, the run restarted with only `best` kept) and changes nothing else. Anywhere else it returns the same state. | I can go back from anywhere; I cannot fall out of another trial |
| INV-15 to INV-17 | (widened) the clock, the score and the end screen of the run: `StartBag` and `LeaveBag` set the clock to 60 seconds, the score goes up in the bag only on a safe hand-over, and the bag's end screen also takes `StartBag` and `LeaveBag` | the 60 seconds are fair |

## Verification summary

| layer | what | requirement |
|---|---|---|
| unit (`bag.test.ts`, `reducer.test.ts`) | the rules and events of the bag, the pinned seeds, the clock, the score, the leave, the guards | REQ-7.3 to 7.8 |
| property (`bag.pbt.test.ts`) | INV-1 to INV-4 with the bag events, INV-46 to INV-57, INV-15 to INV-17 for the bag | REQ-7.7, 7.8, 7.12 |
| model (`bag.model.test.ts`) | states, invariants, goals, deliberate breaks | REQ-7.4, 7.5, 7.7, 7.12 |
| content (`bag-content.test.ts`) | keys, placeholders, Japanese rules, lengths, no blame or fear, no claims | REQ-7.4, 7.6, 7.11 |
| view and layout (`bag-view.test.ts`, `bag-layout.test.ts`, `title-view.test.ts`, `over-view.test.ts`, `route.test.ts`) | what each stage shows, no overlap, targets of 80 or more, the title's three buttons, the scene choice | REQ-7.1 to 7.9 |
| mutation (`npm run mutation`) | no surviving mutant | REQ-7.12, 7.14 |
| mobile and desktop smoke | real taps, pixels, screenshots, offline | REQ-7.1 to 7.13 |
