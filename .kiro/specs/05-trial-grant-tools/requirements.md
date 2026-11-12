# Requirements: Trial 2, The Locked Shed ("hand over the tools")

> **Scope note: a third trial now exists ([`06-trial-verify-stars`](../06-trial-verify-stars/requirements.md)).**
> "Trials 3 to 6 stay out" and "no way back from the shed" below describe this spec's scope. Trial 3 (The Wisp
> Field) is added by `06`, which also moves the title's wisp and hero up and puts its button above the shed button;
> the shed button and everything below are unchanged. Nothing in the text below is changed.

Spec `05-trial-grant-tools`. Teaches learning goal L2 (`docs/learning-design.md`): a helper can only act
with the tools it is given, so hand over the one it needs. Requirement ids are `REQ-5.n`. `REQ-4.n`
belongs to `04-score-attack`, `REQ-3.n` to `03-trial-tell-vague-request`, `REQ-2.n` to `02-trial-tell`
and `REQ-1.n` to the missing `01-core-loop`; none is reused.

This adds a second trial on top of the existing base. It does not rebuild trial 1: trial 1 (The Dark
Lane) keeps its one-request flow, results, retry, closing line, 60-second clock, score and end screen.

## Why

`docs/learning-design.md` lists trial 2 as "Give one tool (key, broom or hammer) to let a cat out of a
locked shed. Locks and doors = permission." The child sees three tools, hands one to the wisp, and
watches the wisp try exactly that tool on the shed. Only the key opens the door. A broom or a hammer
leaves the door shut, and the child learns by trying that the wisp could do only what the tool it
was given allowed.

## Scope

In: trial 2 only, from a tap on the title to the result, the retry and the replay after a success.
Touches `src/domain`, `src/game`, `src/content`, their tests, `e2e/`, this spec, the steering
invariants file, and the smallest notes that keep other documents true.

Out: trials 3 to 6, the parent screen, judge features (no new `?trial=n` jump or judge-only entrance),
a way back from the shed to the title (see "Relation to earlier specs" and `design.md`, Decisions),
a trial-select screen or a general router, network use or measurement, saving, a service worker, sound,
a shared framework for future trials, new dependencies. No change to `vite.config.ts`,
`stryker.config.json`, `package.json`, `scripts/check-*` or `.github/`. L3 and L4 content, and any
"too much power causes an accident" scene (the second half of L2 in the learning table), are not
added here.

## Relation to earlier specs

Earlier specs say "trial 1 only" and "from the title tap to trial 1". Those sentences were true of
their scope, not a ban on a second trial. Nothing is silently replaced: the table shows what trial 2
inherits, what stays trial 1 only, what is new, and the few places where adding trial 2 changes a
shared entrance or event. The earlier specs keep their text and gain one pointer note each.

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

### Trial 1 only (kept as written; trial 2 does not use them)

| old | what | in trial 2 |
|---|---|---|
| REQ-2.1 to REQ-2.8 | pick color and object cards, tap the wisp, the brought item, retry | not used. The shed has its own flow (REQ-5.3 to 5.7) |
| REQ-3.1 to REQ-3.5 | one card is a request, what the wisp brings, the closing line of trial 1 | not used. The shed has its own closing line (REQ-5.8) |
| REQ-4.1 to REQ-4.8 | the 60-second run, the clock, the score, the wishes, time up, play again, the top row | no clock, no score, no streak, no time up in the shed (REQ-5.7) |
| INV-5, INV-8 to INV-17 | trial 1's lane and run | still hold for every sequence, including the shed events; INV-24 says the shed cannot touch the lane or the run |

### New in trial 2

REQ-5.1 to REQ-5.8 (the play), REQ-5.9 (the separation), and the checks in REQ-5.13 and REQ-5.14. New
invariants INV-18 to INV-24.

### Changes to a shared entrance or event

Each row names the old requirement, what the code does today, and the new requirement. The old text is
not edited.

