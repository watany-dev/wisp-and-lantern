# Requirements: Trial 5, The Flickering Lantern ("tell it what's wrong")

Spec `08-trial-tell-whats-wrong`. Teaches learning goal L5 (`docs/learning-design.md`): when a helper brings something
that is almost right, you do not ask for the whole thing again; you say **where** it is different and **how** it should
be, and the helper fixes just that part. Requirement ids are `REQ-8.n`. `REQ-7.n` belongs to `07-trial-keep-secrets`,
`REQ-6.n` to `06-trial-verify-stars`, `REQ-5.n` to `05-trial-grant-tools`, `REQ-4.n` to `04-score-attack`, `REQ-3.n` to
`03-trial-tell-vague-request`, `REQ-2.n` to `02-trial-tell` and `REQ-1.n` to the missing `01-core-loop`; none is reused.

This adds a fifth trial on top of the existing base. It does not rebuild trials 1 to 4: the lane, the shed, the field
and the shadows keep their flows, clocks, scores and end screens. Like trial 4, trial 5 is a 60-second time attack with
a score, a streak, trial 1's end screen and a "Title" button from its first version.

## Why

`docs/learning-design.md` left trial 5 as "TBD". This spec fills it with L5, "tell it what's wrong". Each round, the
child has a wish: a lantern drawn on a card (a handle, a roof and a light). The wisp brings a lantern that matches the
wish in every part but one, and that one part flickers. The child taps the flickering part (where), then picks the card
that says how it should be (how). The wisp changes exactly that part to exactly what the card says. When the card
matches the wish, the lantern lights up and stays lit; when it does not, the part is changed as told and still
flickers, and the child looks at the wish and tells it again. Then the next lantern comes.

The point is the contrast with starting over. The lantern is almost right, so the child never asks for a new one: a
pointer and one word fix it, and every other part stays as it was. A right card scores, more when several in a row
are right; a wrong card scores nothing and ends the streak, so a child who compares the lantern with the wish scores
more than one who tries the cards in turn.

The wisp is a helper that did what it was told and brought one part differently. It is never a liar, an enemy or a
fool, and nothing in the trial is dark, scary or threatening.

## Scope

In: trial 5 only, from a tap on the title to the end screen of the run, the replay and the way back to the title.
Touches `src/domain`, `src/game`, `src/content`, their tests, `e2e/`, this spec, the steering invariants and product
files, and the smallest notes that keep other documents true (the learning design's L5 row and trial 5 row, the
changelog, the checklists, the evidence). The title gains a fourth button and its name, card and art move up to make
room (REQ-8.1). The end screen is shared with trials 1 to 4 and gains a button pair for trial 5.

Out: trial 6, the parent screen (`parents.*.json` keeps its empty list), judge features (no `?trial=n` jump or
judge-only entrance), a trial-select screen or a general router, network use or measurement, saving, a service worker,
sound, a shared framework for future trials, new dependencies, new image files. No change to `vite.config.ts`,
`stryker.config.json`, `package.json`, `scripts/check-*` or `.github/`. Teaching how to write a prompt for a real AI,
or claiming that a real helper always fixes only what it is told, is not in scope: the lantern and its three parts are
a staging device (see REQ-8.7.5).

## Relation to earlier specs

Earlier specs say "trials 5 and 6 are out" (07). That sentence was true of its scope, not a ban on a fifth trial.
Nothing is silently replaced; spec 07 gains one pointer note at the top of its requirements (and its `jp/` copy), as
06 did for 07.

### Inherited (applies to trial 5 as it is)

