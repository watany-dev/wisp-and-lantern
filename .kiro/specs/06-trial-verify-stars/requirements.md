# Requirements: Trial 3, The Wisp Field ("check it")

Spec `06-trial-verify-stars`. Teaches learning goal L3 (`docs/learning-design.md`): a helper can make an
honest mistake, so check what it brings before you accept it. Requirement ids are `REQ-6.n`. `REQ-5.n`
belongs to `05-trial-grant-tools`, `REQ-4.n` to `04-score-attack`, `REQ-3.n` to
`03-trial-tell-vague-request`, `REQ-2.n` to `02-trial-tell` and `REQ-1.n` to the missing `01-core-loop`;
none is reused.

This adds a third trial on top of the existing base. It does not rebuild trials 1 or 2: the lane keeps its
one-request flow, clock, score and end screen, and the shed keeps its tools, results and retry.

## Why

`docs/learning-design.md` lists trial 3 as "1–2 of the 5 stars the helper brings are wisps; tap to check
before accepting. Wisps = fakes that shine brighter than the real thing." The child sees five stars the
wisp has collected. All five shine alike. Looking does not tell which are real, so the child checks them
one at a time, finds that one or two are fakes, and keeps only the real ones that they checked. The wisp
did not mean to bring a fake: it mixed it up. The child learns to check what the helper brings before
accepting it, and that the helper can be wrong without being a liar.

The table calls the fakes "wisps" (marsh lights). The helper in this game is also "the wisp", and a
6-year-old would read "a wisp is a fake" as "the wisp is fake". The child-facing words therefore say
**fake star** (`にせものの ほし`), never "wisp". See `design.md`, Decisions.

## Scope

In: trial 3 only, from a tap on the title to the kept result, and the replay with the next round.
Touches `src/domain`, `src/game`, `src/content`, their tests, `e2e/`, this spec, the steering invariants
file, and the smallest notes that keep other documents true.

Out: trials 4 to 6, the parent screen, judge features (no `?trial=n` jump or judge-only entrance), a way
back from the field to the title (same as the shed: see "Relation to earlier specs" and `design.md`,
Decisions), a trial-select screen or a general router, network use or measurement, saving, a service
worker, sound, a shared framework for future trials, new dependencies. No change to `vite.config.ts`,
`stryker.config.json`, `package.json`, `scripts/check-*` or `.github/`. L4 content is not added here.
Verifying with a real tool (running a test, reading a source) is not shown: the game's check is a staging
device (see REQ-6.6.4).

## Relation to earlier specs

Earlier specs say "trial 1 only" or "trials 3 to 6 are out" (05). Those sentences were true of their
scope, not a ban on a third trial. Nothing is silently replaced. The earlier specs keep their text; spec
05 gains one pointer note at the top of its requirements (and its `jp/` copy), as 02 and 04 did for 05.

### Inherited (applies to trial 3 as it is)

| old | what | now |
|---|---|---|
| REQ-2.9 | Japanese and English, `?lang=`, then the browser language; a language change never changes progress | REQ-6.11 |
| REQ-2.10 and hard rule 7 | meaning is never carried by color alone | REQ-6.3, 6.4, 6.5 |
| REQ-2.11 | 390 x 844 portrait, one finger or a mouse, targets of 80 x 80 or more, the hero's floor drag | REQ-6.9 |
| REQ-2.12 and hard rule 4 | no network after the first load, art drawn in code, bundled font | REQ-6.10 |
| REQ-2.13, REQ-3.6 | text lives in `src/content`; Japanese rules for the kid text; placeholders replaced | REQ-6.11 |
| REQ-2.15, REQ-3.9, REQ-5.15, ADR 0003 | no gate gets weaker | REQ-6.14 |
| REQ-4.9 to REQ-4.11 | sharp rendering, characters drawn in code, motion that never carries the only meaning | REQ-6.10 |
| REQ-5.4.3, REQ-5.6.1 (the tone) | kind words; nothing red, no cross, no shake, no sound; the fact is not hidden | REQ-6.4 |