| old requirement | the code today | change | new |
|---|---|---|---|
| REQ-2.1.1 "when the child taps the title screen, the game shows The Dark Lane"; REQ-4.1.1 "starts a run when the child taps the title screen" | `TitleScene` starts on any pointer-down; `Start` makes `phase` `trial` and `trial` 1 | A tap on the title still starts trial 1, except a tap on the new shed button. The scene starts only when the press hit no object | REQ-5.1.2, 5.1.3, 5.9.1 |
| REQ-2.1.3 "no screen other than the title and this trial exists" | scenes: title, lane, over | one more scene, the shed, reached only from the title | REQ-5.1 |
| `TitleScene` sends `phase` `trial` to the lane scene | `render` calls `scene.start("lane")` | the scene is chosen by `trial`: 1 is the lane, 2 is the shed | REQ-5.9.2 |
| `Ask`, `PickCard`, `Retry` (trial 1 events) | applied whenever `phase` is `trial` | applied only when `trial` is 1; in trial 2 they return the same state | REQ-5.9.3, INV-24 |
| `Tick` (REQ-4.2.2) | applied whenever `phase` is `trial` | applied only when `trial` is 1; the shed has no clock | REQ-5.7.1, INV-24 |
| `Start` while a trial runs (design of 02: "a second `Start` changes only the language") | sets the language only | unchanged, and now also true in trial 2: it never leaves the shed or starts a run | REQ-5.9.4 |
| REQ-4.6.2 "from every state the child can reach a new run (no soft-lock)" | the end screen and the lane both lead to a new run | still true for every state of trial 1. In the shed there is no run, and no exit to the title in this spec: the child plays the shed again with the retry button, and a page reload returns to the title | REQ-5.6.4, Decisions in `design.md` |
| 02 scope "Out: trials 2 to 6"; 04 scope "trial 1 as the only game" | text of the earlier specs | trial 2 is in scope of this spec only. Trials 3 to 6 stay out | Scope above |
| INV-1, INV-2 | `phase` and `trial` bounds | unchanged and global; `trial` may now be 2 | INV-1, INV-2 |
| INV-15 to INV-17 | the clock and the score of "a run" | unchanged. The shed is not a run: `run` stays at its initial value there (INV-24) | INV-24 |
| trial 1 model check "a trial is trial 1" | alphabet has no shed event | unchanged and kept. Its state space is trial 1 only; the shed has its own model check | REQ-5.13.4 |
| `e2e/helpers.ts` `GameState` type | no `shed` field | gains the `shed` field | REQ-5.14 |

## Glossary

- **Shed**: the locked wooden shed in the picture. It has a door with a lock and a window. It holds a
  cat. It is the same shed every time: there is no list of tasks.
- **Tool**: one of three picture cards, `key`, `broom`, `hammer`. Each has a short label and its own
  silhouette.
- **Pick**: the tool currently chosen, or none. Picking is not handing over.
- **Hand over** (also "give"): the child taps the wisp while a tool is picked. This is the only way a tool
  is used.
- **Tried tool**: the tool the wisp tried on the shed. It is the picked tool at the moment of handing
  over, and it cannot change until the retry.
- **Result**: `open` (the key: the door opens and the cat comes out) or `shut` (the broom or the
  hammer: the door stays shut and the cat stays inside).
- **Closing line**: a short sentence, shown on the open result only, that looks back at what the child
  did: they handed over the key, and the wisp could open the door.

## Requirements

### REQ-5.1 Enter the shed with a tap

As a 6-year-old, I want to open the cat's shed from the title with my finger, so that I can play it
without a grown-up.

1. The title screen shows one extra tap target for trial 2: a button with a picture and a short label,
   in the child's language, at least 80 x 80 game pixels. Its picture shows the key and says it is
   about the cat.
2. Tapping the button opens the shed. The state moves from `title` to `trial` with `trial` 2. No run
   starts: the clock stays 60 seconds and is not counted down, the score is 0, the lane is untouched.
3. A tap on the button never also starts trial 1. A tap on the title anywhere else starts trial 1 as
   before, and the end screen's play-again button still starts a new run (REQ-4.6).
4. The entrance is an ordinary tap on the ordinary screen. It is not a judge URL, a hidden gesture, a
   console call, or a query parameter.
5. There is no trial-select screen and no general router. The only new screen is the shed.

### REQ-5.2 What the shed shows

1. The shed screen shows: the locked shed with its door and lock, the trapped cat, the wisp, three
   tools, and a short guide text.
2. The picture and the guide say "hand over a tool to let the cat out". The guide is one short
   sentence in two lines at most, naming one tool.
3. While choosing, the door is closed and locked and the cat is inside (seen at the window). The
   picture does not change until the wisp tries a tool.

### REQ-5.3 Pick one tool

1. The three tools are shown as picture cards with a short label: key, broom, hammer. Each has its own
   outline (a key has a round bow and teeth, a broom has a handle and a wide brush, a hammer has a
   handle and a block head), so the tools are told apart without color.