| old | what | now |
|---|---|---|
| REQ-2.9 | Japanese and English, `?lang=`, then the browser language; a language change never changes progress | REQ-8.13 |
| REQ-2.10 and hard rule 7 | meaning is never carried by color alone | REQ-8.3.3, REQ-8.12.4 |
| REQ-2.11 | 390 x 844 portrait, one finger or a mouse, targets of 80 x 80 or more, the hero's floor drag | REQ-8.11 |
| REQ-2.12 and hard rule 4 | no network after the first load, art drawn in code, bundled font | REQ-8.12 |
| REQ-2.13, REQ-3.6 | text lives in `src/content`; Japanese rules for the kid text; placeholders replaced | REQ-8.13 |
| REQ-2.15, REQ-3.9, REQ-5.15, REQ-6.14, REQ-7.14, ADR 0003 | no gate gets weaker | REQ-8.16 |
| REQ-4.1 to REQ-4.3, REQ-4.5, REQ-4.6.1 | a 60-second run: the clock, the top row, the score and the streak, the end screen, play again | the same `Run`, the same top row and end screen (REQ-8.9) |
| REQ-5.16, REQ-6.7.5, REQ-7.7.5 | a way back to the title, in a run and on the end screen | the same, for trial 5 (REQ-8.9.5) |
| REQ-6.9.5, REQ-6.7.6, REQ-7.9.5, REQ-7.7.6 | a new set of buttons ignores presses for 450 ms; the title ignores taps for 0.7 s after a trial sends the child back | the same (REQ-8.11.5, REQ-8.9.6) |
| REQ-4.9 to REQ-4.11, REQ-7.10.3 | sharp rendering, characters drawn in code, motion that never carries the only meaning and never flashes faster than 3 times a second | REQ-8.12 |
| REQ-5.4.3, REQ-6.4, REQ-7.4 (the tone) | kind words; nothing red, no cross, no shake, no sound; the fact is not hidden | REQ-8.7 |
| ADR 0001, hard rule 3 | the domain is pure; time and randomness reach it only through events | REQ-8.1.2, REQ-8.14.1 |

### Trials 1 to 4 only (kept as written; trial 5 does not use them)

| old | what | in trial 5 |
|---|---|---|
| REQ-2.1 to REQ-3.5, REQ-4.4 | color and object cards, asking the wisp, the villager's wishes | not used. Trial 5's wish is a lantern of three parts, and its cards each name one part's look |
| REQ-5.2 to REQ-5.8 | tools, the hand-over, the door | not used |
| REQ-6.2 to REQ-6.6 | stars, the lens, verdicts, the keep | not used |
| REQ-7.2 to REQ-7.6 | items, the shadow, give or secret | not used |
| INV-5, INV-8 to INV-14 | trial 1's lane | still hold for every sequence, including the new events; INV-60 says trial 5 cannot touch the lane |
| INV-15 to INV-17 | the 60-second run | widened to trial 5 (its `Tick`, its score, its end screen) |
| INV-18 to INV-24, INV-40 to INV-43 | trial 2's shed | unchanged; INV-60 says trial 5 and the shed cannot touch each other |
| INV-26 to INV-36, INV-38, INV-39, INV-44, INV-45 | trial 3's field | unchanged; INV-60 says trial 5 and the field cannot touch each other |
| INV-46 to INV-53 | trial 4's shadows | unchanged; INV-60 says trial 5 and the shadows cannot touch each other |

### Changes to a shared entrance or event

Each row names the old requirement, what the code does today, and the new requirement. The old text is not edited.