### Trials 1 and 2 only (kept as written; trial 3 does not use them)

| old | what | in trial 3 |
|---|---|---|
| REQ-2.1 to REQ-3.5, REQ-4.1 to REQ-4.8 | cards, asking the wisp, the 60-second run, clock, score, end screen | not used. The field has its own flow (REQ-6.2 to 6.7) and no clock or score |
| REQ-5.2 to REQ-5.8 | tools, the hand-over, the door | not used |
| INV-5, INV-8 to INV-17 | trial 1's lane and run | still hold for every sequence, including the field events; INV-32 says the field cannot touch the lane or the run |
| INV-18 to INV-24 | trial 2's shed | unchanged; INV-31 and INV-32 say the field and the shed cannot touch each other |

### New in trial 3

REQ-6.1 to REQ-6.7 (the play), REQ-6.8 (the separation), and the checks in REQ-6.12 and REQ-6.13. New
invariants INV-25 to INV-32.

### Changes to a shared entrance or event

Each row names the old requirement, what the code does today, and the new requirement. The old text is
not edited.

| old requirement | the code today | change | new |
|---|---|---|---|
| REQ-5.1.1 "one extra tap target" on the title; REQ-5.1.3 | the title has the shed button at (195, 736); the scene starts trial 1 on a press that hit no object | one more button, for trial 3, above the shed button. The shed button does not move. A press on either button starts nothing else | REQ-6.1.1, 6.1.3 |
| title art positions (REQ-2.1, 04) | the title's wisp is at (285, 590) and the hero at (110, 600), art ends at about y 660 | both move up by 52 game pixels so that the new button fits between the art and the shed button. `titleArtBottom` in `shed-layout.ts` becomes 600. No test pins the old value: `shed-layout.test.ts` checks that the shed button is below it | REQ-6.1.1 |
| `sceneFor` (REQ-5.9.2) | `trial` 2 is the shed, anything else in a trial is the lane | `trial` 3 is the field | REQ-6.8.2 |
| `GameEvent` | has `StartShed`, the shed events | gains `StartField`, `CheckStar`, `KeepStars`, `RetryField` | REQ-6.8.3 |
| `Ask`, `PickCard`, `Retry`, `Tick`, `PickTool`, `GiveTool`, `RetryShed` | applied only in their own trial (the guards from 05) | no code change: they already return the same state in trial 3. INV-32 now says so for the field | REQ-6.8.3, INV-32 |
| `Start` while a trial runs | sets the language only | unchanged, and now also true in trial 3 | REQ-6.8.4 |
| REQ-5.6.4 / REQ-4.6.2 (no soft-lock, no exit) | the shed has no way back to the title | the same for the field: the child plays the next round with its own button, and a reload returns to the title | REQ-6.7.4, Decisions |
| INV-1, INV-2 | `phase` and `trial` bounds | unchanged and global; `trial` may now be 3 | INV-1, INV-2 |
| INV-23 | `shed` is initial whenever `trial` is not 2 | unchanged; true in trial 3 | INV-31 |
| `e2e/helpers.ts` `GameState` type | has `shed` | gains the `field` field | REQ-6.13 |

## Glossary

- **Field**: the dark meadow of the picture, where the wisp has put down the stars it collected.
- **Star**: one of the five picture objects in the field. Each is real or fake. Stars are numbered 0 to 4,
  top row left to right, then the bottom row.
- **Round**: one play of the field, from a fresh set of five stars to the kept result. The rounds come
  from a fixed table of four, in order, and then the table starts again.
- **Fake star**: a star that is not real. A round has 1 or 2 of them. It is the wisp's honest mistake.
- **Check**: the child taps a star and the game shows whether it is real or fake. It is the only way to
  find out.