2. The pick is none or one tool. Tapping a tool picks it; tapping a different tool replaces the pick;
   two tools are never picked at once.
3. The picked tool is marked by a thick frame and a tick shape, never by color alone.
4. Picking never hands the tool over and never uses it: the shed picture and the state do not change
   except for the mark.
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

1. After the hand-over, the wisp goes to the shed with the tool and tries it on the lock and the door.
   The picture shows the tried tool at the lock.
2. The result is fixed by the rule below. It is the same every time, for the same tool.

   | tool handed over | what the picture shows | result |
   |---|---|---|
   | key | the key turns in the lock, the lock opens, the door swings open, the cat comes out and sits by the shed, a star shows | `open` |
   | broom | the broom is tried at the lock; the lock stays shut, the door stays shut, the cat stays inside | `shut` |
   | hammer | the hammer is tried at the lock; the lock stays shut, the door stays shut, the cat stays inside | `shut` |

3. The tried tool, the picture, the result and the message always agree: the message names the tool the
   wisp tried, in the child's language.
4. A wrong tool is never corrected to the key, and a tool the child did not hand over is never taken
   out. No other solution exists: the hammer does not break the lock or the door, and nothing else
   opens the door.
5. Nothing is broken, nothing is hurt, and the cat is never shown afraid or in danger. The shut result
   shows the shut door and the cat inside, calmly.
6. Open and shut are told apart by shapes and positions (the door open or shut, the lock open or
   shut, the cat outside or inside, the star present or not) and by the words, not by color or motion
   alone.
7. The logical result is decided at once by the reducer. It never waits for an animation, a timer or a
   drawing to finish.

### REQ-5.6 Try again, any number of times

1. After a shut result, the message says which tool the wisp used and that the door stayed shut
   (a plain observation), and the button invites the child to try another tool. The words do not
   blame: no "wrong", "bad", "no" or "fail", no red, no cross, no threat, no penalty. The fact that the
   door did not open is not hidden.
2. The retry button returns to choosing with no tool picked and no result. The shed, the cat and the
   task are the same.
3. The retry has no limit and no cost. No tool is used up. The key can be handed over after any number
   of broom and hammer tries, and it always opens the door.
4. From every state of the shed the child can reach the open result (no soft-lock), and from the open
   result they can play the shed again.

### REQ-5.7 No clock, no score, and a result that stays

1. The shed has no 60-second clock, no score, no streak and no time up. A `Tick` changes nothing in the
   shed. Trial 1's run is neither used nor changed.
2. The result stays on screen until the child taps the button. Nothing times out, and nothing removes the
   result or the closing line by itself.
3. After the open result, the button plays the shed again from its start: no tool picked, the door
   shut, the cat inside. The key opens the door again, and so do the later tries.
4. Trial 1 events (`Ask`, `PickCard`, `Retry`) and `Tick` never change the shed, and shed events never
   change trial 1 (REQ-5.9).

### REQ-5.8 The open result looks back

1. The open result shows a message that names the tool the child handed over (the key / "key").
2. On the open result the screen also shows a closing line, a separate text, that looks back at the
   child's action: handing over the key let the wisp open the door. The wording is chosen in
   `design.md` after the kid-reader review; the directions are ja `かぎを わたしたら` / `あけられたね` and en
   `You gave a key` / `It opened the door`.
3. The closing line is shown only on the open result. It is not shown while choosing or on a shut
   result. It stays until the child taps the button; no timer removes it.
4. It is not joined to the message. The result, the picture, the tools and the button stay visible, and
   no text gets smaller to make room.
5. The line says only what happened in this shed. It does not say that a real AI can do anything it
   has the right tool for, that a tool always works, that AI knows everything, or that it is a
   friend or family (`docs/learning-design.md`, "What we do not teach"). The shed's key is part of the
   game; the words never tell a child to give a real house key, a password or any private thing to an
   AI. L4 is not explained here.
