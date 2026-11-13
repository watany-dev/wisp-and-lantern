# Requirements: Trial 2, The Locked Shed ("hand over the tools")

> **Scope note: a third trial now exists ([`06-trial-verify-stars`](../06-trial-verify-stars/requirements.md)).**
> "Trials 3 to 6 stay out" below describes this spec's scope. Trial 3 (The Wisp Field) is added by `06`,
> which also moves the title's wisp and hero up and puts its button above the shed button. Revision 2 of
> this spec (below) removes the sentence "no way back from the shed" and gives the shed a clock; `06` is
> otherwise unchanged by it.

Spec `05-trial-grant-tools`, **revision 2**. Teaches learning goal L2 (`docs/learning-design.md`): a helper
can only act with the tools it is given, so hand over the one it needs. Requirement ids are `REQ-5.n`.
`REQ-4.n` belongs to `04-score-attack`, `REQ-3.n` to `03-trial-tell-vague-request`, `REQ-2.n` to
`02-trial-tell` and `REQ-1.n` to the missing `01-core-loop`; none is reused.

This adds a second trial on top of the existing base. It does not rebuild trial 1: trial 1 (The Dark
Lane) keeps its one-request flow, results, retry, closing line, 60-second clock, score and end screen.

## Revision 2: what the comments said, and what changed