| old requirement | the code today | change | new |
|---|---|---|---|
| REQ-7.1.1 "a third extra tap target" on the title | the title has the shadows button at (195, 560), the field button at (195, 648) and the shed button at (195, 736) | one more button, for trial 5, above the shadows button, at (195, 472). The other three buttons do not move | REQ-8.1.1, 8.1.3 |
| title art and card positions (REQ-7.1.1) | the title text is at y 150, trial 1's card at y 282 (its prompt at y 248, its rule at y 310), the wisp at (285, 448) and the hero at (110, 458); `titleArtBottom` is 514 | all of them move up 88 pixels so that four buttons fit under the art: the title text to y 62, the card to y 194 (prompt 160, rule 222), the wisp to (285, 360), the hero to (110, 370); `titleArtBottom` becomes 426. The pinned numbers in `field-layout.test.ts` (`titleArt`) change with them; the other title tests compare positions and still hold | REQ-8.1.1 |
| title texts | each button has a label and the caption "How many in 60 seconds?" | the fourth button has the same caption (`lantern.timeAttack`) | REQ-8.1.6 |
| `sceneFor` (REQ-7.8.2) | `trial` 2 is the shed, 3 is the field, 4 is the shadows, anything else in a trial is the lane | `trial` 5 is the lantern | REQ-8.10.2 |
| `GameEvent` | has the events of trials 1 to 4 | gains `StartLantern` (with a seed), `TapPart`, `FixPart`, `NextLantern`, `LeaveLantern` | REQ-8.10.3 |
| `GameState` | has `lane`, `run`, `shed`, `field`, `shadows` | gains `lantern`, the initial value whenever `trial` is not 5 | REQ-8.10.1, INV-60 |
| `Tick` (REQ-4.2.2; REQ-5.7.1; REQ-6.7.1; REQ-7.7.1) | runs the clock in trials 1 to 4 | also in trial 5 | REQ-8.9.1, INV-15 |
| `Start` on the end screen | begins trial 1 (the other trials' state is dropped) | also drops trial 5's state | REQ-8.10.4 |
| the end screen (REQ-4.5, REQ-5.7.5, REQ-6.7.4, REQ-7.7.4) | one button (trial 1), or two (trials 2 to 4: play again, title) | trial 5's end screen has the same two buttons: play again (sends `StartLantern`) and title (sends `LeaveLantern`) | REQ-8.9.4 |
| `TitleScene` | after a trial sends the child back, taps are ignored for 0.7 s | unchanged, and now also true after trial 5 | REQ-8.9.6 |
| `e2e/helpers.ts` `GameState` type | has `shed`, `field` and `shadows` | gains the `lantern` field | REQ-8.15 |
| `button-view.ts`, `ui/field-buttons.ts` | four button pictures (a tick, a ring of dots, an arrow, a padlock) | nine more pictures, one for each look of a part; the pictures and behavior of trials 3 and 4 do not change | REQ-8.5.1 |

## Glossary

- **Lantern**: the place of trial 5, The Flickering Lantern; also the lantern the wisp brought in a round.
- **Part**: one of the three parts of a lantern, from the top: the **handle**, the **roof** and the **light**.
- **Look**: what a part is like. Each part has three looks: the handle is a ring, a bow or a bell; the roof is pointy,
  round or flat; the light is a candle, a star or a moon. Nine looks in all, each with its own picture and word.
- **Wish**: the lantern the child wants in this round, drawn on its own card beside the wisp's lantern.
- **Flickering part**: the one part of the wisp's lantern whose look is not the wish's. It flickers, and has a frame of
  dots. The other two parts are **steady**.
- **Point**: a tap on a part of the wisp's lantern. Pointing at the flickering part opens its cards; pointing at a
  steady part is answered with "that part is fine".
- **Card**: one of the two buttons that open for the part pointed at, each with a look's picture and word: the two
  looks of that part that it does not have now.
- **Fix**: the child's pick of a card. The wisp changes the part pointed at to the look on the card, and nothing else.
  A **right card** is the wish's look: the lantern lights. Any other card is a **wrong card**: the part changes and
  still flickers.
- **Lit**: the lantern matches the wish in every part; it glows and stays lit until "Next".
- **Round**: one lantern, from its arrival to the "Next" after it is lit.
- **Run**: the 60 seconds of trial 5, from the tap on the title's button (or on play again) to the time up. It uses the
  same `Run` as trial 1: the clock, the score, the streak and the best of the session.
- **Seed**: a whole number the game draws when trial 5 opens (not the domain). The same seed always gives the same
  wishes, the same flickering parts and the same lanterns in the same rounds.
- **Streak**: the right cards in a row. A wrong card ends it. The points for a right card are 100 plus 50 for each one
  in the streak, up to 4.
- **End screen**: what the run shows when the clock reaches zero: the score and the best, with "play again" and
  "title".

## Requirements

### REQ-8.1 Enter the lantern with a tap

As a 6-year-old, I want to open the lantern from the title with my finger, so that I can play without a grown-up.

1. The title screen shows a fourth extra tap target, for trial 5: a button with a picture of a lantern and a short label
   in the child's language, at least 80 x 80 game pixels, above the shadows button and clear of it, of trial 1's card,
   of the title's wisp and of the hero.
2. Tapping the button opens trial 5 and begins its run. The state moves from `title` to `trial` with `trial` 5, round 0
   of a new seed, a full clock of 60 seconds, a score of 0 and a streak of 0. The best score of the session carries
   over. The lane, the shed, the field and the shadows are untouched. The game draws the seed (outside the domain) and
   sends it with the event; the domain draws nothing.
3. A tap on this button never also starts trial 1 or opens trials 2 to 4, and a tap on another button never opens the
   lantern. A tap on the title anywhere else starts trial 1 as before, and the end screen's play-again button still
   starts a new run of its own trial.
4. The entrance is an ordinary tap on the ordinary screen. It is not a judge URL, a hidden gesture, a console call or a
   query parameter.
5. There is no trial-select screen and no general router. The only new screen is the lantern.
6. Every sentence on the title matches the trial it sits with. The fourth button carries the caption
   `60びょうで いくつ？` / `How many in 60 seconds?` like the other three; its label has no number in it.

### REQ-8.2 What the screen shows

1. The screen shows the run's top row (the whole seconds left, the bar and the score, as in trials 1 to 4), a guide
   text, the wish on its own panel with a label, the wisp's lantern on a panel beside it with a label, a message, the
   wisp, and a "Title" button (REQ-8.9.5). The cards appear only while a part is pointed at (REQ-8.5.1), and "Next"
   only when the lantern is lit (REQ-8.6.3).
2. The guide is one short sentence in two lines at most. It says that one part flickers and asks the child to tap it
   and say the fix. It stays on screen in every stage.
3. The wish and the wisp's lantern are drawn the same way, at the same size, side by side, with their handles, roofs
   and lights on the same rows, so a child compares them row by row.
4. The wish is always drawn lit: it is the lantern the child wants. It is not a tap target.
5. The wisp is on screen in every stage, with its usual friendly face. It is never drawn angry, sly, scared or hurt. It
   is not a tap target in this trial.

### REQ-8.3 One part flickers

1. In every round the wisp's lantern matches the wish in exactly two parts and differs in exactly one: the flickering
   part. Which part it is and which look it has come from the seed and the round (REQ-8.8).
2. The flickering part moves: it fades and comes back, slower than 3 times a second.
3. The flickering part is also told in a still picture, not by motion or color alone: it has a frame of dots around
   it. A steady part has no frame. Until the lantern is lit its light is dim.
4. The game shows where the lantern differs; it never says how. Which look is right is read from the wish alone.

### REQ-8.4 Point at the part

As a 6-year-old, I want to show the wisp which part is not right, so that it knows where to fix.

1. Every part of the wisp's lantern is a tap target of at least 80 x 80 game pixels.
2. A tap on the flickering part points at it: its frame becomes a solid frame, it stops flickering while it is pointed
   at, the two cards for that part appear, and the message asks which look it should be.
3. A tap on a steady part says, in one plain sentence, that this part is fine and that the flickering one is the one to
   tap. If cards were open, they close. It scores nothing, ends no streak and costs no time.
4. A point never changes the lantern: no part's look, no round, no score.
5. Once the lantern is lit, a tap on a part does nothing.

### REQ-8.5 Say how to fix it

As a 6-year-old, I want to tell the wisp how the part should be, so that it fixes just that part.

1. While a part is pointed at, two cards are on screen, each with the picture and the word of a look: the two looks of
   that part that it does not have now, in the order that follows its look round the three (for a roof that is
   round: flat, then pointy). They appear in no other stage. The right look is on the left in some rounds and on the
   right in others.
2. Pressing a card is the fix, once. The wisp changes the part pointed at to exactly the look on the card. It never
   changes another part, never picks another look, never corrects the card, and never brings a new lantern.
3. A right card (the wish's look) lights the lantern (REQ-8.6). It scores (REQ-8.9.3).
4. A wrong card changes the part to that look; the part still flickers (with its frame of dots), the cards close, and
   the message says what the child said and that the part still flickers. It scores nothing and ends the streak. The
   child points and tells again, without limit and with no time lost.
5. A wrong card is no disaster and no scene of fear. Nothing is red, no cross is shown, nothing shakes and there is no
   sound. A short flourish may play (REQ-8.5.6).
6. The result of a card is decided at once by the reducer. It never waits for an animation or a timer. A short
   flourish (the part popping, a glow) may play and may be ignored without losing information.

### REQ-8.6 The lantern is lit

1. When all three parts match the wish, the lantern is lit: its light is bright with a glow around the glass, the
   frames are gone, nothing flickers, and a tick badge sits on the panel's corner.
2. The message says what the child said and that just that part was fixed. The two other parts were never touched.
3. The button "Next" brings the next lantern. Nothing but the end of the run removes the lit lantern by itself.

### REQ-8.7 The wisp did what it was told; it is not to blame

1. The words say what the wisp brought and what the child said. They never say the wisp is wrong, bad, silly, broken
   or lying, never say it did anything on purpose, and never blame the child.
2. No word in the child-facing text is on the content test's list of blame and fear words (for example "wrong", "bad",
   "mistake", "oops", "sorry", "broken", "silly", "liar", "scary", "afraid", "danger", "monster", and their Japanese
   counterparts; the lists are in `lantern-content.test.ts`). The Japanese word for "different" (the lesson word,
   `ちがう`) is allowed in the question "what is different?" only.
3. The fact is not hidden: after a wrong card the message says that the part still flickers.
4. The child is never told to ask again from the start. The words point to the part and the look: "tap it", "which
   one?", "you said".
5. The words never say or suggest that the helper is always right or always wrong, knows everything, is a friend or
   family, and make no claim about what a real AI does (`docs/learning-design.md`, "What we do not teach"). That a real
   helper also changes only what it is told is a staging device (see `design.md`), not a claim stated in the game.

### REQ-8.8 The lanterns, and their order

1. The three parts and their three looks each are rules of the pure domain. The wish, the flickering part and the look
   the wisp brought for it come from the seed and the round number only (a fixed rule, no other randomness) and do not
   change while the round lasts. A new seed gives a different order.
2. No wish repeats the one before it, in any seed: every part's look changes from one round to the next.
3. The flickering part moves every round: it is never the same part two rounds in a row, and every three rounds each
   part flickers once.
4. The look the wisp brought for the flickering part is one of the two looks that are not the wish's. Which one it is
   decides on which side the right card is, and the sides follow one of two cycles of six rounds that never put the
   right card on the same side three times in a row and do not simply alternate, so "always the same button" and
   "every other button" are not ways to play.

### REQ-8.9 A 60-second run, a score, and the way back

As a 6-year-old, I want to find out how many lanterns I can light in a minute, and to go back to the title whenever I
like, so that I want to play again and never feel stuck.

1. Trial 5 is a 60-second run. It uses trial 1's `Run`: a full clock of 60 seconds at the entrance, a score of 0, a
   streak of 0, and the best score of the session carried over. The clock counts down whatever the child is doing.
   Time reaches the game only as `Tick` (a frame counts as at most 250 ms), and `Tick` acts in trial 5 as it does in
   trials 1 to 4. The top row shows the seconds, a bar and the score.
2. After the lantern is lit, the button "Next" starts the next round: the next wish and the next lantern of the seed,
   nothing pointed at. Nothing ends the trial but the clock.
3. Scoring. A right card scores 100 plus 50 for each right card in a row before it, up to 4 (100, 150, 200, 250, 300,
   300 ...). A wrong card scores nothing and ends the streak. A point and "Next" score nothing and leave the streak.
   The score is decided at once by the reducer. A right card pops its points ("+150") from the lantern for a moment;
   the score in the top row is the record of it.
4. Time up ends the run at once, in any stage (looking, pointing, lit). The end screen is trial 1's: "Time's up!", the
   score, the best of the session, and "New best!" when the run beat it. It has two buttons: "Play again" begins a new
   run of trial 5 (a full clock, a score of 0, round 0 of a new seed, only the best kept) and "Title". It ignores taps
   for a moment so that a last quick tap does not press a button.
5. A "Title" button is on trial 5's screen in every stage and on its end screen: 80 x 80 on the screen (the shed's
   button, at the same place), wide on the end screen. It returns to the title: `phase` `title`, `trial` 0, trial 5
   initial, the run restarted with only the best kept. Nothing else changes (the language and the hero stay), and from
   there trials 1 to 5 open as usual.