- **Mark**: what the child knows about a star: unchecked, real or fake.
- **Keep**: the child taps the button to accept the real stars. It is the only way a star is accepted.
- **Kept result**: the screen after the keep: the real stars stay, the fake ones fade, a message says how
  many were kept, the closing line shows, and the button plays the next round.
- **Closing line**: a short sentence, shown on the kept result only, that looks back at what the child
  did: they checked each star and kept the real ones.

## Requirements

### REQ-6.1 Enter the field with a tap

As a 6-year-old, I want to open the wisp's star field from the title with my finger, so that I can play
it without a grown-up.

1. The title screen shows a second extra tap target, for trial 3: a button with a picture of a star and a
   short label in the child's language, at least 80 x 80 game pixels. It sits above the shed button, clear
   of the shed button and of the title's wisp and hero.
2. Tapping the button opens the field. The state moves from `title` to `trial` with `trial` 3. No run
   starts: the clock stays 60 seconds and is not counted down, the score is 0, the lane and the shed
   are untouched.
3. A tap on this button never also starts trial 1 or opens the shed, and a tap on the shed button never
   opens the field. A tap on the title anywhere else starts trial 1 as before, and the end screen's
   play-again button still starts a new run (REQ-4.6).
4. The entrance is an ordinary tap on the ordinary screen. It is not a judge URL, a hidden gesture, a
   console call, or a query parameter.
5. There is no trial-select screen and no general router. The only new screen is the field.

### REQ-6.2 What the field shows

1. The field screen shows a guide text, five stars in two rows (three above, two below), the wisp, and a
   message. After the stars are all checked it also shows a button.
2. The guide is one short sentence in two lines at most. It says to check each star first, then keep the
   real ones, and it stays on screen in every stage.
3. Before a star is checked, the five stars look exactly alike. Nothing in the picture, the words or the
   motion says which are fake: looking is not checking.
4. The wisp is on screen in every stage, with its usual friendly face. It is never drawn angry, sly,
   scared or hurt. It is not a tap target in this trial.

### REQ-6.3 Check one star at a time

1. Tapping an unchecked star checks it, and only it. The other four stars do not change.
2. A checked star shows what it is by shape and by word, not by color or motion alone:
   a real star stays a solid star, gets a tick badge, and a label (`real` / `ほんもの`);
   a fake star turns into a hollow outline of a star with no fill, no tick, and a label (`fake` /
   `にせもの`).
3. Stars can be checked in any order. The result for a star does not depend on the order.
4. Tapping a checked star again changes nothing.
5. Checking never keeps: the state and the picture show nothing as accepted until the keep (REQ-6.5).
6. After each check the message tells what the child just found, about that star: it is real, or it is a
   fake (REQ-6.4.2).
7. The result of a check is decided at once by the reducer. It never waits for an animation or a timer.
   A short flourish may play, and may be ignored without losing information.

### REQ-6.4 A fake star is the wisp's honest mistake

1. Every round has 1 or 2 fake stars among the five: never none, never all. Which stars are fake comes
   from a fixed table of rounds (no randomness) and does not change while the round lasts.
2. When a fake star is found, the message says it is a fake and that the wisp mixed it up. The words are
   plain and kind: no "lie", "trick", "cheat", "bad", "naughty", "enemy", "wrong", no blame for the
   child and none for the wisp. Nothing is red, no cross is shown, and there is no sound or shake. The
   fact that the star is fake is not hidden.
3. A real star's message says it is real, kindly and briefly.
4. The words never say or suggest that the helper is always wrong, always right, knows everything, is a
   friend or family, or does it on purpose (`docs/learning-design.md`, "What we do not teach").