6. Why only the key opens (the rule is a fixed staging device so that the child can feel "what it was
   given decides what it can do", not a claim about real AI) is written in `design.md`.

### REQ-5.9 Trial 1 and trial 2 stay apart

1. Entering the shed does not start trial 1's run and leaves `lane` and `run` as they were on the
   title.
2. The scene shown follows `trial`: 1 is the lane, 2 is the shed. A state with `trial` 2 never shows
   the lane scene.
3. In trial 2 the trial 1 events (`Ask`, `PickCard`, `Retry`, `Tick`) return the same state. In trial 1,
   on the title and on the end screen the shed events (`PickTool`, `GiveTool`, `RetryShed`,
   `StartShed`) return the same state, except `StartShed` from the title.
4. `Start` in the shed sets the language only. `SetLang` changes the language only and never changes the
   pick, the tried tool or the result. `MoveHeroTo` moves the hero only.
5. The selection and the result are one value, not two copies: the tried tool is the pick, locked.
6. Trial 1's behaviour, texts, layout and tests are unchanged by this spec.

### REQ-5.10 Portrait, one finger, mouse

1. The shed plays on the existing 390 x 844 portrait canvas.
2. Every action is one tap or click on an object of at least 80 x 80 game pixels: the title's shed
   button, each tool, the wisp, and the result button. There is no drag, hold, double tap or second
   finger.
3. The hero's floor drag still moves the hero in the shed. A press that starts on a tool, the wisp or a
   button does not move the hero; a press on the floor does.
4. Texts and pictures do not overlap each other or hide the result, the tools or the button, in every
   stage (choosing, open, shut), in both languages, with every tool name inserted.

### REQ-5.11 Drawn in code, no network

1. The shed, the cat, the lock, the three tools and the star are drawn in code at the device pixel
   ratio, with the existing look (REQ-4.9 to REQ-4.11). No image file is added and no third-party art
   is used (hard rule 5).
2. The shed needs no network request after the page and its bundled font have loaded, in Japanese and
   in English (hard rule 4). A full play of shut, retry and open works with the network switched off.
3. Motion never carries the only meaning, never flashes faster than 3 times a second, and can be
   ignored without losing information.

### REQ-5.12 Japanese and English, and text in content

1. The guide, the tool names, the messages, the button labels, the title's shed label and the closing
   line are all in `src/content/strings.ja.json` and `strings.en.json`, under the same keys. No
   child-facing literal appears in `src/game/` or `src/domain/`.
2. Japanese follows hard rule 2 through `npm run kid`: no kanji, no Latin letters, at most 12
   characters a line and 2 lines, also after a tool name is inserted. English messages are at most 2
   short lines.
3. A message that takes a tool name takes exactly one and keeps no unreplaced placeholder.
4. The language is the existing one (`?lang=ja|en`, else the browser language, else English). `SetLang`
   can change it at any time; the tool names and the result change language and nothing else changes.
5. `npm run kid` and `npm run font` pass after the strings change; the subset font covers every
   character.

### REQ-5.13 Pure rules, checked several ways

1. The picks, the hand-over, the result and the retry are rules of the pure reducer (ADR 0001). `src/domain`
   uses no Phaser, DOM, clock or randomness, and the result depends on no language or animation timing.
2. Each of INV-18 to INV-24 (below) has a property test over the real reducer with `checkProperty`, and
   the generators hand tools over for real (every tool, a pick replaced, a retry after each result, a
   replay after a success). INV-3 and INV-4 also run over sequences that contain the new events.
3. Unit tests cover: nothing picked, each of the three tools, a pick replaced, a pick that does not use
   the tool, an explicit hand-over, a hand-over with nothing picked, locks and a second hand-over
   while a result shows, a retry after each result, and a replay after a success. They check that only
   the key opens, that the tried tool and the picture and the message agree, that the closing line shows
   only on the open result, ja/en, same keys, placeholders, and lengths with every tool name.
4. A model check over the real reducer (`shed.model.test.ts`) covers the entrance from the title and
   the shed after it, with a finite alphabet that includes invalid trial 1 events, `Tick`, `Start`
   and language changes. It checks: no state with two tools or with a swapped tool, a broom result,
   a hammer result and a key result are reachable, a shut result goes back to the same shed's choosing,
   from every reachable state the key's open result is reachable, and also after a success. It
   records the number of states and the counterexamples of deliberate breaks. It does not require a
   path from every state of trial 1 to the shed, and it does not drop any shed state to pass.
5. Mutation testing finds no surviving mutant in the unit-tested code.

### REQ-5.14 The real taps and the real screen

1. The mobile smoke enters the shed from the title with a real tap (not `dispatch`) and plays: no tool
   and a tap on the wisp (nothing is used); broom, hand over, the door stays shut, retry, key, the door
   opens, the message names the key, the closing line shows; hammer, hand over, shut, retry, key,
   open, the closing line; a pick replaced by another; the lock while a result shows; and a replay after
   the success. `window.__game` is used to read the state, never to do what a tap can do.
2. The smoke checks the screen, not only the state: the door open or shut, the cat inside or outside,
   the tool names and the closing line are seen in the pixels. A state that says `open` with a shut door
   or no closing line fails.
3. Japanese and English screens for choosing, shut and open are looked at in screenshots. The desktop
   smoke plays the shed with the mouse and checks that a held press on a tool does not move the hero.
   Offline after the first load, in both languages, shut, retry and open still work.
4. Trial 1's mobile and desktop smoke, including the score attack, still pass. The title's shed button
   does not start trial 1, and a tap elsewhere on the title still does.

### REQ-5.15 No gate gets weaker, and what is verified is said

1. No threshold, config, check script, workflow or existing test is loosened, deleted or relaxed to
   pass. Where adding trial 2 forces an old expectation to change, `tasks.md` names the old test and
   the new one, and why trial 1's guarantee is not weaker.
2. `npm run check` passes in every task. Tasks that connect input to the screen also pass
   `npm run build` followed by `npm run smoke`.
3. The smoke targets mobile WebKit and desktop Chromium. Where WebKit cannot start in the authoring
   sandbox, the result says that the mobile smoke ran on Chromium with the iPhone 13 touch profile,
   and CI's WebKit run is what counts. The work is not called done before CI's smoke is green. A
   Playwright run is never called a check on a real phone. A test, hook or agent that was not run is
   not reported as run.

## Invariants

Rules from `.kiro/steering/domain-invariants.md` apply: ids are never reused or renumbered, each new
invariant gets a property test in the same pull request, and only rules a child depends on are listed.
Ids 6 and 7 are retired; 1 to 17 are in use at the start of this spec.

### New

| id | invariant | child depends on |
|---|---|---|
| INV-18 | Picking a tool only picks it: `PickTool` leaves the shed choosing with exactly that one tool picked, and a later pick replaces the earlier one. A tool is tried only by `GiveTool` with a tool picked, and `GiveTool` with none picked returns the same state. | one tool at a time; picking does not use it |
| INV-19 | The tool tried is the tool picked at the hand-over. It is never changed, corrected or taken from somewhere else. | the wisp uses what I gave |
| INV-20 | Only the key opens the door: a tried key is `open`, a tried broom or hammer is `shut`. | a fixed, learnable rule |
| INV-21 | Once a tool is tried, every event except `RetryShed` leaves the shed equal. The result and the tried tool stay until the retry. | the result does not change by itself |
| INV-22 | `RetryShed` after a try returns to choosing with no tool picked and changes nothing else in the state (phase, trial 2, language, hero, lane, run). Before a try it returns the same state. | try again, any number of times, same shed |
| INV-23 | Shed events (`PickTool`, `GiveTool`, `RetryShed`) return the same state outside trial 2, and in trial 2 change only `shed`. `shed` is the initial shed whenever `trial` is not 2. | trial 1 cannot be broken from the shed |
| INV-24 | In trial 2 the trial 1 events `Ask`, `PickCard`, `Retry` and `Tick` return the same state, so the lane and the run stay at their initial values: no clock, no score. | no clock or score in the shed |

### Changed or retired

None. INV-1 to INV-5 and INV-8 to INV-17 keep their text and their tests. They describe the state and
trial 1's lane and run; they hold when the shed events are in the sequences (INV-1 to INV-4 are
re-run with the shed events too), and INV-23 and INV-24 are what stops the shed from reaching the
lane and the run. `.kiro/steering/domain-invariants.md` gets a note on this scope and the seven new rows.

## Verification summary

| layer | what | requirement |
|---|---|---|
| unit (`shed.test.ts`, `reducer.test.ts`) | the rules and the events of the shed | REQ-5.3 to 5.9 |
| property (`shed.pbt.test.ts`) | INV-3 and INV-4 with the shed events, INV-18 to INV-24 | REQ-5.9, 5.13 |
| model (`shed.model.test.ts`) | states, invariants, goals, the deliberate breaks | REQ-5.6, 5.13 |
| content (`shed-content.test.ts`) | keys, placeholders, Japanese rules, lengths, no blame, no claims | REQ-5.6, 5.8, 5.12 |
| view and layout (`shed-view.test.ts`, `shed-layout.test.ts`, `route.test.ts`) | what each stage shows, no overlap, targets of 80 or more, scene choice | REQ-5.1 to 5.10 |
| mutation (`npm run mutation`) | no surviving mutant | REQ-5.13, 5.15 |
| mobile and desktop smoke | real taps, pixels, screenshots, offline | REQ-5.1 to 5.14 |