6. The title ignores taps for 0.7 s after a trial sends the child back, so a double tap on "Title" cannot start trial 1.
7. No soft-lock: from every state of trial 5 (looking, pointing, lit, the end screen) the child can reach a point at the
   flickering part, a wrong card, a lit lantern, the next round, a second lit lantern, the end screen and the title,
   with the screen's own buttons and parts; and without the clock and without the "Title" button the lantern can still
   be lit and the next round reached.
8. Why the score does not teach "tap fast" or "try every card": a right card is worth 100 to 300 depending on the
   streak, and a wrong one ends the streak. A child who tries the cards in turn lights every lantern too, but scores
   less than one who compares with the wish: in the first eight rounds of seed 0, 1,000 (the left card first) or 1,050
   (the right card first) against 1,900 for eight right cards (`design.md`, Decisions).

### REQ-8.10 Trials stay apart

1. Entering trial 5 starts no run of another trial and leaves `lane`, `shed`, `field`, `shadows` and the other trials'
   `run` state as they were on the title. `lantern` is the initial value whenever `trial` is not 5.
2. The scene shown follows `trial`: 1 is the lane, 2 is the shed, 3 is the field, 4 is the shadows, 5 is the lantern. A
   state with `trial` 5 never shows another trial's scene.
3. In trial 5 the events of trials 1 to 4 (`Ask`, `PickCard`, `Retry`, `PickTool`, `GiveTool`, `RetryShed`,
   `LeaveShed`, `InspectStar`, `SortStar`, `KeepStars`, `RetryField`, `LeaveField`, `DecideItem`, `NextItem`,
   `LeaveShadows`) return the same state. Outside a run of trial 5 the lantern's events (`TapPart`, `FixPart`,
   `NextLantern`) return the same state, the end screen included. `LeaveLantern` is accepted in trial 5 only (a run or
   its end screen), and `StartLantern` from the title and from trial 5's own end screen only.
