# Requirements: Trial 3, The Wisp Field ("check it")

Spec `06-trial-verify-stars`, **revision 2**. Teaches learning goal L3 (`docs/learning-design.md`): a helper
can make an honest mistake, so look closely at what it brings and decide for yourself before you accept it.
Requirement ids are `REQ-6.n`. `REQ-5.n` belongs to `05-trial-grant-tools`, `REQ-4.n` to `04-score-attack`,
`REQ-3.n` to `03-trial-tell-vague-request`, `REQ-2.n` to `02-trial-tell` and `REQ-1.n` to the missing
`01-core-loop`; none is reused.

This adds a third trial on top of the existing base. It does not rebuild trials 1 or 2: the lane keeps its
one-request flow, clock, score and end screen, and the shed keeps its tools, results and retry.

## Revision 2: what was wrong, and what changed

The first build of this spec (pull request #70; its code was never merged) was played three times in the preview. The CI was
green each time, and the trial still did not teach:

| found in the preview | cause in revision 1 | now |
|---|---|---|
| Tapping a star showed what it was; nothing was decided | `REQ-6.3`: a tap was the check, and the check was the answer | A tap only looks (REQ-6.3.1). The child decides "real" or "fake" (REQ-6.3.2). The decision changes the result (REQ-6.3.3 to 6.3.5) |
| The clue came after the tap | `REQ-6.2.3`: five identical stars, "looking is not checking" | The clue is on every star from the start (REQ-6.2.2, REQ-6.4.5) |
| Nothing ended; the field looped for ever | `REQ-6.7`: any number of rounds, no exit | A run of two rounds ends in a cleared trial, with a way back to the title (REQ-6.7) |
| The title's "60 seconds" read as true of every trial | one intro line for the whole title | Trial 1's way in and rule sit in their own card; the other two buttons say they have no timer (REQ-6.1.6) |

Requirements changed in place (ids are kept; the text under them is new): REQ-6.1 (a seed, and 6.1.6),
REQ-6.2 to REQ-6.7 (the play), REQ-6.8 (the leave), REQ-6.9 (the verdict buttons), REQ-6.10 (no color, no
sound), REQ-6.11 to REQ-6.14. The old text is in the history of this file (commit `9a69287`). Invariants:
25 is retired, 26 to 32 keep their numbers with new wording, 33 to 39 are new (see "Invariants").

## Why

`docs/learning-design.md` lists trial 3 as "1–2 of the 5 stars the helper brings are wisps; tap to check
before accepting. Wisps = fakes that shine brighter than the real thing." The child sees five stars the
wisp has collected. The fake ones shine brighter and have a dotted rim, a difference anyone can see if they
look. The child taps a star to look at it closely, decides whether it is real or fake, and only then does
the game say whether they were right. A wrong decision is no disaster: the star stays where it was and the
child looks again. When all five are sorted the child keeps the real ones, and after two rounds the trial is
cleared. The wisp did not mean to bring a fake: it mixed it up. The child learns to look closely and
decide before accepting, and that the helper can be wrong without being a liar.

The table calls the fakes "wisps" (marsh lights). The helper in this game is also "the wisp", and a
6-year-old would read "a wisp is a fake" as "the wisp is fake". The child-facing words therefore say
**fake star** (`にせものの ほし`), never "wisp". See `design.md`, Decisions.

## Scope

In: trial 3 only, from a tap on the title to the cleared trial, the replay, and the way back to the title.
Touches `src/domain`, `src/game`, `src/content`, their tests, `e2e/`, this spec, the steering invariants
file, and the smallest notes that keep other documents true. The title's words change (REQ-6.1.6).

Out: trials 4 to 6, the parent screen, judge features (no `?trial=n` jump or judge-only entrance), a
trial-select screen or a general router, network use or measurement, saving, a service worker, sound, a shared
framework for future trials, new dependencies. No change to `vite.config.ts`, `stryker.config.json`,
`package.json`, `scripts/check-*` or `.github/`. L4 content is not added here. Verifying with a real tool
(running a test, reading a source) is not shown: the game's clue is a staging device (see REQ-6.6.4).

## Relation to earlier specs

Earlier specs say "trial 1 only" or "trials 3 to 6 are out" (05). Those sentences were true of their
scope, not a ban on a third trial. Nothing is silently replaced. The earlier specs keep their text; spec
05 gains one pointer note at the top of its requirements (and its `jp/` copy), as 02 and 04 did for 05.

### Inherited (applies to trial 3 as it is)

| old | what | now |
|---|---|---|
| REQ-2.9 | Japanese and English, `?lang=`, then the browser language; a language change never changes progress | REQ-6.11 |
| REQ-2.10 and hard rule 7 | meaning is never carried by color alone | REQ-6.2.2, 6.4.5, 6.10.3 |
| REQ-2.11 | 390 x 844 portrait, one finger or a mouse, targets of 80 x 80 or more, the hero's floor drag | REQ-6.9 |
| REQ-2.12 and hard rule 4 | no network after the first load, art drawn in code, bundled font | REQ-6.10 |
| REQ-2.13, REQ-3.6 | text lives in `src/content`; Japanese rules for the kid text; placeholders replaced | REQ-6.11 |
| REQ-2.15, REQ-3.9, REQ-5.15, ADR 0003 | no gate gets weaker | REQ-6.14 |
| REQ-4.9 to REQ-4.11 | sharp rendering, characters drawn in code, motion that never carries the only meaning | REQ-6.10 |
| REQ-5.4.3, REQ-5.6.1 (the tone) | kind words; nothing red, no cross, no shake, no sound; the fact is not hidden | REQ-6.4 |
| ADR 0001, hard rule 3 | the domain is pure; time and randomness reach it only through events | REQ-6.1.2, REQ-6.12.1 |

### Trials 1 and 2 only (kept as written; trial 3 does not use them)

| old | what | in trial 3 |
|---|---|---|
| REQ-2.1 to REQ-3.5, REQ-4.1 to REQ-4.8 | cards, asking the wisp, the 60-second run, clock, score, end screen | not used. The field has its own flow (REQ-6.2 to 6.7) and no clock or score |
| REQ-5.2 to REQ-5.8 | tools, the hand-over, the door | not used |
| INV-5, INV-8 to INV-17 | trial 1's lane and run | still hold for every sequence, including the field events; INV-32 says the field cannot touch the lane or the run |
| INV-18 to INV-24 | trial 2's shed | unchanged; INV-31 and INV-32 say the field and the shed cannot touch each other |

### Changes to a shared entrance or event

Each row names the old requirement, what the code does today, and the new requirement. The old text is
not edited.

| old requirement | the code today | change | new |
|---|---|---|---|
| REQ-5.1.1 "one extra tap target" on the title; REQ-5.1.3 | the title has the shed button at (195, 736); the scene starts trial 1 on a press that hit no object | one more button, for trial 3, above the shed button. The shed button does not move. A press on either button starts nothing else | REQ-6.1.1, 6.1.3 |
| title art positions (REQ-2.1, 04) | the title's wisp is at (285, 590) and the hero at (110, 600) | both move up by 52 game pixels (to (285, 538) and (110, 548)) so that the new button fits between the art and the shed button. `titleArtBottom` in `shed-layout.ts` becomes 606. No test pinned the old value | REQ-6.1.1 |
| title texts (REQ-4.1: "the 60-second goal" under the tap prompt) | the prompt and the 60-second line float above the art and read as the title's rule | they move into one card for trial 1; the field and shed buttons get a caption "no timer". The strings `start` and `run.intro` are unchanged; `noClock` is new | REQ-6.1.6 |
| `sceneFor` (REQ-5.9.2) | `trial` 2 is the shed, anything else in a trial is the lane | `trial` 3 is the field | REQ-6.8.2 |
| `GameEvent` | has `StartShed`, the shed events | gains `StartField` (with a seed), `InspectStar`, `SortStar`, `KeepStars`, `RetryField`, `LeaveField` | REQ-6.8.3 |
| `TitleScene` | a tap anywhere starts trial 1 | after the field sends the child back, taps are ignored for 0.7 s so a double tap cannot start trial 1 | REQ-6.7.5 |
| `Ask`, `PickCard`, `Retry`, `Tick`, `PickTool`, `GiveTool`, `RetryShed` | applied only in their own trial (the guards from 05) | no code change: they already return the same state in trial 3. INV-32 now says so for the field | REQ-6.8.3, INV-32 |
| `Start` while a trial runs | sets the language only | unchanged, and now also true in trial 3 | REQ-6.8.4 |
| REQ-5.6.4 / REQ-4.6.2 (no soft-lock, no exit) | the shed has no way back to the title | the field has one, from the cleared trial only | REQ-6.7.4 |
| INV-1, INV-2 | `phase` and `trial` bounds | unchanged and global; `trial` may now be 3 | INV-1, INV-2 |
| INV-23 | `shed` is initial whenever `trial` is not 2 | unchanged; true in trial 3 | INV-31 |
| `e2e/helpers.ts` `GameState` type | has `shed` | gains the `field` field | REQ-6.13 |

## Glossary

- **Field**: the dark meadow of the picture, where the wisp has put down the stars it collected.
- **Star**: one of the five picture objects in the field. Each is real or fake. Stars are numbered 0 to 4,
  top row left to right, then the bottom row.
- **Round**: one play of the field, from a fresh set of five stars to the kept result. The rounds come
  from the seed, four of them in order, and then they start again.
- **Run**: two rounds in a row. Keeping the second one clears the trial.
- **Seed**: a whole number the game draws when the field opens (not the domain). The same seed always
  gives the same fake stars in the same rounds.
- **Fake star**: a star that is not real. A round has 1 or 2 of them. It is the wisp's honest mistake.
- **Clue**: how a fake star differs from a real one, visible from the start: it shines brighter (a larger,
  stronger, whiter halo) and its rim is a ring of separate dots where a real star's rim is one unbroken line.
- **Lens**: the place under the message where the star being looked at is shown larger, with the same clue.
- **Look**: the child taps a star and it goes into the lens. Looking sorts nothing.
- **Verdict**: the child's decision about the star in the lens: "real" or "fake", by one of two buttons.
- **Sort**: a star is sorted when the child's verdict on it was right. A wrong verdict sorts nothing.
- **Note**: the last verdict and the star it was about; the message says what happened to it.
- **Keep**: the child taps the button to accept the real stars. It is the only way a star is accepted.
- **Cleared**: the keep of the last round of a run. The screen shows the clear word and the closing line.
- **Closing line**: a short sentence, shown on the cleared trial only, that looks back at what the child
  did: they looked closely and kept only the real ones.

## Requirements

### REQ-6.1 Enter the field with a tap

As a 6-year-old, I want to open the wisp's star field from the title with my finger, so that I can play
it without a grown-up.

1. The title screen shows a second extra tap target, for trial 3: a button with a picture of a star and a
   short label in the child's language, at least 80 x 80 game pixels. It sits above the shed button, clear
   of the shed button and of the title's wisp and hero.
2. Tapping the button opens the field. The state moves from `title` to `trial` with `trial` 3. No run
   starts: the clock stays 60 seconds and is not counted down, the score is 0, the lane and the shed
   are untouched. The game draws a new seed (outside the domain) and sends it with the event; the domain
   draws nothing. The field starts at round 0 for that seed.
3. A tap on this button never also starts trial 1 or opens the shed, and a tap on the shed button never
   opens the field. A tap on the title anywhere else starts trial 1 as before, and the end screen's
   play-again button still starts a new run (REQ-4.6).
4. The entrance is an ordinary tap on the ordinary screen. It is not a judge URL, a hidden gesture, a
   console call, or a query parameter.
5. There is no trial-select screen and no general router. The only new screen is the field.
6. Every sentence on the title matches the trial it sits with. Trial 1's way in ("tap to start") and its
   rule ("how many in 60 seconds") are in one card and nowhere else; neither button's trial has a timer, so
   each button carries a caption that says so (`じかんは ないよ` / `No timer`). The 60 seconds appear in no
   text that belongs to the shed or the field, and no text outside the card mentions seconds.

### REQ-6.2 What the field shows

1. The field screen shows a guide text, five stars in two rows (three above, two below), the lens, the wisp,
   and a message. Buttons appear only when they can be used (REQ-6.3.2, REQ-6.5.1, REQ-6.7).
2. Before any tap, on the first screen of every round, every star already shows its clue: a fake star shines
   brighter than a real one (a larger, stronger, whiter halo) and its rim is a ring of separate dots, where a
   real star has a calmer halo and an unbroken rim. The shine is the main difference; the rim and the dots
   are a second difference of shape, so the clue does not depend on color, and a grayscale screen shows it.
   Nothing about the clue needs sound: the game makes none.
3. The clue is the same in every stage: before a tap, while a star is in the lens, after a wrong verdict, and
   once other stars are sorted. A star's clue never changes while the round lasts, and it is never hidden.
4. The guide is one short sentence in two lines at most. It says to look closely, tell real from fake, and
   keep only the real ones, and it stays on screen in every stage.
5. The wisp is on screen in every stage, with its usual friendly face. It is never drawn angry, sly,
   scared or hurt. It is not a tap target in this trial.

### REQ-6.3 Look, then decide

As a 6-year-old, I want to look at a star closely and say what I think it is, so that I find out whether I
was right.

1. Tapping an unsorted star puts it in the lens, larger, with the same clue, and frames it in its slot. It
   shows nothing about whether the star is real: looking is not deciding. The other stars do not change.
   Tapping another unsorted star moves the lens to it. Tapping a sorted star, or the star already in the lens,
   changes nothing.
2. While a star is in the lens, two buttons appear, "real" and "fake", each with a picture (a tick, and a ring
   of dots) as well as its word. They appear in no other state. A verdict can be given only to the star in the
   lens, so a star is never judged without being looked at.
3. A right verdict sorts the star: a real star gets a tick, a frame and the word "real"; a fake star fades
   and gets the word "fake". The lens closes and the message confirms it. Only that star changes.
4. A wrong verdict sorts nothing. The star stays as it was, the lens closes, and the message says what
   happened, kindly (REQ-6.4.2): that a fake got mixed in, or that the star was real, and to look again.
   Nothing is red, no cross is shown, nothing shakes and there is no sound. The star may wobble once. The game
   never corrects the child: it does not sort the star, and does not say which verdict to give.
5. The child can look at the same star again and decide again, as often as they like, at no cost. Nothing is
   counted: there is no score, no number of tries, no streak.
6. Stars can be sorted in any order. The result for a star does not depend on the order.
7. The result of a verdict is decided at once by the reducer. It never waits for an animation or a timer.
   A short flourish may play, and may be ignored without losing information.

### REQ-6.4 A fake star is the wisp's honest mistake

1. Every round has 1 or 2 fake stars among the five: never none, never all. The first round of a run has one,
   the second has two. Which stars are fake comes from the seed and the round number only (a fixed rule, no
   other randomness) and does not change while the round lasts.
2. When a fake star is sorted, the message says it is a fake and that the wisp mixed it up. The words are
   plain and kind: no "lie", "trick", "cheat", "bad", "naughty", "enemy", "wrong", no blame for the child and
   none for the wisp, and no word that makes a wrong verdict a mistake, an error or a failure of the child.
   The fact that the star is fake is not hidden.
3. A real star's message says it is real, kindly and briefly.
4. The words never say or suggest that the helper is always wrong, always right, knows everything, is a
   friend or family, or does it on purpose (`docs/learning-design.md`, "What we do not teach").
5. A real and a fake star differ before any tap by their shine and their rim (REQ-6.2.2), and after sorting
   also by their word and the tick. Neither the clue nor the sorted look is carried by color alone.

### REQ-6.5 Keep only what was sorted

1. A button to keep the real stars appears only when all five stars are sorted. Before that, no keep
   button is on screen, and a `KeepStars` event that reaches the reducer changes nothing.
2. The keep accepts exactly the real stars. A fake star is never kept and an unsorted star is never
   kept. Nothing else keeps a star.
3. After the keep the real stars stay on screen with their tick, and the fake stars stay faded (not
   removed, so the child can still see what was found). The message names the number of real stars
   kept (3 or 4).
4. The kept result stays on screen until the child taps its button. Nothing times out, and nothing
   removes the result or the closing line by itself. The keep cannot be undone, and no star can be
   looked at, sorted or kept again in the same round.

### REQ-6.6 The closing line looks back

1. The cleared trial shows a closing line, a separate text, that looks back at the child's action: they
   looked closely and kept only the real ones. The wording is in `design.md` after the kid-reader rubric.
2. It is shown only on the cleared trial, not while sorting and not after the first round. It is not joined to
   the message. The result, the stars and the buttons stay visible, and no text gets smaller to make room.
3. It says only what happened in this field. It does not say that a real AI always makes mistakes, never
   makes them, that checking always works, that AI knows everything, or that it is a friend or family
   (`docs/learning-design.md`, "What we do not teach").
4. Why the clue is visible and the verdict is judged at one tap (a staging device so that the child can feel
   "look closely before you accept", not a claim that checking real AI work is as easy) is written in
   `design.md`.

### REQ-6.7 The trial ends, and the way back

1. After the keep of the first round of a run, the button plays the second round: nothing sorted, nothing
   in the lens, and two fake stars. After the keep of the second round, the trial is cleared: the screen
   shows the clear word ("Cleared!" / `クリア！`), the number of real stars kept, the closing line, and two
   buttons, "play again" and "title".
2. "Play again" starts a new run: the next round of the seed (rounds 2 and 3, then 0 and 1 again), with
   nothing sorted. It costs nothing and uses nothing up.
3. The field has no 60-second clock, no score, no streak and no time up. A `Tick` changes nothing in the field.
4. "Title" returns to the title: `phase` `title`, `trial` 0, the field initial again. Nothing else changes, and
   from there trials 1, 2 and 3 open as usual. It is offered on the cleared trial only (a page reload also
   returns to the title at any time). From every state of the field the child can reach the cleared trial
   and the title (no soft-lock).
5. The title ignores taps for 0.7 s after the field sends the child back, so a double tap on "title" cannot
   start trial 1. After that a tap elsewhere starts trial 1 as before.

### REQ-6.8 Trials stay apart

1. Entering the field starts no run and leaves `lane`, `run` and `shed` as they were on the title.
2. The scene shown follows `trial`: 1 is the lane, 2 is the shed, 3 is the field. A state with `trial` 3
   never shows the lane or the shed.
3. In trial 3 the trial 1 events (`Ask`, `PickCard`, `Retry`, `Tick`) and the shed events (`PickTool`,
   `GiveTool`, `RetryShed`) return the same state. Outside trial 3, the field events (`InspectStar`,
   `SortStar`, `KeepStars`, `RetryField`, `LeaveField`) return the same state. `StartField` is accepted from
   the title only.
4. `Start` in the field sets the language only. `SetLang` changes the language only and never changes a
   mark or the result. `MoveHeroTo` moves the hero only.
5. What the child has sorted and the kept result are one value, not two copies: the truth of each star
   is derived from the seed and the round and never stored, and the kept stars are the real stars of the round.
6. The behaviour, texts, layout and tests of trials 1 and 2 are unchanged by this spec, except the
   title art's position and the title's texts (see "Changes to a shared entrance or event").

### REQ-6.9 Portrait, one finger, mouse

1. The field plays on the existing 390 x 844 portrait canvas.
2. Every action is one tap or click on an object of at least 80 x 80 game pixels: the title's field
   button, each star, the two verdict buttons, the keep button and the two buttons of the cleared trial.
   There is no drag, hold, double tap or second finger.
3. The hero's floor drag still moves the hero in the field. A press that starts on a star or a button does
   not move the hero; a press on the floor does.
4. Texts and pictures do not overlap each other or hide a star, the lens, the message or a button, in every
   stage (nothing sorted, a star in the lens, after a wrong verdict, all sorted, kept, cleared), in both
   languages, with the number inserted. The buttons end above the hero's start place.
5. A new set of buttons ignores presses for a moment (450 ms) after it appears, so a quick double tap on one
   button never also presses the button that takes its place (keep, then "next stars"; keep, then "play again"
   or "title"; a verdict, then "keep").

### REQ-6.10 Drawn in code, no network, no color, no sound

1. The stars, their marks, the lens and the field are drawn in code at the device pixel ratio, with the
   existing look (REQ-4.9 to REQ-4.11). No image file is added and no third-party art is used (hard rule 5).
2. The field needs no network request after the page and its bundled font have loaded, in Japanese and in
   English (hard rule 4). A full play of look, verdict, keep, the clear and the way back works with the
   network switched off.
3. Motion never carries the only meaning, never flashes faster than 3 times a second, and can be ignored
   without losing information. The clue and every state of a star are told in a still picture.
4. The clue works without color: on a screen with all color removed, a fake star is still brighter than a
   real one by a margin the smoke measures, and its rim still has gaps where a real star's has none.
5. The game plays no sound, and the clue needs none: the smoke checks that nothing is played.

### REQ-6.11 Japanese and English, and text in content

1. The guide, the messages, the star labels, the verdict and button labels, the title's field label and
   no-timer caption, the clear word and the closing line are all in `src/content/strings.ja.json` and
   `strings.en.json`, under the same keys. No child-facing literal appears in `src/game/` or `src/domain/`.
2. Japanese follows hard rule 2 through `npm run kid`: no kanji, no Latin letters, at most 12 characters a
   line and 2 lines, also after the number is inserted. English messages are at most 2 short lines.
3. A message that takes the number takes exactly one and keeps no unreplaced placeholder.
4. The language is the existing one (`?lang=ja|en`, else the browser language, else English). `SetLang`
   can change it at any time; the words change and nothing else changes.
5. `npm run kid` and `npm run font` pass after the strings change; the subset font covers every character.

### REQ-6.12 Pure rules, checked several ways

1. Look, verdict, keep, the next round and the leave are rules of the pure reducer (ADR 0001). `src/domain` uses
   no Phaser, DOM, clock or randomness, and the result depends on no language or animation timing. The seed is
   an event field: the same seed and the same events always give the same states.
2. Each of INV-26 to INV-39 (below) has a property test over the real reducer with `checkProperty`, and the
   generators look at every star, give right and wrong verdicts, use an index that does not exist, keep too
   early, keep when complete, clear, leave, retry before and after the keep, and go round the whole table. INV-3
   and INV-4 also run over sequences that contain the new events.
3. Unit tests cover: nothing sorted, a look, a right and a wrong verdict for a real and a fake star, a verdict
   with no star in the lens, every star in a round, a look at a sorted star, an index out of range, a keep with a
   star unsorted, a keep when all are sorted, the kept stars are the real ones, the lock after the keep, the
   clear after the second round, the leave from the cleared trial and nowhere else, a retry before and after
   the keep, the pinned fake stars of several seeds (1 or 2 each, neighbouring rounds differ in size), and the
   entry from the title. For content and view: ja/en same keys, placeholders, lengths, no blame or claims, the
   closing line only on the cleared trial, the buttons only when they can be used, the message follows the last
   verdict, and a fake star is brighter than a real one with a different rim in a measure that survives
   grayscale.
4. A model check over the real reducer (`field.model.test.ts`) covers the entrance from the title with two
   seeds and the field after it, with a finite alphabet that includes invalid trial 1 and trial 2 events,
   out-of-range stars, both verdicts at any time, `Tick`, `Start` and language changes. It checks that the field
   always equals an independent record of what the child did, a fake star is never kept, a keep needs five
   sorted stars, a wrong verdict never sorts, the leave is possible only from the cleared trial; from every
   reachable state the cleared trial, a fresh round, the title and a second clear are reachable. It records
   the number of states and the counterexamples of deliberate breaks, and drops no state to pass.
5. Mutation testing finds no surviving mutant in the unit-tested code.

### REQ-6.13 The real taps and the real screen

1. The mobile smoke enters the field from the title with a real tap (not `dispatch`) and plays: the clue on
   every star before any tap; a real star looked at, with the lens and both verdict buttons; a wrong verdict
   for a real star and for a fake star, each leaving the star unsorted and the message changed; the right
   verdicts sorting them; a keep sent too early changing nothing; all five sorted, the keep button; the keep;
   the second round with two fake stars; the clear panel, its closing line and its two buttons; "title"
   returning to the title, with a quick second tap not starting trial 1; and "play again" starting the
   next run. `window.__game` is used to read the state, never to do what a tap can do. `dispatch` is used
   only for `Tick` and `SetLang`, which have no button, and for a `KeepStars` sent too early, which no button
   offers.
2. The smoke checks the screen, not only the state: for each star the halo's brightness and the gaps in its
   rim are measured from the pixels and must match the round's fake stars before any tap, in the lens, and
   in grayscale; the ticks, the buttons, the clear panel and the closing line are seen in the pixels. A
   state that says "fake" with a calm star fails.
3. Japanese and English screens for the start, a star in the lens, a wrong verdict, all sorted, the
   kept result and the cleared trial, and the title in both languages, are looked at in screenshots. The
   desktop smoke plays the field with the mouse and checks that a held press on a star does not move the
   hero. Offline after the first load, in both languages, the whole path still works.
4. The smoke of trials 1 and 2, including the score attack, still passes. The title's field button starts
   neither of them, and a tap elsewhere on the title still starts trial 1.

### REQ-6.14 No gate gets weaker, and what is verified is said

1. No threshold, config, check script, workflow or existing test is loosened, deleted or relaxed to pass.
   Where this spec forces an old expectation to change, `tasks.md` names the old test and the new one, and
   why trials 1 and 2 are not weaker.
2. `npm run check` passes in every task. Tasks that connect input to the screen also pass `npm run build`
   followed by `npm run smoke`.
3. The smoke targets mobile WebKit and desktop Chromium. Where WebKit cannot start in the authoring
   sandbox, the result says that the mobile smoke ran on Chromium with the iPhone 13 touch profile, and
   CI's WebKit run is what counts. The work is not called done before CI's smoke is green. A Playwright
   run is never called a check on a real phone. A test, hook or agent that was not run is not reported as
   run, and a Result line states only what was measured.

## Invariants

Rules from `.kiro/steering/domain-invariants.md` apply: ids are never reused or renumbered, each new
invariant gets a property test in the same pull request, and only rules a child depends on are listed.
Ids 6 and 7 are retired; 1 to 5 and 8 to 24 are in use at the start of this spec.

### New and changed

Revision 1 of this spec listed INV-25 to INV-32. Revision 2 keeps the numbers 26 to 32, with new wording where the
rule changed, retires 25, and continues at 33.

| id | invariant | child depends on | what changed |
|---|---|---|---|
| 25 | (retired) "Checking checks one star": described `CheckStar`, which marked a star at a tap. The tap now only looks and the marking is a verdict | | retired: the event is gone; INV-39 (a tap only looks) and INV-33 to INV-35 (a verdict sorts) say what it meant |
| INV-26 | A round has 1 or 2 fake stars out of the 5, and they are exactly `fakesOf(seed, round)`. The seed and the round do not change until `RetryField`. | there is always something to find and something to keep; the same seed plays the same | changed: the "what a check shows" clause moved to INV-36 and INV-34; the seed is new |
| INV-27 | A round is finished (kept or cleared) only by `KeepStars`, and only when all five stars are sorted. `KeepStars` with any star unsorted returns the same state. | nothing is accepted before it is decided | changed: "checked" is now "sorted"; "kept" is "finished" |
| INV-28 | The keep accepts exactly the real stars of the round: none is fake, none is missing, and all five were sorted before it. | I keep only the real ones I decided | changed: "checked" is "sorted" |
| INV-29 | Once a round is finished, every event except `RetryField` (and `LeaveField` from a cleared trial) leaves the field equal. | the result does not change by itself | changed: kept or cleared; the leave |
| INV-30 | `RetryField` after a finished round starts the next round (the first after the last): nothing sorted, nothing in the lens, no note, the same seed, and nothing else in the state changes. Before a round is finished it returns the same state. | the next round, any number of times | changed: it also follows a cleared trial; the seed |
| INV-31 | `InspectStar`, `SortStar`, `KeepStars`, `RetryField` and `LeaveField` return the same state outside trial 3; in trial 3 the first four change only `field`. `field` is the initial field whenever `trial` is not 3. | trials 1 and 2 cannot be broken from the field | changed: the new events; the leave changes the phase and is the exception |
| INV-32 | In trial 3 the events of the other trials (`Ask`, `PickCard`, `Retry`, `Tick`, `PickTool`, `GiveTool`, `RetryShed`) return the same state, so the lane, the run and the shed stay at their initial values: no clock, no score. | no clock or score in the field | unchanged |
| INV-33 | A star is sorted only by a verdict on the star in the lens. `SortStar` with no star in the lens returns the same state, and the only star whose mark can change in one event is the star that was in the lens. | I cannot judge what I did not look at | new |
| INV-34 | The right verdict sorts exactly the star in the lens: that star becomes sorted, the lens closes, the note says what was said, and every other star keeps its mark. | my right decision counts | new |
| INV-35 | A wrong verdict sorts nothing and never corrects the star for the child: the lens closes, the note says what was said, and no mark changes. The star can be looked at again and sorted rightly, without limit and at no cost. | a wrong decision is not scary and not final; the game does not decide for me | new |
| INV-36 | The clue is there from the start and never hidden: `shineOf` is `bright` for exactly the fake stars, before any tap, while looking, after sorting and after the keep, and it changes only when the round does. | I can tell by looking | new |
| INV-37 | The trial is cleared only by keeping the last round of a run (the second of each two rounds). `KeepStars` in any other round gives a finished round with more to come. | the trial ends | new |
| INV-38 | `LeaveField` from the cleared trial returns to the title (`phase` `title`, `trial` 0, `field` initial) and changes nothing else. Anywhere else it returns the same state. | I can go back; I cannot fall out by accident | new |
| INV-39 | `InspectStar` only looks: for an unsorted star that exists it changes `looking` and clears the note, and nothing else; for a sorted star, the star already in the lens, a star that does not exist, or a finished round it returns the same state. | a tap never decides for me | new |

`.kiro/steering/domain-invariants.md` has the rows and the note on this scope. INV-1 to INV-5 and INV-8 to
INV-24 keep their text and their tests.

## Verification summary

| layer | what | requirement |
|---|---|---|
| unit (`field.test.ts`, `reducer.test.ts`) | the rules and the events of the field, the pinned seeds | REQ-6.3 to 6.8 |
| property (`field.pbt.test.ts`) | INV-3 and INV-4 with the field events, INV-26 to INV-39 | REQ-6.8, 6.12 |
| model (`field.model.test.ts`) | states, invariants, goals, the deliberate breaks | REQ-6.5, 6.7, 6.12 |
| content (`field-content.test.ts`) | keys, placeholders, Japanese rules, lengths, no blame, no claims, the title caption | REQ-6.1.6, 6.4, 6.6, 6.11 |
| look (`field-look.test.ts`) | the clue is brighter and has a different rim, in a grayscale measure | REQ-6.2, 6.10.4 |
| view and layout (`field-view.test.ts`, `field-layout.test.ts`, `title-view.test.ts`, `route.test.ts`, `seed.test.ts`) | what each stage shows, no overlap, targets of 80 or more, the title's card, scene choice | REQ-6.1 to 6.9 |
| mutation (`npm run mutation`) | no surviving mutant | REQ-6.12, 6.14 |
| mobile and desktop smoke | real taps, pixels, grayscale, silence, screenshots, offline | REQ-6.1 to 6.13 |