5. A real and a fake star differ by shape (solid with a tick, hollow without), by their label and by the
   message. A fake star's halo is larger and paler than a real star's (the table's "shines brighter"),
   which is a look and never the only sign.

### REQ-6.5 Keep only what was checked

1. A button to keep the real stars appears only when all five stars are checked. Before that, no keep
   button is on screen, and a `KeepStars` event that reaches the reducer changes nothing.
2. The keep accepts exactly the real stars. A fake star is never kept and an unchecked star is never
   kept. Nothing else keeps a star.
3. After the keep the real stars stay on screen with their tick, and the fake stars fade (not
   removed, so the child can still see what was found). The message names the number of real stars
   kept (3 or 4), the closing line shows (REQ-6.6) and the button plays the next round.
4. The kept result stays on screen until the child taps the button. Nothing times out, and nothing
   removes the result or the closing line by itself. The keep cannot be undone, and no star can be
   checked or kept again in the same round.

### REQ-6.6 The closing line looks back

1. The kept result shows a closing line, a separate text, that looks back at the child's action: they
   checked each star and kept the real ones. The wording is chosen in `design.md` after the kid-reader
   rubric; the directions are ja `ひとつずつ たしかめて` / `ほんものだけ うけとったね` and en
   `You checked each star` / `and kept the real ones`.
2. It is shown only on the kept result, not while checking. It is not joined to the message. The
   result, the stars and the button stay visible, and no text gets smaller to make room.
3. It says only what happened in this field. It does not say that a real AI always makes mistakes, never
   makes them, that checking always works, that AI knows everything, or that it is a friend or family
   (`docs/learning-design.md`, "What we do not teach").
4. Why a check shows the truth at one tap (a fixed staging device so that the child can feel "check
   before you accept", not a claim that checking real AI work is as easy) is written in `design.md`.

### REQ-6.7 The next round, any number of times

1. After the kept result, the button starts the next round: nothing is checked, nothing is kept, and the
   fake stars are the next entry of the round table. After the last entry comes the first.
2. The next round has no limit and no cost. Nothing is used up and no score is kept.
3. The field has no 60-second clock, no score, no streak and no time up. A `Tick` changes nothing in the
   field.
4. From every state of the field the child can reach the kept result (no soft-lock), and from the kept
   result they can play the next round. There is no exit to the title in this spec: a page reload
   returns to it (same as the shed).

### REQ-6.8 Trials stay apart

1. Entering the field starts no run and leaves `lane`, `run` and `shed` as they were on the title.
2. The scene shown follows `trial`: 1 is the lane, 2 is the shed, 3 is the field. A state with `trial` 3
   never shows the lane or the shed.
3. In trial 3 the trial 1 events (`Ask`, `PickCard`, `Retry`, `Tick`) and the shed events (`PickTool`,
   `GiveTool`, `RetryShed`) return the same state. Outside trial 3, the field events (`CheckStar`,
   `KeepStars`, `RetryField`) return the same state. `StartField` is accepted from the title only.
4. `Start` in the field sets the language only. `SetLang` changes the language only and never changes a
   mark or the result. `MoveHeroTo` moves the hero only.
5. The marks and the kept result are one value, not two copies: the kept stars are the real stars of the
   round, derived from the round and never stored.
6. The behaviour, texts, layout and tests of trials 1 and 2 are unchanged by this spec, except the
   title art's position (see "Changes to a shared entrance or event").

### REQ-6.9 Portrait, one finger, mouse

1. The field plays on the existing 390 x 844 portrait canvas.
2. Every action is one tap or click on an object of at least 80 x 80 game pixels: the title's field
   button, each star, and the button. There is no drag, hold, double tap or second finger.
3. The hero's floor drag still moves the hero in the field. A press that starts on a star or the
   button does not move the hero; a press on the floor does.
4. Texts and pictures do not overlap each other or hide a star, the message or the button, in every
   stage (nothing checked, partly checked, all checked, kept), in both languages, with the number inserted.

### REQ-6.10 Drawn in code, no network

1. The stars, their marks and the field are drawn in code at the device pixel ratio, with the existing look
   (REQ-4.9 to REQ-4.11). No image file is added and no third-party art is used (hard rule 5).
2. The field needs no network request after the page and its bundled font have loaded, in Japanese and in
   English (hard rule 4). A full play of check, keep and the next round works with the network switched off.
3. Motion never carries the only meaning, never flashes faster than 3 times a second, and can be ignored
   without losing information.

### REQ-6.11 Japanese and English, and text in content

1. The guide, the messages, the star labels, the button labels, the title's field label and the closing
   line are all in `src/content/strings.ja.json` and `strings.en.json`, under the same keys. No
   child-facing literal appears in `src/game/` or `src/domain/`.
2. Japanese follows hard rule 2 through `npm run kid`: no kanji, no Latin letters, at most 12 characters a
   line and 2 lines, also after the number is inserted. English messages are at most 2 short lines.
3. A message that takes the number takes exactly one and keeps no unreplaced placeholder.
4. The language is the existing one (`?lang=ja|en`, else the browser language, else English). `SetLang`
   can change it at any time; the words change and nothing else changes.
5. `npm run kid` and `npm run font` pass after the strings change; the subset font covers every character.

### REQ-6.12 Pure rules, checked several ways

1. The check, the keep and the next round are rules of the pure reducer (ADR 0001). `src/domain` uses no
   Phaser, DOM, clock or randomness, and the result depends on no language or animation timing.
2. Each of INV-25 to INV-32 (below) has a property test over the real reducer with `checkProperty`, and
   the generators check every star, check twice, use an index that does not exist, keep too early, keep
   when complete, retry before and after the keep, and go round the whole table. INV-3 and INV-4 also run
   over sequences that contain the new events.
3. Unit tests cover: nothing checked, a real star, a fake star, every star in a round, a second check of
   the same star, an index out of range, a keep with a star unchecked, a keep when all are checked, the
   kept stars are the real ones, the lock after the keep, a retry before and after the keep, the whole
   round table (1 or 2 fakes each, four different sets), and the entry from the title. For content and
   view: ja/en same keys, placeholders, lengths, no blame or claims, the closing line only on the kept
   result, the button only when all are checked, the message follows the star checked last.
4. A model check over the real reducer (`field.model.test.ts`) covers the entrance from the title and the
   field after it, with a finite alphabet that includes invalid trial 1 and trial 2 events, out-of-range
   stars, `Tick`, `Start` and language changes. It checks: the marks always equal what the child
   checked, a fake star is never kept, a keep needs five checks, from every reachable state the kept
   result is reachable, and also after a success; it records the number of states and the
   counterexamples of deliberate breaks. It does not drop any field state to pass.
5. Mutation testing finds no surviving mutant in the unit-tested code.

### REQ-6.13 The real taps and the real screen

1. The mobile smoke enters the field from the title with a real tap (not `dispatch`) and plays: the first
   star checked, the message; a fake star found; a second check of the same star changes nothing; all five
   checked, the keep button appears; keep, the closing line shows and the fake stars are faded; the next
   round has a different set of fake stars; and the round table repeats after four rounds. `window.__game`
   is used to read the state, never to do what a tap can do. The one `dispatch` allowed is `Tick` and
   `SetLang`, which have no button.
2. The smoke checks the screen, not only the state: for each star the solid or hollow shape and the
   tick badge, and the closing line and the button, are seen in the pixels. A state that says "fake" with a
   solid star fails.
3. Japanese and English screens for the start, a fake found, all checked and kept are looked at in
   screenshots. The desktop smoke plays the field with the mouse and checks that a held press on a star
   does not move the hero. Offline after the first load, in both languages, check, keep and the next round
   still work.
4. The smoke of trials 1 and 2, including the score attack, still passes. The title's field button starts
   neither of them, and a tap elsewhere on the title still starts trial 1.

### REQ-6.14 No gate gets weaker, and what is verified is said

1. No threshold, config, check script, workflow or existing test is loosened, deleted or relaxed to pass.
   Where adding trial 3 forces an old expectation to change, `tasks.md` names the old test and the new
   one, and why trials 1 and 2 are not weaker.
2. `npm run check` passes in every task. Tasks that connect input to the screen also pass `npm run build`
   followed by `npm run smoke`.
3. The smoke targets mobile WebKit and desktop Chromium. Where WebKit cannot start in the authoring
   sandbox, the result says that the mobile smoke ran on Chromium with the iPhone 13 touch profile, and
   CI's WebKit run is what counts. The work is not called done before CI's smoke is green. A Playwright
   run is never called a check on a real phone. A test, hook or agent that was not run is not reported as
   run.

## Invariants

Rules from `.kiro/steering/domain-invariants.md` apply: ids are never reused or renumbered, each new
invariant gets a property test in the same pull request, and only rules a child depends on are listed.
Ids 6 and 7 are retired; 1 to 5 and 8 to 24 are in use at the start of this spec.

### New

| id | invariant | child depends on |
|---|---|---|
| INV-25 | Checking checks one star: `CheckStar` with an unchecked star's index in the field marks exactly that star and every other star keeps its mark. An index that is not 0 to 4, a star already checked, or a field already kept returns the same state. | one star at a time; a second tap changes nothing |
| INV-26 | A round has 1 or 2 fake stars out of the 5, and what a check shows is true and steady: a checked star is a fake exactly when it is among the round's fakes, and the round does not change until `RetryField`. | the check is honest; there is always something to find and something to keep |
| INV-27 | The field reaches the kept result only by `KeepStars`, and only when all five stars are checked. `KeepStars` with any star unchecked returns the same state. | nothing is accepted before it is checked |
| INV-28 | The keep accepts exactly the real stars of the round: none is fake and none is missing, and every one of them was checked before. | I keep only the real ones I checked |
| INV-29 | Once kept, every event except `RetryField` leaves the field equal. The result stays until the retry. | the result does not change by itself |
| INV-30 | `RetryField` after the keep starts the next round: nothing checked, the round after this one in the table (the first after the last), and nothing else in the state changes (phase, trial 3, language, hero, lane, run, shed). Before the keep it returns the same state. | play again, any number of times, a different set |
| INV-31 | Field events (`CheckStar`, `KeepStars`, `RetryField`) return the same state outside trial 3, and in trial 3 change only `field`. `field` is the initial field whenever `trial` is not 3. | trials 1 and 2 cannot be broken from the field |
| INV-32 | In trial 3 the events of the other trials (`Ask`, `PickCard`, `Retry`, `Tick`, `PickTool`, `GiveTool`, `RetryShed`) return the same state, so the lane, the run and the shed stay at their initial values: no clock, no score. | no clock or score in the field |

### Changed or retired

None. INV-1 to INV-5 and INV-8 to INV-24 keep their text and their tests. They describe the state and the
other trials' rules; they hold when the field events are in the sequences (INV-1 to INV-4 are re-run
with the field events too), and INV-31 and INV-32 are what stops the field from reaching the lane, the run
and the shed. `.kiro/steering/domain-invariants.md` gets a note on this scope and the eight new rows.

## Verification summary

| layer | what | requirement |
|---|---|---|
| unit (`field.test.ts`, `reducer.test.ts`) | the rules and the events of the field | REQ-6.3 to 6.8 |
| property (`field.pbt.test.ts`) | INV-3 and INV-4 with the field events, INV-25 to INV-32 | REQ-6.8, 6.12 |
| model (`field.model.test.ts`) | states, invariants, goals, the deliberate breaks | REQ-6.5, 6.7, 6.12 |
| content (`field-content.test.ts`) | keys, placeholders, Japanese rules, lengths, no blame, no claims | REQ-6.4, 6.6, 6.11 |
| view and layout (`field-view.test.ts`, `field-layout.test.ts`, `field-palette.test.ts`, `route.test.ts`) | what each stage shows, no overlap, targets of 80 or more, scene choice | REQ-6.1 to 6.9 |
| mutation (`npm run mutation`) | no surviving mutant | REQ-6.12, 6.14 |
| mobile and desktop smoke | real taps, pixels, screenshots, offline | REQ-6.1 to 6.13 |