4. `Start` in a run of trial 5 sets the language only; on trial 5's end screen it begins trial 1 and drops trial 5's
   state. `SetLang` changes the language only and never changes a part, a card or the result. `MoveHeroTo` moves the
   hero only.
5. What is stored is what the child did: the wish, the flickering part and the lantern the wisp brought are derived
   from the seed and the round and never stored, and whether the lantern is lit follows from its parts.
6. The behaviour, texts, layout and tests of trials 1 to 4 are unchanged by this spec, except the title's name, card
   and art positions and the pinned numbers that follow from them (see "Changes to a shared entrance or event").

### REQ-8.11 Portrait, one finger, mouse

1. Trial 5 plays on the existing 390 x 844 portrait canvas.
2. Every action is one tap or click on an object of at least 80 x 80 game pixels: the title's trial 5 button, each
   part of the wisp's lantern, each card, "Next", the "Title" button and the two buttons of the end screen. There is no
   drag, hold, double tap or second finger.
3. The hero's floor drag still moves the hero in trial 5. A press that starts on a part or a button does not move the
   hero; a press on the floor does.
4. Texts and pictures do not overlap each other or hide the wish, the lantern, the message or a button, in every stage
   (looking, pointing, lit), with the top row and the "Title" button, in both languages, with each part's and each
   look's word inserted. The buttons end above the hero's start place.