The first build of this spec (pull requests #60 to #68) got three comments on 2026-11-12: "I can't go back to
the title", "there is no game in it; make three choices five and give each one its own answer", and "add a
60-second time attack". "Give each of them its own answer" is
read as five puzzles with one answer each, so that each of the five tools is the answer to one of them (see
`design.md`, Decisions).

| comment | cause in revision 1 | now |
|---|---|---|
| The child cannot go back to the title | "no way back from the shed" was out of scope on purpose (a reload was the way) | A button back to the title, in a run and on the end screen (REQ-5.16) |
| There is no game in it | One shed, one answer (the key). Once the child has handed over the key, nothing is left to find out or win | Five puzzles, each with its own answer (REQ-5.2.3, REQ-5.5.2), and a score (REQ-5.7.4) |
| Three tools are too few | Three tools, one of them right | Five tools: key, broom, hammer, scissors, ladder (REQ-5.3) |
| Add a time attack of 60 seconds | The shed had no clock (REQ-5.7 of revision 1) | The shed is a 60-second run with the clock, the score and the end screen of trial 1 (REQ-5.7) |

Requirements changed in place (ids are kept; the text under them is new): REQ-5.1 to REQ-5.10, REQ-5.12 to
REQ-5.14. REQ-5.16 is new. REQ-5.11 and REQ-5.15 are unchanged. The old text is in the history of this file
(the commit before this revision). Invariants: INV-18 to INV-24 keep their numbers with new wording
(INV-24 no longer says "no clock, no score"), INV-15 to INV-17 are widened to the shed, INV-40 to INV-43 are
new (see "Invariants").

## Why

`docs/learning-design.md` lists trial 2 as "Give one tool to let a cat out of a locked shed. Locks and doors
= permission." In the first build the child saw three tools, handed one to the wisp, and learned that only
the key opened the door. It was the same answer every time, so it taught the point once and then offered
nothing to play for. Now the cat is stuck in a different way each round: a lock, a heap of leaves, boards
nailed over the door, a rope round it, or a perch on the roof. Each has one tool that fits, and the child has
60 seconds to free as many cats as they can. A wrong tool leaves the puzzle exactly as it was. The child
learns, by trying, that what the wisp can do depends on the tool it was given, and that the right tool
depends on the problem.

## Scope

In: trial 2 only, from a tap on the title to the end screen, the retry, the next puzzle, the replay and the
way back to the title. Touches `src/domain`, `src/game`, `src/content`, their tests, `e2e/`, this spec, the
steering invariants file, and the smallest notes that keep other documents true.

Out: trials 4 to 6, the parent screen, judge features (no new `?trial=n` jump or judge-only entrance), a
way back from trial 1's end screen to the title (the comment was about trial 2), a trial-select screen or a
general router, network use or measurement, saving the best score between sessions, a service worker, sound,
a shared framework for future trials, new dependencies. No change to `vite.config.ts`,
`stryker.config.json`, `package.json`, `scripts/check-*` or `.github/`. L3 and L4 content, and any "too
much power causes an accident" scene (the second half of L2 in the learning table), are not added here.

## Relation to earlier specs

Earlier specs say "trial 1 only" and "from the title tap to trial 1". Those sentences were true of
their scope, not a ban on a second trial. Nothing is silently replaced: the tables show what trial 2
inherits, what stays trial 1 only, what it reuses from the run, what is new, and the few places where trial 2
changes a shared entrance, event or screen. The earlier specs keep their text and gain one pointer note each.

### Inherited (applies to trial 2 as it is)

| old | what | now |
|---|---|---|
| REQ-2.9 | Japanese and English, `?lang=`, then the browser language; a language change never changes progress | REQ-5.12 |
| REQ-2.10 and hard rule 7 | meaning is never carried by color alone | REQ-5.3, 5.5, 5.8 |
| REQ-2.11 | 390 x 844 portrait, one finger or a mouse, targets of 80 x 80 or more, the hero's floor drag | REQ-5.10 |
| REQ-2.12 and hard rule 4 | no network after the first load, art drawn in code, bundled font | REQ-5.11 |
| REQ-2.13, REQ-3.6 | text lives in `src/content`; Japanese rules for the kid text; placeholders replaced | REQ-5.12 |
| REQ-2.15, REQ-3.9, ADR 0003 | no gate gets weaker | REQ-5.15 |
| REQ-4.9 to REQ-4.11 | sharp rendering at the pixel ratio, characters drawn in code, motion that never carries the only meaning | REQ-5.11 |

### Reused from trial 1's run (revision 2)

| old | what | in trial 2 |
|---|---|---|
| REQ-4.1, REQ-4.2 | a run is 60 seconds; the clock counts down whatever the child is doing; time reaches the game only as `Tick`; a frame counts as at most 250 ms; the top row shows the seconds and a bar | the same clock, the same top row (REQ-5.7.1) |
| REQ-4.3 | a find scores 100, plus 50 for each find in a row, up to 4; anything else scores nothing and ends the streak | a freed cat is a find; any other tool is not (REQ-5.7.4) |
| REQ-4.5 | time up ends the run at once; the end screen shows the score and the best of the session; "New best!" | the same end screen, with one more button (REQ-5.7.5, REQ-5.16.2) |
| REQ-4.6.1 | play again begins a new run: full clock, score 0, only the best carries over | the same, for the shed's own run (REQ-5.7.5) |

### Trial 1 only (kept as written; trial 2 does not use them)

| old | what | in trial 2 |
|---|---|---|
| REQ-2.1 to REQ-2.8 | pick color and object cards, tap the wisp, the brought item, retry | not used. The shed has its own flow (REQ-5.3 to 5.7) |
| REQ-3.1 to REQ-3.5 | one card is a request, what the wisp brings, the closing line of trial 1 | not used. The shed has its own closing line (REQ-5.8) |
| REQ-4.4 | the villager's wishes | not used. The shed has its puzzles (REQ-5.2.3) |
| REQ-4.6.2 | from every state the child can reach a new run | still true for trial 1. The shed has its own (REQ-5.6.4, REQ-5.16) |
| INV-5, INV-8 to INV-14 | trial 1's lane | still hold for every sequence, including the shed events; INV-24 says the shed cannot touch the lane |

### New in trial 2

REQ-5.1 to REQ-5.8 (the play), REQ-5.9 (the separation), REQ-5.16 (the way back), and the checks in
REQ-5.13 and REQ-5.14. Invariants INV-18 to INV-24 (reworded) and INV-40 to INV-43.

### Changes to a shared entrance, event or screen

Each row names the old requirement, what the code does, and the new requirement. The old text is not edited.

| old requirement | the code | change | new |
|---|---|---|---|
| REQ-2.1.1 "when the child taps the title screen, the game shows The Dark Lane"; REQ-4.1.1 "starts a run when the child taps the title screen" | `TitleScene` starts on any pointer-down; `Start` makes `phase` `trial` and `trial` 1 | A tap on the title still starts trial 1, except a tap on the shed button. The scene starts only when the press hit no object | REQ-5.1.2, 5.1.3, 5.9.1 |
| REQ-2.1.3 "no screen other than the title and this trial exists" | scenes: title, lane, over | one more scene, the shed, reached only from the title; the end screen is shared | REQ-5.1, REQ-5.7.5 |
| `TitleScene` sends `phase` `trial` to the lane scene | `render` calls `scene.start("lane")` | the scene is chosen by `trial`: 1 is the lane, 2 is the shed | REQ-5.9.2 |
| `Ask`, `PickCard`, `Retry` (trial 1 events) | applied whenever `phase` is `trial` | applied only when `trial` is 1; in trial 2 they return the same state | REQ-5.9.3, INV-24 |
| `Tick` (REQ-4.2.2) | applied whenever `phase` is `trial` | applied in trial 1 and in trial 2; in the field it does nothing | REQ-5.7.1, INV-15 |
| `Start` while a trial runs (design of 02: "a second `Start` changes only the language") | sets the language only | unchanged, and also true in trial 2: it never leaves the shed or starts trial 1. On the shed's end screen `Start` begins trial 1, and the shed's state is dropped | REQ-5.9.4 |
| the end screen (REQ-4.5, REQ-4.6) | one button, play again, which sends `Start` | the shed's end screen has two buttons: play again (sends `StartShed`) and back to the title (sends `LeaveShed`). Trial 1's end screen is unchanged | REQ-5.7.5, REQ-5.16.2 |
| REQ-4.6.2 "from every state the child can reach a new run (no soft-lock)" | the end screen and the lane lead to a new run | still true for trial 1. In the shed every state leads to a freed cat, to the title, and, after the time is up, to a new run | REQ-5.6.4, REQ-5.16 |
| 02 scope "Out: trials 2 to 6"; 04 scope "trial 1 as the only game" | text of the earlier specs | trial 2 is in scope of this spec only. Trials 4 to 6 stay out | Scope above |
| INV-1, INV-2 | `phase` and `trial` bounds | unchanged and global; `trial` may be 2 | INV-1, INV-2 |
| INV-15 to INV-17 | the clock, the score and the end screen of "a run" | widened to the shed's run (the new events `StartShed` and `LeaveShed` are in their lists) | INV-15 to INV-17 |
| trial 1 model check "a trial is trial 1" | alphabet has no shed event | unchanged and kept. Its state space is trial 1 only; the shed has its own model check | REQ-5.13.4 |
| `e2e/helpers.ts` `GameState` type | `shed` with a stage and a pick | gains `seed` and `round` | REQ-5.14 |
| the title's caption `noClock` ("no timer") on the shed's button (REQ-6.1.6 of `06`) | the shed's button said it has no timer | the shed's button says "How many in 60 seconds?"; the field's button keeps "No timer" | REQ-5.1.1 |

## Glossary

- **Shed**: the locked wooden shed in the picture, with a door, a window and a roof. It holds a cat. It is
  the same shed every round; what is wrong with it changes.
- **Puzzle**: what keeps the cat in this round. One of five: `lock`, `leaves`, `boards`, `rope`, `roof`.
- **Round**: one puzzle. Round 0 is the first of a run. A round ends with the cat freed; a wrong tool does not
  end it.
- **Tool**: one of five picture cards: `key`, `broom`, `hammer`, `scissors`, `ladder`. Each has a short
  label and its own silhouette.
- **Answer**: the one tool that solves a puzzle (REQ-5.5.2). Every puzzle has exactly one, and every tool is
  the answer to exactly one puzzle.
- **Pick**: the tool currently chosen, or none. Picking is not handing over.
- **Hand over** (also "give"): the child taps the wisp while a tool is picked. This is the only way a tool
  is used.
- **Tried tool**: the tool the wisp tried on the puzzle. It is the picked tool at the moment of handing
  over, and it cannot change until the retry.
- **Result**: `freed` (the tool is the answer: the obstacle is gone and the cat is out) or `stuck` (any other
  tool: the puzzle is as it was and the cat is still in).
- **Run**: the shed's 60 seconds, from a tap on the title's shed button (or on play again) to the time up.
  It uses the same `Run` as trial 1: the clock, the score, the streak and the best of the session.
- **Closing line**: a short sentence, shown on the freed result only, that looks back at what the child
  did: they handed over the tool, and the wisp could solve the puzzle.

## Requirements

### REQ-5.1 Enter the shed with a tap

As a 6-year-old, I want to open the cat's shed from the title with my finger, so that I can play it
without a grown-up.

1. The title screen shows one extra tap target for trial 2: a button with a picture, a short label and a
   short caption, in the child's language, at least 80 x 80 game pixels. Its picture shows the key and its
   label says it is about the cat. Its caption says that the shed has the 60 seconds ("How many in 60
   seconds?"), and the field's button keeps saying that it has no timer (REQ-6.1.6 of `06`).
2. Tapping the button opens the shed and begins its run. The state moves from `title` to `trial` with
   `trial` 2, round 0 of a new order of puzzles (REQ-5.2.3), a full clock of 60 seconds, a score of 0 and a
   streak of 0. The best score of the session carries over. The lane is untouched.
3. A tap on the button never also starts trial 1. A tap on the title anywhere else starts trial 1 as
   before, and trial 1's end screen still has its one play-again button (REQ-4.6).
4. The entrance is an ordinary tap on the ordinary screen. It is not a judge URL, a hidden gesture, a
   console call, or a query parameter.
5. There is no trial-select screen and no general router. The new screens are the shed, and the end screen
   it shares with trial 1.

### REQ-5.2 What the shed shows

1. The shed screen shows: the top row of the run (REQ-5.7.1), a guide text, the shed with its puzzle, the
   trapped cat, the wisp, five tools, and a button back to the title (REQ-5.16.1).
2. The guide is one short sentence in two lines at most. The first line says what is wrong in this round's
   puzzle ("The door is locked!"); the second invites the child to give the wisp a tool and names none.
3. Every round shows one puzzle, and each puzzle has its own picture:

   | puzzle | the picture while the cat is stuck |
   |---|---|
   | `lock` | the door is shut with a padlock on it; the cat's face is at the window |
   | `leaves` | the door is shut, with a heap of leaves against its foot; the cat's face is at the window |
   | `boards` | the door is shut with two planks nailed across it; the cat's face is at the window |
   | `rope` | the door is shut with a rope wound round it and knotted; the cat's face is at the window |
   | `roof` | the door is shut and the window is empty; the cat sits up on the left slope of the roof |

   The order of the puzzles comes from a seed that the game draws when a run starts: it begins at one of the
   five and steps through them by a fixed step (1 to 4), so every five rounds show all five puzzles and a puzzle
   never follows itself. The same seed always plays the same order (ADR 0001); with no seed the order is
   the fixed one in the table.
4. While choosing, the picture does not change until the wisp tries a tool.

### REQ-5.3 Pick one tool

1. The five tools are shown as picture cards with a short label: key, broom, hammer, scissors, ladder. Each has
   its own outline (a key has a round bow and teeth, a broom a handle and a wide brush, a hammer a handle and
   a block head, scissors two crossed blades over two rings, a ladder two rails with rungs), so the tools
   are told apart without color. They sit in two rows, three above two, in a fixed order.
2. The pick is none or one tool. Tapping a tool picks it; tapping a different tool replaces the pick;
   two tools are never picked at once.
3. The picked tool is marked by a thick frame and a tick shape, never by color alone.
4. Picking never hands the tool over and never uses it: the picture and the score do not change except for
   the mark.
5. Tapping the picked tool again keeps it picked. (There is no un-pick; the pick is replaced by
   another tool or cleared by the retry.)

### REQ-5.4 Hand over explicitly

1. The child hands the picked tool over by tapping the wisp. This is the only way to hand a tool over.
2. With one tool picked, the wisp looks ready (an ask ring) and the message says to tap the wisp. One
   tool is enough: nothing says or suggests that a second tool is needed.
3. With no tool picked, a tap on the wisp changes nothing. The wisp looks dimmed and the message kindly
   invites the child to pick a tool. Nothing is red, no cross is shown, and there is no sound or shake.
4. While a result shows, the wisp cannot be tapped again and the pick cannot be changed. The wisp
   hands over once per attempt.
5. The tapped tool is the one that was picked at that moment. Nothing is substituted.

### REQ-5.5 The wisp tries only the tool it was given

1. After the hand-over, the wisp goes to the puzzle with the tool and tries it. The picture shows the tried
   tool at the obstacle (at the lock, the leaves, the boards, the rope, or under the cat on the roof).
2. The result is fixed by the rule below. It is the same every time, for the same puzzle and the same tool.

   | puzzle | the answer | with the answer (`freed`) | with any other tool (`stuck`) |
   |---|---|---|---|
   | `lock` | key | the key turns, the lock opens, the door swings open, the cat comes out and sits by the shed, a star shows | the lock stays shut, the door stays shut, the cat stays inside |
   | `leaves` | broom | the leaves are swept away, the door swings open, the cat comes out, a star shows | the leaves are still there, the door stays shut, the cat stays inside |
   | `boards` | hammer | the boards come off, the door swings open, the cat comes out, a star shows | the boards are still on, the door stays shut, the cat stays inside |
   | `rope` | scissors | the rope is cut, the door swings open, the cat comes out, a star shows | the rope is still tied, the door stays shut, the cat stays inside |
   | `roof` | ladder | the ladder brings the cat down; it sits by the shed, a star shows | the cat is still on the roof |

3. The tried tool, the picture, the result and the message always agree: the message names the tool the
   wisp tried, in the child's language.
4. A wrong tool is never corrected to the answer, and a tool the child did not hand over is never taken
   out. No other solution exists: the hammer does not break a lock, scissors do not cut a board, and
   nothing else solves a puzzle.
5. Nothing is broken, nothing is hurt, and the cat is never shown afraid or in danger. The stuck result
   shows the same puzzle and the cat, calmly.
6. Freed and stuck are told apart by shapes and positions (the obstacle there or gone, the door open or
   shut, the cat outside, inside or on the roof, the star present or not) and by the words, not by color or
   motion alone.
7. The logical result is decided at once by the reducer. It never waits for an animation, a timer or a
   drawing to finish.

### REQ-5.6 Try again, any number of times

1. After a stuck result, the message says which tool the wisp used and what is still there ("The door stayed
   shut", "The leaves are still there"; a plain observation), and the button invites the child to try another
   tool. The words do not blame: no "wrong", "bad", "no" or "fail", no red, no cross, no threat. The fact
   that the puzzle is not solved is not hidden.
2. The retry button returns to choosing with no tool picked and no result. The puzzle, the cat and the
   round are the same.
3. The retry has no limit and no cost in tools: no tool is used up, and the answer, handed over after any
   number of other tools, always solves the puzzle. A wrong tool ends the streak (REQ-5.7.4) and the clock
   keeps running; nothing else is taken away.
4. From every state of the shed the child can reach a freed cat (no soft-lock), can reach the title (REQ-5.16),
   and, once the time is up, can start a new run.

### REQ-5.7 A 60-second time attack

1. The shed is a run of 60 seconds. The clock counts down while the shed is on screen, whatever the child is
   doing: choosing, waiting for the wisp, or reading a result. Time reaches the game only as a `Tick` with the
   milliseconds that passed, and a frame counts as at most 250 ms (REQ-4.2.2, REQ-4.2.3). The top row shows
   the whole seconds left (rounded up) and a bar that shrinks, and the score; the number says it too (hard
   rule 7).
2. The result stays on screen until the child taps the button. Nothing times out, and nothing removes the
   result or the closing line by itself. (The clock keeps running; see REQ-5.7.1.)
3. After a freed result the button says "Next puzzle" and goes on to the next round: a different puzzle
   (REQ-5.2.3), nothing picked, the clock and the score as they are. After a stuck result the button retries
   the same round (REQ-5.6.2).
4. A freed cat scores 100, plus 50 for each cat freed in a row before it, up to 4 (100, 150, 200, 250, 300,
   300, ...). A stuck result scores nothing and ends the streak. Nothing is taken away, and nothing is red,
   crossed or loud. The score is added when the tool is handed over, not when the child moves on. Picking,
   retrying, a hand-over with nothing picked and a second hand-over never score. A freed cat also pops the
   points ("+150") by the star.
5. When the clock reaches zero the run is over at once, even if the wisp is trying a tool or a result is
   showing. The shared end screen replaces the shed and shows the score, the best of the session and "New
   best!" when the run beat it (REQ-4.5.2, REQ-4.5.3). It has two buttons: play again, which begins a new run
   of the shed (REQ-5.1.2: round 0, a new order, a full clock, a score of 0; only the best carries over), and
   back to the title (REQ-5.16.2). The end screen ignores taps for 0.8 seconds (REQ-4.5.5). The best score
   lives for the session only.
6. Trial 1's run is neither used nor changed by the shed, and the shed never changes trial 1's lane
   (REQ-5.9).

### REQ-5.8 The freed result looks back

1. The freed result shows a message that names the tool the child handed over ("The cat is out! The wisp used
   the scissors").
2. On the freed result the screen also shows a closing line, a separate text for this puzzle, that looks
   back at the child's action: handing over that tool let the wisp solve it ("You gave the key / It opened
   the door"; "You gave the broom / It swept the leaves away"; and so on for the five puzzles). The
   wording is chosen in `design.md` after the kid-reader review.
3. The closing line is shown only on the freed result. It is not shown while choosing or on a stuck result.
   It stays until the child taps the button; no timer removes it.
4. It is not joined to the message. The result, the picture, the tools and the button stay visible, and
   no text gets smaller to make room.
5. The line says only what happened in this shed. It does not say that a real AI can do anything it
   has the right tool for, that a tool always works, that AI knows everything, or that it is a
   friend or family (`docs/learning-design.md`, "What we do not teach"). The shed's key is part of the
   game; the words never tell a child to give a real house key, a password or any private thing to an
   AI. L4 is not explained here.
6. Why each puzzle has exactly one answer (the rule is a fixed staging device so that the child can feel
   "what it was given decides what it can do", not a claim about real AI) is written in `design.md`.

### REQ-5.9 Trial 1 and trial 2 stay apart

1. Entering the shed does not start trial 1 and leaves `lane` as it was on the title. The shed's run
   replaces the clock and score of the title, which are the full clock and a score of 0 (the best carries over).
2. The scene shown follows `trial`: 1 is the lane, 2 is the shed. A state with `trial` 2 never shows the
   lane scene.
3. In trial 2 the trial 1 events (`Ask`, `PickCard`, `Retry`) return the same state. In trial 1, on the
   title and on trial 1's end screen the shed events (`PickTool`, `GiveTool`, `RetryShed`, `LeaveShed`) return
   the same state, and `StartShed` works from the title and from the shed's own end screen only.
4. `Start` in the shed sets the language only. `SetLang` changes the language only and never changes the
   pick, the tried tool or the result. `MoveHeroTo` moves the hero only.
5. The selection and the result are one value, not two copies: the tried tool is the pick, locked.
6. Trial 1's behaviour, texts, layout and tests are unchanged by this spec.

### REQ-5.10 Portrait, one finger, mouse

1. The shed plays on the existing 390 x 844 portrait canvas.
2. Every action is one tap or click on an object of at least 80 x 80 game pixels: the title's shed
   button, each tool, the wisp, the result button, the button back to the title, and the end screen's
   buttons. There is no drag, hold, double tap or second finger.
3. The hero's floor drag still moves the hero in the shed. A press that starts on a tool, the wisp or a
   button does not move the hero; a press on the floor does.
4. Texts and pictures do not overlap each other or hide the result, the tools or the button, in every
   stage (choosing, freed, stuck), in both languages, with every tool name inserted. The top row, the
   guide and the picture are stacked in that order from the top.

### REQ-5.11 Drawn in code, no network

1. The shed, its five puzzles, the cat, the five tools and the star are drawn in code at the device pixel
   ratio, with the existing look (REQ-4.9 to REQ-4.11). No image file is added and no third-party art
   is used (hard rule 5).
2. The shed needs no network request after the page and its bundled font have loaded, in Japanese and
   in English (hard rule 4). A full play of a stuck result, a retry, a freed cat and the way back works with
   the network switched off.
3. Motion never carries the only meaning, never flashes faster than 3 times a second, and can be
   ignored without losing information.

### REQ-5.12 Japanese and English, and text in content

1. The guides, the tool names, the messages, the button labels, the title's shed label and caption, and the
   closing lines are all in `src/content/strings.ja.json` and `strings.en.json`, under the same keys. No
   child-facing literal appears in `src/game/` or `src/domain/`.
2. Japanese follows hard rule 2 through `npm run kid`: no kanji, no Latin letters, at most 12
   characters a line and 2 lines, also after a tool name is inserted. English messages are at most 2
   short lines of at most 26 characters, also after a tool name is inserted.
3. A message that takes a tool name takes exactly one and keeps no unreplaced placeholder.
4. The language is the existing one (`?lang=ja|en`, else the browser language, else English). `SetLang`
   can change it at any time; the tool names and the result change language and nothing else changes.
5. `npm run kid` and `npm run font` pass after the strings change; the subset font covers every
   character.

### REQ-5.13 Pure rules, checked several ways

1. The picks, the hand-over, the result, the order of the puzzles, the score, the clock and the way back are
   rules of the pure reducer (ADR 0001). `src/domain` uses no Phaser, DOM, clock or randomness (the seed is
   an event field), and the result depends on no language or animation timing.
2. Each of INV-15 to INV-24 (as they apply to the shed) and INV-40 to INV-43 has a property test over the
   real reducer with `checkProperty`, and the generators play the shed for real: every tool, a pick replaced,
   a retry after each result, several rounds with the right tool, a run that times out, play again from the
   end screen, and the way back. INV-3 and INV-4 also run over sequences that contain the new events.
3. Unit tests cover: the five tools and puzzles and their answers, the order for several seeds, nothing
   picked, a pick replaced, a pick that does not use the tool, an explicit hand-over, a hand-over with
   nothing picked, locks and a second hand-over while a result shows, a retry after each result (same round
   after stuck, next round after freed), the clock, the score and the streak, time up, play again, the way
   back from a run and from the end screen. They check that the tried tool and the picture and the message
   agree for every puzzle, that the closing line shows only on the freed result, ja/en, same keys,
   placeholders, and lengths with every tool name.
4. A model check over the real reducer (`shed.model.test.ts`) covers the entrance from the title and the
   shed after it, with a finite alphabet that includes seeds, invalid trial 1 events, `Tick`, `Start` and
   language changes. It checks: no state with two tools or with a swapped tool, a wrong score, or a clock out
   of range; a freed cat with each tool and a stuck result with each tool are reachable; a stuck result goes
   back to the same puzzle; from every reachable state a freed cat, the title and the end screen are
   reachable; with the clock and the way back taken out of the alphabet a fresh choosing, the next round and
   a second freed cat are still reachable. It records the number of states and the counterexamples of
   deliberate breaks. It does not require a path from every state of trial 1 to the shed, and it does not drop
   any shed state to pass.
5. Mutation testing finds no surviving mutant in the unit-tested code.

### REQ-5.14 The real taps and the real screen

1. The mobile smoke enters the shed from the title with a real tap (not `dispatch`) and plays: nothing
   picked and a tap on the wisp (nothing is used); a pick replaced; a wrong tool, the result, the lock while
   it shows, the retry; the answer, the message, the closing line and the score; the next puzzle; all five
   puzzles and their answers across the tests; time up and play again; the button back to the title, in a run
   and on the end screen. `window.__game` is used to read the state, never to do what a tap can do. The order
   of the puzzles is chosen by setting the seed the game draws (`Math.random` is replaced in the page), so
   the test plays a known puzzle with real taps.
2. The smoke checks the screen, not only the state: the obstacle there or gone, the door open or shut, the
   cat inside, on the roof or outside, the tool names, the closing line, the clock and the score are seen in
   the pixels. A state that says `freed` with the obstacle still drawn, or no closing line, fails.
3. Japanese and English screens for choosing, stuck and freed are looked at in screenshots. The desktop
   smoke plays the shed with the mouse and checks that a held press on a tool does not move the hero.
   Offline after the first load, in both languages, a stuck result, a retry, a freed cat and the way back
   still work.
4. Trial 1's and trial 3's mobile and desktop smoke still pass. The title's shed button does not start
   trial 1, and a tap elsewhere on the title still does.

### REQ-5.15 No gate gets weaker, and what is verified is said

1. No threshold, config, check script, workflow or existing test is loosened, deleted or relaxed to
   pass. Where this revision forces an old expectation to change, `tasks.md` names the old test and
   the new one, and why trial 1's guarantee is not weaker.
2. `npm run check` passes in every task. Tasks that connect input to the screen also pass
   `npm run build` followed by `npm run smoke`.
3. The smoke targets mobile WebKit and desktop Chromium. Where WebKit cannot start in the authoring
   sandbox, the result says that the mobile smoke ran on Chromium with the iPhone 13 touch profile,
   and CI's WebKit run is what counts. The work is not called done before CI's smoke is green. A
   Playwright run is never called a check on a real phone. A test, hook or agent that was not run is
   not reported as run.

### REQ-5.16 The way back to the title

As a 6-year-old (or the parent beside them), I want to go back to the title from the shed, so that I am
never stuck in it.

1. The shed screen has a button back to the title, always on screen, in a run and while a result shows. It
   has a picture-free label ("Title"), is at least 80 x 80 game pixels, and sits at the end of the lower row of
   tools.
2. The shared end screen of a shed run has a second button, back to the title, under play again. Trial 1's
   end screen is unchanged and has no such button.
3. Going back to the title drops the shed and the run in progress: `phase` `title`, `trial` 0, the shed
   initial, a full clock and a score of 0. It keeps the language, the hero and the best score of the session.
   It never counts as a finished run, so a run that was left does not set the best.
4. The title the child lands on ignores taps for a short moment, so a quick second tap does not start
   trial 1 (as for the field, REQ-6.7.4). From the title, the shed opens again with its button, trial 1 with a
   tap elsewhere, and the field with its button.
5. `LeaveShed` does nothing outside trial 2 (on the title, in trial 1, in trial 3).

## Invariants

Rules from `.kiro/steering/domain-invariants.md` apply: ids are never reused or renumbered, each new
invariant gets a property test in the same pull request, and only rules a child depends on are listed.
Ids 6, 7 and 25 are retired; 1 to 5, 8 to 24 and 26 to 39 are in use at the start of this revision.

### Reworded (ids and ideas kept)

| id | invariant | child depends on |
|---|---|---|
| INV-15 | Inside a run the clock only runs down and stays between 0 and 60 seconds. Only a `Start`, a `StartShed` or a `LeaveShed` (from the title or an end screen, or out of the shed) sets it back to 60 seconds. | the clock is honest |
| INV-16 | Inside a run the score never goes down, and it goes up only on an `Ask` that brings the wish (trial 1) or a `GiveTool` that frees the cat (trial 2). | points are for finds |
| INV-17 | In a trial the clock is above zero and on the end screen it is zero. The end screen of trial 1 changes only on `Start`, `SetLang` and `MoveHeroTo`; the shed's also takes `StartShed` and `LeaveShed`. | time up ends it |
| INV-18 | Picking a tool only picks it: `PickTool` leaves the shed choosing, in the same round, with exactly that one tool picked, and a later pick replaces the earlier one. A tool is tried only by `GiveTool` with a tool picked, and `GiveTool` with none picked returns the same state. | one tool at a time; picking does not use it |
| INV-19 | The tool tried is the tool picked at the hand-over. It is never changed, corrected or taken from somewhere else. | the wisp uses what I gave |
| INV-20 | A tool frees the cat only when it is the answer to this round's puzzle: a tried answer is `freed`, any other tool is `stuck`, and each puzzle has exactly one answer. | a fixed, learnable rule per puzzle |
| INV-21 | Once a tool is tried, every event except `RetryShed` (and `LeaveShed`) leaves the shed equal. The result and the tried tool stay until the retry. | the result does not change by itself |
| INV-22 | `RetryShed` after a try returns to choosing with no tool picked, in the same round after a `stuck` result and in the next round after a `freed` one, and changes nothing else. Before a try it returns the same state. | try again, any number of times; go on |
| INV-23 | Shed events return the same state outside a run of trial 2, and inside one change only `shed` (`GiveTool` also scores, so it changes `run` too). `shed` is the initial shed whenever `trial` is not 2. | trial 1 cannot be broken from the shed |
| INV-24 | In trial 2 the trial 1 events `Ask`, `PickCard` and `Retry` return the same state, so the lane stays initial. | the lane stays out of the shed |

### New

| id | invariant | child depends on |
|---|---|---|
| INV-40 | A hand-over scores once: `GiveTool` with a tool picked adds the points for the streak and extends it when the cat is freed, and ends the streak and adds nothing when it is not. No other event moves the score or the streak, but a new run or the way back to the title. | points are fair |
| INV-41 | The puzzle of a round is `puzzleAt(seed, round)`. The seed holds for the whole run, the round grows only by 1 and only by `RetryShed` after a freed cat, and no puzzle repeats the one before it. | a new puzzle each time; the same one until it is solved |
| INV-42 | `LeaveShed` from a run or the end screen of trial 2 goes to the title (`phase` `title`, `trial` 0, the shed initial, the run restarted with only `best` kept) and changes nothing else. Anywhere else it returns the same state. | I can always go back |
| INV-43 | `StartShed` from the title or the end screen of trial 2 begins a run: `phase` `trial`, `trial` 2, round 0 of the seed, a full clock, a score of 0, `best` kept. Anywhere else it returns the same state. | a new run is a fresh one |

INV-32 (trial 3) now says the run keeps its title values in the field: a full clock and no score, with `best`
carried over from a run of the shed. INV-1 to INV-5 and INV-8 to INV-14 keep their text and their tests.
`.kiro/steering/domain-invariants.md` gets a note on this revision, the reworded rows and the four new ones.

## Verification summary

| layer | what | requirement |
|---|---|---|
| unit (`shed.test.ts`, `reducer.test.ts`) | the rules and the events of the shed, the order of the puzzles, the clock, the score, the way back | REQ-5.2 to 5.9, 5.16 |
| property (`shed.pbt.test.ts`) | INV-3 and INV-4 with the shed events, INV-15 to INV-24 for the shed, INV-40 to INV-43 | REQ-5.9, 5.13 |
| model (`shed.model.test.ts`) | states, invariants, goals, the deliberate breaks | REQ-5.6, 5.13, 5.16 |
| content (`shed-content.test.ts`) | keys, placeholders, Japanese rules, lengths, no blame, no claims | REQ-5.6, 5.8, 5.12 |
| view and layout (`shed-view.test.ts`, `shed-layout.test.ts`, `over-view.test.ts`, `title-view.test.ts`, `route.test.ts`) | what each stage shows, no overlap, targets of 80 or more, the end screen's buttons, scene choice | REQ-5.1 to 5.10, 5.16 |
| mutation (`npm run mutation`) | no surviving mutant | REQ-5.13, 5.15 |
| mobile and desktop smoke | real taps, pixels, screenshots, offline, the way back | REQ-5.1 to 5.14, 5.16 |