5. A new set of buttons ignores presses for a moment (450 ms) after it appears, so a quick double tap never presses a
   card or "Next" by accident.

### REQ-8.12 Drawn in code, no network, no color, no sound

1. The lanterns, their parts, the frames, the glow, the badge and the cards' pictures are drawn in code at the device
   pixel ratio, with the existing look (REQ-4.9 to REQ-4.11). No image file is added and no third-party art is used
   (hard rule 5).
2. Trial 5 needs no network request after the page and its bundled font have loaded, in Japanese and in English (hard
   rule 4). A full play of point, fix, next, time up and the way back works with the network switched off.
3. Motion never carries the only meaning, never flashes faster than 3 times a second, and can be ignored without losing
   information. Every state is told in a still picture: the frame of dots, the solid frame, the tick badge and the
   bright light.
4. The nine looks are told apart by silhouette and a word, not by color: on a screen with all color removed they are
   still different shapes with different names, and the frames, the badge and the light still read.
5. The game plays no sound, and nothing needs one: the smoke checks that nothing is played.

### REQ-8.13 Japanese and English, and text in content

1. The guide, the labels of the two panels, the messages, the part words, the look words, the button labels and the
   title's label and caption are all in `src/content/strings.ja.json` and `strings.en.json`, under the same keys. No
   child-facing literal appears in `src/game/` or `src/domain/`.
2. Japanese follows hard rule 2 through `npm run kid`: hiragana and katakana only, at most 12 characters a line and 2
   lines, also after a part's or a look's word is inserted. English messages are at most 2 short lines.
3. A message that takes a word takes exactly one and keeps no unreplaced placeholder.
4. The language is the existing one (`?lang=ja|en`, else the browser language, else English). `SetLang` can change it
   at any time; the words change and nothing else changes.
5. `npm run kid` and `npm run font` pass after the strings change; the subset font covers every character.

### REQ-8.14 Pure rules, checked several ways

1. The parts and their looks, the wishes, the flickering part, the point, the fix, whether the lantern is lit, the
   score, the next round, the clock and the leave are rules of the pure reducer (ADR 0001). `src/domain` uses no Phaser,
   DOM, clock or randomness, and the result depends on no language or animation timing. The seed is an event field:
   the same seed and the same events always give the same states.
2. Each of INV-54 to INV-62, and INV-15 to INV-17 for trial 5 (below), has a property test over the real reducer with
   `checkProperty`, and the generators point at every part, pick every card (right and wrong, and looks of other
   parts), go next before and after the lantern is lit, use events of the other trials, run out the clock, play again,
   leave, and go round many lanterns. INV-3 and INV-4 also run over sequences that contain the new events.
3. Unit tests cover: the parts and looks, the pinned wishes, flickering parts and lanterns of several seeds, that no
   wish repeats and the flickering part moves for 100 seeds, a point at the flickering and at a steady part, both cards,
   a card of another part, a fix outside the pointing stage, "Next" before and after the lantern is lit, the score of a
   right and a wrong card and the streak (100, 150, 200, 250, 300), the clock, time up in every stage, play again from
   the end screen with the best kept, the leave in every stage and from the end screen and nowhere else, and the entry
   from the title. For content and view: ja/en same keys, placeholders, lengths, no blame, fear or claims, the cards
   only while pointing, "Next" only when lit, the frames, the badge and the light per stage, the end screen's two
   buttons for trial 5, and the message follows the stage.
4. A model check over the real reducer (`lantern.model.test.ts`) covers the entrance from the title with two seeds and
   trial 5 after it, with a finite alphabet that includes every point, every card, invalid events of the other trials,
   a short and a run-ending `Tick`, `Start` and language changes. It checks that the state always agrees with an
   independent record of what the child did (the look the child said is the look of the part), that the lantern
   differs from the wish in exactly the flickering part until it is lit, that it is lit only after a right card, that
   the clock agrees with the phase, and that the score moves only on a right card by the points for the streak; from
   every reachable state a point, a wrong card, a lit lantern, the next round, a second lit lantern, the end screen and
   the title are reachable (and the lit lantern, the next round and a second lit lantern without the clock and the
   "Title" button). It records the number of states and the counterexamples of deliberate breaks, and drops no state to
   pass.
5. Mutation testing finds no surviving mutant in the unit-tested code.

### REQ-8.15 The real taps and the real screen

1. The mobile smoke enters trial 5 from the title with a real tap (not `dispatch`) and plays: a tap on a steady part (a
   message, nothing changes); a tap on the flickering part (a solid frame, two cards); a wrong card (no score, streak
   ended, the part changed and still framed with dots); the right card (scores, the lantern lit, a tick badge, a bright
   light, the part changed); "Next" bringing the next lantern with the flicker on another part; time up showing the end
   screen; "play again" starting the next run with the best kept; "Title" returning to the title from a run and from the
   end screen, with a quick second tap not starting trial 1. `window.__game` is used to read the state, never to do
   what a tap can do. `dispatch` is used only for `Tick`, which has no button.
2. The smoke checks the screen, not only the state: the frames (dots or solid), the tick badge, the light, the cards,
   "Next", the clock, the score and the message are seen in the pixels. A state that says "lit" with a dim light fails.
3. Japanese and English screens for the start, a point, a wrong card, a lit lantern and the end screen, and the title in
   both languages, are looked at in screenshots. The desktop smoke plays the lantern with the mouse and checks that a
   held press on a part does not move the hero. Offline after the first load, in both languages, the whole path still
   works.
4. Trial 5 is played on the real clock, so each smoke test plays well under half of a run; a test that has to go past
   the clock ends the run with `Tick`, as the other trials' do. The smoke of trials 1 to 4, including the score attack,
   still passes. The title's trial 5 button starts none of them, and a tap elsewhere on the title still starts trial 1.

### REQ-8.16 No gate gets weaker, and what is verified is said

1. No threshold, config, check script, workflow or existing test is loosened, deleted or relaxed to pass. Where this
   spec forces an old expectation to change, `tasks.md` names the old test and the new one, and why trials 1 to 4 are
   not weaker.
2. `npm run check` passes in every task. Tasks that connect input to the screen also pass `npm run build` followed by
   `npm run smoke`.
3. The smoke targets mobile WebKit and desktop Chromium. Where WebKit cannot start in the authoring sandbox, the result
   says that the mobile smoke ran on Chromium with the iPhone 13 touch profile, and CI's WebKit run is what counts. The
   work is not called done before CI's smoke is green. A Playwright run is never called a check on a real phone. A test,
   hook or agent that was not run is not reported as run, and a Result line states only what was measured.

## Invariants

Rules from `.kiro/steering/domain-invariants.md` apply: ids are never reused or renumbered, each new invariant gets a
property test in the same pull request, and only rules a child depends on are listed. Ids 6, 7, 25 and 37 are retired;
1 to 5, 8 to 24, 26 to 36, 38 to 53 are in use at the start of this spec. This spec adds 54 to 62.

| id | invariant | child depends on |
|---|---|---|
| INV-54 | The round of a lantern is `wishAt(seed, round)`, `faultAt(seed, round)` and `broughtAt(seed, round)`: the brought lantern differs from the wish in exactly the fault part. The seed holds for the whole run, the round grows only by 1 and only by `NextLantern` after the lantern is lit, no wish repeats the one before it, and the fault part is never the same two rounds in a row. | what comes next is fair and the same for the same seed; the flicker moves, so looking pays |
| INV-55 | Until the lantern is lit it differs from the wish in exactly one part, the round's fault part, and that is the part that flickers; the two steady parts keep the wish's looks for the whole round. | only the flickering part is ever different; the rest stays right |
| INV-56 | `TapPart` only points: on the flickering part it opens that part's cards, on a steady part it closes any cards and notes that the part is fine. It never changes a look, the round, the seed or the run, and once the lantern is lit it returns the same state. | pointing is free and changes nothing |
| INV-57 | A fix is `FixPart` with one of the two cards while a part is pointed at: the pointed part takes exactly the look sent, and nothing else changes in the lantern. The cards are the looks of that part that it does not have. A right card (the wish's look) lights the lantern; a wrong card goes back to looking with the part still flickering. Any other `FixPart` returns the same state. | the wisp does exactly what I said, to exactly the part I pointed at, and never starts over |
| INV-58 | A fix scores once: a right card adds the points for the streak and extends the streak, a wrong card ends the streak and adds nothing. No other event moves the score or the streak, but a new run or the way back to the title. | comparing with the wish pays; trying every card does not |
| INV-59 | Once the lantern is lit, every event except `NextLantern` (and the `StartLantern` and `LeaveLantern` that end the run) leaves `lantern` equal. `NextLantern` before the lantern is lit returns the same state; after it starts the next round (round + 1, looking at the brought lantern of that round, no note, the same seed) and changes nothing else. The clock may run out, which changes the phase and not `lantern`. | the lit lantern stays until I move on, and "Next" is the only way on |
| INV-60 | `TapPart`, `FixPart` and `NextLantern` return the same state outside a run of trial 5 (the end screen included); in a run they change only `lantern` (`FixPart` also scores, so it changes `run` too). `lantern` is the initial value whenever `trial` is not 5. In trial 5 the events of trials 1 to 4 return the same state, so the lane, the shed, the field and the shadows stay initial. | the other trials cannot be broken from here, and trial 5 cannot be broken from them |
| INV-61 | `LeaveLantern` from a run or the end screen of trial 5 returns to the title (`phase` `title`, `trial` 0, `lantern` initial, the run restarted with only `best` kept) and changes nothing else. Anywhere else it returns the same state. | I can go back from anywhere; I cannot fall out of another trial |
| INV-62 | `StartLantern` from the title or the end screen of trial 5 begins a run: `phase` `trial`, `trial` 5, round 0 of the seed, a full clock, a score of 0, `best` kept. Anywhere else it returns the same state. | a new run is a fresh start and the best stays |
| INV-15 to INV-17 | (widened) the clock only runs down inside a run, between 0 and 60 seconds, and a new run or the way back sets it to 60; the score only goes up on a right card (for trial 5); a run is over exactly when the clock is at zero, and the end screen takes only the events listed in `domain-invariants.md` | the 60 seconds are fair |

`.kiro/steering/domain-invariants.md` has the rows and the note on this scope. INV-1 to INV-5, INV-8 to INV-14,
INV-18 to INV-24, INV-26 to INV-36, INV-38 to INV-53 keep their text and their tests.

## Verification summary

| layer | what | requirement |
|---|---|---|
| unit (`lantern.test.ts`, `reducer.test.ts`) | the rules and the events of trial 5, the pinned seeds, the clock, the score (and that trying every card scores less) and the leave | REQ-8.3 to 8.10 |
| property (`lantern.pbt.test.ts`) | INV-1 to INV-4 with the new events, INV-54 to INV-62, and INV-15 to INV-17 for trial 5 | REQ-8.9, 8.10, 8.14 |
| model (`lantern.model.test.ts`) | states, invariants, goals, the deliberate breaks | REQ-8.4, 8.5, 8.9, 8.14 |
| content (`lantern-content.test.ts`) | keys, placeholders, Japanese rules, lengths, no blame, fear or claims, the title caption | REQ-8.1.6, 8.7, 8.13 |
| view and layout (`lantern-view.test.ts`, `lantern-layout.test.ts`, `title-view.test.ts`, `over-view.test.ts`, `route.test.ts`, `field-layout.test.ts`) | what each stage shows, no overlap, targets of 80 or more, the title's card and four buttons, scene choice | REQ-8.1 to 8.11 |
| mutation (`npm run mutation`) | no surviving mutant | REQ-8.14, 8.16 |
| mobile and desktop smoke | real taps, pixels, silence, screenshots, offline | REQ-8.1 to 8.15 |
