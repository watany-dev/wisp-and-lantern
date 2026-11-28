# Requirements: Trial 6, The Hollow Crown ("use it all")

Spec `09-trial-hollow-crown`. The last of the six trials. It teaches no new lesson: it puts L1 to L5
(`docs/learning-design.md`) together into one chain of steps, the way a real job with a helper goes. Requirement ids are
`REQ-9.n`. `REQ-8.n` belongs to `08-trial-tell-whats-wrong`, `REQ-7.n` to `07-trial-keep-secrets`, `REQ-6.n` to
`06-trial-verify-stars`, `REQ-5.n` to `05-trial-grant-tools`, `REQ-4.n` to `04-score-attack`, `REQ-3.n` to
`03-trial-tell-vague-request`, `REQ-2.n` to `02-trial-tell` and `REQ-1.n` to the missing `01-core-loop`; none is reused.

This adds a sixth trial on top of the existing base. It does not rebuild trials 1 to 5: the lane, the shed, the field,
the shadows and the lantern keep their flows, clocks, scores and end screens. Unlike trials 1 to 5, trial 6 is not a
60-second time attack. It has no clock and no score; it is cleared once, when the third lamp of the town is lit, and
its clear screen offers "Play again" and keeps the "Title" button, like the other trials' end screens.

## Why

`docs/learning-design.md` describes trial 6 as "Chain tell → grant → act → verify → fix three times; a skipped step
does not work. The chain relights the town." Its Teaches column says L1–L4, written before L5 existed. This spec fills
the row and makes it L1–L5.

The town's three lamps are dark: the crown of lamps on the town's hill is hollow. For each lamp the child has a wish (a
lamp with a roof and a light) and goes through five steps with the wisp:

1. **Tell** (L1): pick a card for the roof and a card for the light, then tell the wisp. With only one of the two, the
   wisp asks for the other and waits.
2. **Give** (L2, L4): the parts are in the shed, and something blocks its door (leaves, boards or a rope). Three things
   are in front of the child: the tool that clears it, a tool for another job, and a secret (a house key, an address
   or a password). The child gives one. A secret is not a tool and is to be kept; it does not move the chain on.
3. **Go** (the helper does nothing until asked): the child asks the wisp to go. The wisp tries exactly the tool it was
   given. The right one opens the shed and the wisp makes the lamp; another one leaves the door blocked, and the child
   gives again.
4. **Check** (L3): the wisp made what it was told but got one part different, by a slip. The child compares the lamp
   with the wish and says "same" or "not the same". A lamp is accepted only when it is the same.
5. **Fix** (L5): the child taps the part that is different (where) and picks the look it should be (how). The wisp
   changes only that part, and the child checks again. There is no way to ask for the whole lamp again.

When the check says "same" on a lamp that is the wish, the lamp is lit and one lamp of the town comes on. After the
third, the town is bright again: the trial is cleared.

The point is the chain, not any one step. Each step is one the child has done in an earlier trial; here they follow
each other, each needs the one before, and none can be skipped. The wisp is a helper that does what it is told and
sometimes slips. It is never a liar, an enemy or a fool, and nothing is dark, scary or threatening: the dark lamps are
a town at night waiting to be lit, not a danger.

## Scope

In: trial 6 only, from a tap on the title to the clear screen, the replay and the way back to the title. Touches
`src/domain`, `src/game`, `src/content`, their tests, `e2e/`, this spec, the steering invariants and product files, and
the smallest notes that keep other documents true (the learning design's trial 6 row, the changelog, the checklists,
the evidence). The title gains a fifth button between trial 1's card and the art, and its name and card move up and
shrink to make room (REQ-9.1). The end screen of trials 1 to 5 is not used by trial 6.

Out: a seventh trial; the parent screen (`parents.*.json` keeps its empty list); judge features (no `?trial=n` jump,
no `?judge=1` change, no judge-only entrance); a trial-select screen or a general router; network use or measurement;
saving; a service worker; sound; a clock or score in trial 6; new dependencies; new image files. No change to
`vite.config.ts`, `stryker.config.json`, `package.json`, `scripts/check-*` or `.github/`. Teaching how to prompt a real
AI, or claiming that a real helper works in exactly these five steps, always slips in one part, or refuses a secret,
is not in scope: the lamps, the shed and the five steps are a staging device (REQ-9.8.5).

## Relation to earlier specs

Earlier specs say "trial 6 is out" (08). That sentence was true of its scope, not a ban on a sixth trial. Nothing is
silently replaced; spec 08 gains one pointer note at the top of its requirements (and its `jp/` copy), as 08 did for 07.

### Inherited (applies to trial 6 as it is)

| old | what | now |
|---|---|---|
| REQ-2.9 | Japanese and English, `?lang=`, then the browser language; a language change never changes progress | REQ-9.14 |
| REQ-2.10 and hard rule 7 | meaning is never carried by color alone | REQ-9.13.3 |
| REQ-2.11 | 390 x 844 portrait, one finger or a mouse, targets of 80 x 80 or more, the hero's floor drag | REQ-9.12 |
| REQ-2.12 and hard rule 4 | no network after the first load, art drawn in code, bundled font | REQ-9.13 |
| REQ-2.13, REQ-3.6 | text lives in `src/content`; Japanese rules for the kid text; placeholders replaced | REQ-9.14 |
| REQ-2.15, REQ-3.9, REQ-5.15, REQ-6.14, REQ-7.14, REQ-8.16, ADR 0003 | no gate gets weaker | REQ-9.17 |
| REQ-5.16, REQ-6.7.5, REQ-7.7.5, REQ-8.9.5 | a way back to the title in every stage | the same, for trial 6 (REQ-9.10.4) |
| REQ-6.9.5, REQ-7.9.5, REQ-8.11.5, REQ-8.9.6 | a new set of buttons ignores presses for 450 ms; the title ignores taps for 0.7 s after a trial sends the child back | the same (REQ-9.12.5, REQ-9.10.5) |
| REQ-4.9 to REQ-4.11, REQ-7.10.3, REQ-8.12.3 | sharp rendering, characters drawn in code, motion that never carries the only meaning and never flashes faster than 3 times a second | REQ-9.13 |
| REQ-5.4.3, REQ-6.4, REQ-7.4, REQ-8.7 (the tone) | kind words; nothing red, no cross, no shake, no sound; the fact is not hidden | REQ-9.8 |
| ADR 0001, hard rule 3 | the domain is pure; time and randomness reach it only through events | REQ-9.15.1 |

### Lessons of trials 1 to 5 that trial 6 combines

| lesson | where it was taught | in trial 6 |
|---|---|---|
| L1, tell it clearly | trial 1 (REQ-3.1 to REQ-3.4) | the tell step: both cards are needed (REQ-9.4). In trial 1 a one-card request is valid and the wisp chooses the missing card itself; in trial 6 the wisp asks for it instead and waits (Decisions in `design.md`) |
| L2, hand over the tools | trial 2 (REQ-5.2 to REQ-5.8) | the give and go steps: the wisp tries exactly the tool it is given, and one tool fits the job (REQ-9.5). The shed's three obstacles and their tools are reused; the lock and the key are not, so a tool is never confused with the house key |
| L4, keep secrets | trial 4 (REQ-7.2 to REQ-7.6) | a secret is among the three things in the give step, and giving it does not move the chain on (REQ-9.5.3) |
| L3, check it | trial 3 (REQ-6.2 to REQ-6.6) | the check step: "same" or "not the same", and only a lamp that is the wish is accepted (REQ-9.6) |
| L5, tell it what's wrong | trial 5 (REQ-8.4 to REQ-8.6) | the fix step: point at the part (where), pick one of two cards (how), only that part changes (REQ-9.7). Unlike trial 5 no part flickers: finding where is the check, done by the child |

### Trials 1 to 5 only (kept as written; trial 6 does not use them)

| old | what | in trial 6 |
|---|---|---|
| REQ-4.1 to REQ-4.6, REQ-5.7, REQ-6.7, REQ-7.7, REQ-8.9 | the 60-second run, the score, the streak, the end screen | not used. Trial 6 has no clock and no score; its clear screen is its own stage (REQ-9.10) |
| INV-5, INV-8 to INV-14 | trial 1's lane | still hold for every sequence, including the new events; INV-72 says trial 6 cannot touch the lane |
| INV-15 to INV-17 | the 60-second run | unchanged. Trial 6 never moves the run (INV-71), so every one of them still holds: the clock stays full in trial 6 |
| INV-18 to INV-24, INV-40 to INV-43 | trial 2's shed | unchanged; INV-72 says trial 6 and the shed cannot touch each other |
| INV-26 to INV-36, INV-38, INV-39, INV-44, INV-45 | trial 3's field | unchanged; INV-72 keeps them apart |
| INV-46 to INV-53 | trial 4's shadows | unchanged; INV-72 keeps them apart |
| INV-54 to INV-62 | trial 5's lantern | unchanged; INV-72 keeps them apart |

### Changes to a shared entrance or event

Each row names the old requirement, what the code does today, and the new requirement. The old text is not edited.

| old requirement | the code today | change | new |
|---|---|---|---|
| REQ-8.1.1 title buttons | four buttons from (195, 472) to (195, 736); the art above them; trial 1's card above the art | a fifth button, for trial 6, between trial 1's card and the art, at (195, 240). The four buttons and the art (the wisp and the hero) do not move | REQ-9.1.1 |
| title name and card (REQ-8.1.1) | the name at y 62, trial 1's card 340 x 144 at y 194 (its prompt at y 160, its rule at y 222) | the name to y 34, the card 340 x 128 at y 128 (prompt y 96, rule y 154). The pinned numbers in `lantern-layout.test.ts` ("moves the name, the card and the art up 88 pixels") change with them; every relation in the other title tests still holds | REQ-9.1.1 |
| title texts | each button has a label and the caption "How many in 60 seconds?" | the fifth button has its own caption, which says that it is three lamps and no clock (`crown.caption`) | REQ-9.1.6 |
| `sceneFor` (REQ-8.10.2) | `trial` 2 to 5 have their scenes, anything else in a trial is the lane | `trial` 6 is the crown | REQ-9.11.2 |
| `GameEvent` | has the events of trials 1 to 5 | gains `StartCrown` (with a seed), `LeaveCrown`, `SayLook`, `Tell`, `GiveItem`, `Go`, `CheckLamp`, `PointLamp`, `FixLamp`, `NextLamp` | REQ-9.11.3 |
| `GameState` | has `lane`, `run`, `shed`, `field`, `shadows`, `lantern` | gains `crown`, the initial value whenever `trial` is not 6 | REQ-9.11.1, INV-72 |
| `trials` | `lane` 1 to `lantern` 5 | gains `crown` 6 | REQ-9.11.1 |
| `Tick` (REQ-4.2.2; REQ-8.9.1) | runs the clock in every trial in `trials` | runs it in trials 1 to 5 only; in trial 6 it returns the same state | REQ-9.9.1, INV-71 |
| `Start` on an end screen | begins trial 1 and drops the other trials' state | also drops `crown` (which is already initial there) | REQ-9.11.4 |
| `TitleScene` | after a trial sends the child back, taps are ignored for 0.7 s | unchanged, and now also true after trial 6 | REQ-9.10.5 |
| `e2e/helpers.ts` `GameState` type | has `shed`, `field`, `shadows` and `lantern` | gains the `crown` field | REQ-9.16 |

## Glossary

- **Crown**: the place of trial 6, The Hollow Crown: the town at night, with its three lamps dark.
- **Town's lamps**: the three lamps at the bottom of the screen. Each comes on when one chain is done.
- **Chain**: the five steps for one lamp, from the tell to the lit lamp: tell, give, go, check, fix. The trial has
  three chains, `chain` 0, 1 and 2.
- **Part**: one of the two parts of a lamp, from the top: the **roof** and the **light**. Their looks are trial 5's: the
  roof is pointy, round or flat; the light is a candle, a star or a moon.
- **Wish**: the lamp the child wants in this chain, drawn on its own panel. It does not change during the chain.
- **Told lamp**: the looks the child picked in the tell step and told the wisp.
- **Job**: what blocks the shed's door in this chain: leaves (the broom clears them), boards (the hammer) or a rope (the
  scissors). Each job comes once in a visit.
- **Things**: the three tiles of the give step: the job's tool, the tool of another job, and a secret.
- **Secret**: a house key, an address or a password (trial 4's secrets).
- **Made lamp**: the lamp the wisp makes after the right tool: the told lamp, except one part, the **slip part**, which
  has a look that is neither the told one nor the wish's.
- **Check**: the child's "same" or "not the same" about the lamp the wisp has now.
- **Fix**: a point at a part (where) and a card (how). The two **cards** are the looks of that part that it does not
  have now.
- **Lit**: the check said "same" and the lamp is the wish. Its town lamp is on.
- **Clear**: the three lamps are lit; the trial is over and its clear screen is shown.
- **Seed**: a whole number the game draws when trial 6 opens (not the domain). The same seed always gives the same
  wishes, jobs, things and slips.

## Requirements

### REQ-9.1 Enter the crown with a tap

As a 6-year-old, I want to open the last trial from the title with my finger, so that I can play without a grown-up.

1. The title screen shows a fifth extra tap target, for trial 6: a button with a picture of a lit lamp and a short
   label in the child's language, at least 80 x 80 game pixels, between trial 1's card and the title's wisp and hero,
   clear of the card, the art and the other four buttons.
2. Tapping it opens trial 6 at the tell step of chain 0 of a new seed. The state moves from `title` to `trial` with
   `trial` 6. The run, the lane, the shed, the field, the shadows and the lantern are untouched. The game draws the
   seed (outside the domain) and sends it with the event; the domain draws nothing.
3. A tap on this button never also starts trial 1 or opens trials 2 to 5, and a tap on another button never opens the
   crown. A tap on the title anywhere else, including its middle (195, 422), starts trial 1 as before.
4. The entrance is an ordinary tap on the ordinary screen. It is not a judge URL, a hidden gesture, a console call or a
   query parameter, and it is open from the first visit: trial 6 does not wait for trials 1 to 5 to be played.
5. There is no trial-select screen and no general router. The only new screen is the crown.
6. Every sentence on the title matches the trial it sits with. The fifth button's caption says that it is three lamps
   (and not 60 seconds); its label has no number in it.

### REQ-9.2 What the screen shows

1. The screen shows, from the top: a row of the five steps (REQ-9.3), a guide, the wish on its own panel and the wisp's
   panel beside it, each with a label, a message, the step's own controls, the wisp, the town's three lamps and a
   "Title" button (REQ-9.10.4). There is no clock, no bar and no score.
2. The guide is one short instruction for the step the child is in, in two lines at most.
3. The wish and the wisp's panel are drawn the same way, at the same size, side by side, with their roofs and lights on
   the same rows, so a child compares them row by row. The wish is always drawn lit and is not a tap target.
4. The wisp's panel shows, by step: what the child has told so far (tell); the shed with its job and, after the give,
   the tool the wisp holds (give, go); the lamp the wisp has now (check, fix); the lit lamp with a tick badge (lit).
5. The wisp is on screen in every stage with its usual friendly face. It is never drawn angry, sly, scared or hurt.
6. Each of the town's three lamps is dark until its chain is lit and lit after it, told by its shape (rays and a tick
   badge on a lit lamp, an empty ring of dots on a dark one), not by brightness or color alone.

### REQ-9.3 The chain and its order

As a 6-year-old, I want to see which step I am on, so that I know what to do next.

1. A chain has five steps, always in this order: tell, give, go, check, fix. After the fix the child checks again, and
   a lamp is lit only by a check.
2. Only the step's own event moves the chain on. The events of every other step return the same state: a step cannot
   be skipped, and a step done once cannot be done again by an event of a later step.
3. The row of steps shows the five steps with a picture-free word each. The step the child is in has a solid frame; the
   steps done in this chain have a tick; the steps still to come have neither. While checking again after a fix, the
   check is the step in the solid frame and the fix has no tick.
4. Nothing goes back to the tell step inside a chain: once the wisp has been told, what it was told stays, and there is
   no way to ask for the lamp again from the start.
5. A give that does not work (another tool, REQ-9.5.5) goes back to the give step, with the told lamp kept.

### REQ-9.4 Tell (L1)

1. In the tell step there are six cards, three for the roof and three for the light, each with the picture and the word
   of a look, and a "Tell" button.
2. Pressing a card picks that look for its part; a later card of the same part replaces it. The picked card of each
   part has a frame and a tick. A pick alone never tells the wisp anything.
3. "Tell" with a card of each part tells the wisp: the chain moves to the give step with exactly the looks picked.
4. "Tell" with a part missing does not move the chain on. The wisp asks which look that part should be, in one plain
   sentence, and waits. It never chooses a look itself.
5. The cards may be any looks; the wisp is told what the child picked, the wish or not. A told look that is not the
   wish's is found in the check and changed in the fix like any other difference.

### REQ-9.5 Give and go (L2, L4)

1. In the give step the wisp's panel shows the shed with this chain's job, and three things are on screen as tiles,
   each with its picture and its word: the job's tool, the tool of another job, and a secret.
2. Pressing a tile gives that thing. Giving a tool moves the chain to the go step, with the wisp holding exactly that
   tool. The tool is not tried yet.
3. Giving a secret does not move the chain on and gives the wisp nothing it can use. The message says that the thing is
   a secret and not a tool. No time or points are lost, and the child gives again.
4. In the go step one button, "Go!", asks the wisp. The wisp does nothing in the go step until it is pressed.
5. The wisp tries exactly the tool it holds. The job's tool clears the job, and the wisp makes the lamp (REQ-9.6.1).
   Another tool leaves the job as it was, the message says which tool was used and that the job is still there, and the
   chain goes back to the give step with nothing held.
6. Which tile is in which place changes from chain to chain, so that "always the same tile" is not a way to play.

### REQ-9.6 Check (L3)

1. After the job is cleared, the wisp's panel shows the lamp the wisp made: the told lamp, with one part (the slip part)
   in a look that is neither the told one nor the wish's. So the lamp the wisp makes is never the wish.
2. In the check step two buttons ask the child: "Same" or "Not the same". Nothing on the screen marks which part is
   different: the child finds it by comparing the two panels.
3. "Not the same" on a lamp that differs from the wish moves the chain to the fix step.
4. "Same" on a lamp that is the wish lights it (REQ-9.9.2).
5. The other two answers ("same" on a lamp that differs, "not the same" on a lamp that is the wish) do not move the chain
   on and change nothing else. The message asks the child to look again and compare row by row. No time or points are
   lost and there is no limit.

### REQ-9.7 Fix (L5)

1. In the fix step each part of the wisp's lamp is a tap target of at least 80 x 80 game pixels, and nothing marks
   which part is different.
2. A tap on a part that differs from the wish points at it: the part gets a solid frame, and two cards for that part
   appear, each with the picture and word of a look: the two looks of that part that it does not have now.
3. A tap on a part that is the same as the wish's says, in one plain sentence, that this part is the same and to tap
   another. If cards were open, they close. Nothing else changes.
4. Pressing a card is the fix, once: the wisp changes the pointed part to exactly the look on the card. It never changes
   the other part, never picks another look, never corrects the card, and never makes a new lamp. The chain goes back
   to the check step, and the message says what the child said.
5. A card that is not the wish's look is not an error the game points out: the part has that look now, and the check
   finds it. The child points and tells again, without limit.

### REQ-9.8 The wisp did what it was told; it is not to blame

1. The words say what the wisp made or did and what the child said. They never say the wisp is wrong, bad, silly,
   broken or lying, never say it did anything on purpose, and never blame the child.
2. No word in the child-facing text of trial 6 is on the content test's lists of blame and fear words (trial 5's lists,
   with `ちがう` not allowed anywhere in trial 6).
3. The fact is not hidden: a check that is not right says to look again; a tool that does not fit says the job is
   still there; a secret says it is a secret.
4. The child is never told to ask again from the start. The words point to the part and the look.
5. The words never say or suggest that the helper is always right or always wrong, knows everything, is a friend or
   family, protects secrets for the child, or works like a real AI (`docs/learning-design.md`, "What we do not teach").
   The five steps, the slip and the one tool that fits are a staging device (see `design.md`), not a claim in the game.
6. Nothing is red, no cross is shown, nothing shakes and there is no sound in any step.

### REQ-9.9 The lamps, the order of the chains and the clear

As a 6-year-old, I want to light the whole town, so that I finish the last trial.

1. Trial 6 has no clock and no score. `Tick` does nothing in it; `run` is never changed by any event while `trial` is 6,
   or by entering or leaving it. The child may take as long as they like.
2. A lit lamp has the wish's looks, its panel has a tick badge, and its town lamp is on. The message says that the lamp
   is lit. A "Next" button brings the next chain at its tell step, with nothing told.
3. "Next" after the third lamp is lit clears the trial (REQ-9.10). Nothing but the three lamps clears it.
4. The wish, the job, the three things and their places, and the slip part and its look come from the seed and the chain
   number only (a fixed rule, no other randomness) and do not change during the chain. No wish repeats the one before
   it (both parts change from chain to chain), the three jobs of a visit are all different, and the slip part is not
   the same part in two chains in a row.

### REQ-9.10 The clear, play again and the way back

1. When the trial is cleared, the screen says that the town is bright again, all three town lamps are on, and a "Play
   again" button is shown. The clear stays until the child presses a button.
2. "Play again" starts a new visit of trial 6 at the tell step of chain 0 of a new seed, the town's lamps dark again.
3. There is no next trial after trial 6.
4. A "Title" button is on trial 6's screen in every stage, the clear included: 80 x 80, at the shed's place. It returns
   to the title: `phase` `title`, `trial` 0, `crown` initial. Nothing else changes (the language, the hero and the run
   stay), and from there trials 1 to 6 open as usual.
5. The title ignores taps for 0.7 s after a trial sends the child back, so a double tap on "Title" cannot start trial 1.
6. No soft-lock: from every state of trial 6 the child can reach a lit lamp, the clear and the title with the screen's
   own buttons and parts; and without the "Title" button the clear can still be reached.

### REQ-9.11 Trials stay apart

1. Entering trial 6 starts no run and leaves `lane`, `shed`, `field`, `shadows`, `lantern` and `run` as they were on the
   title. `crown` is the initial value whenever `trial` is not 6.
2. The scene shown follows `trial`: 1 is the lane, 2 the shed, 3 the field, 4 the shadows, 5 the lantern, 6 the crown.
3. In trial 6 the events of trials 1 to 5 return the same state. Outside trial 6 the crown's step events (`SayLook`,
   `Tell`, `GiveItem`, `Go`, `CheckLamp`, `PointLamp`, `FixLamp`, `NextLamp`) return the same state. `LeaveCrown` is
   accepted in trial 6 only, and `StartCrown` from the title and from trial 6's clear only.
4. `Start` in trial 6 sets the language only. `SetLang` changes the language only and never changes a step, a pick or a
   lamp. `MoveHeroTo` moves the hero only.
5. What is stored is what the child did: the wish, the job, the things and the slip are derived from the seed and the
   chain and never stored, and whether a lamp is the wish follows from its parts.
6. The behaviour, texts, layout and tests of trials 1 to 5 are unchanged by this spec, except the title's name and card
   positions and the pinned numbers that follow from them (see "Changes to a shared entrance or event").

### REQ-9.12 Portrait, one finger, mouse

1. Trial 6 plays on the existing 390 x 844 portrait canvas.
2. Every action is one tap or click on an object of at least 80 x 80 game pixels: the title's trial 6 button, the six
   cards, "Tell", the three tiles, "Go!", "Same", "Not the same", each part of the wisp's lamp in the fix step, the two
   fix cards, "Next", "Play again" and "Title". There is no drag, hold, double tap or second finger.
3. The hero's floor drag still moves the hero in trial 6. A press that starts on a part or a button does not move the
   hero; a press on the floor does.
4. Texts and pictures do not overlap each other or hide the panels, the message or a button, in every stage, with the
   row of steps, the town's lamps and the "Title" button, in both languages, with every word inserted. The controls end
   above the hero's start place.
5. A new set of buttons ignores presses for a moment (450 ms) after it appears, so a quick double tap never presses the
   next step's button by accident.

### REQ-9.13 Drawn in code, no network, no color, no sound

1. The lamps, the shed, the tools, the secrets, the cards, the frames, the badges and the row of steps are drawn in code
   at the device pixel ratio, with the existing art where it exists (trial 2's shed and tools, trial 4's secrets, trial
   5's looks). No image file is added and no third-party art is used (hard rule 5).
2. Trial 6 needs no network request after the page and its bundled font have loaded, in Japanese and in English (hard
   rule 4). A full play of three chains, the clear and the way back works with the network switched off.
3. Every state is told in a still picture and not by color alone: the solid frame and the ticks of the row of steps,
   the frame and tick of a picked card, the solid frame of a pointed part, the tick badge of a lit lamp, the rays and
   tick of a lit town lamp. On a screen with all color removed they still read.
4. Motion never carries the only meaning, never flashes faster than 3 times a second, and can be ignored.
5. The game plays no sound, and nothing needs one: the smoke checks that nothing is played.

### REQ-9.14 Japanese and English, and text in content

1. The guides, the labels, the messages, the step words, the button labels and the title's label and caption are in
   `src/content/strings.ja.json` and `strings.en.json`, under the same keys (a `crown` group). The words of the looks,
   the parts, the tools, the secrets and the jobs' messages come from the groups of trials 2, 4 and 5. No child-facing
   literal appears in `src/game/` or `src/domain/`.
2. Japanese follows hard rule 2 through `npm run kid`: hiragana and katakana only, at most 12 characters a line and 2
   lines, also after a word is inserted. English lines are at most 26 characters and 2 lines.
3. A message that takes a word takes exactly one and keeps no unreplaced placeholder.
4. The language is the existing one (`?lang=ja|en`, else the browser language, else English). `SetLang` can change it
   at any time; the words change and nothing else changes.
5. `npm run kid` and `npm run font` pass after the strings change; the subset font covers every character.

### REQ-9.15 Pure rules, checked several ways

1. The wishes, the jobs, the things, the slip, the steps and their order, the made lamp, the check, the fix, the lit
   lamps, the clear and the leave are rules of the pure reducer (ADR 0001). `src/domain` uses no Phaser, DOM, clock or
   randomness. The seed is an event field: the same seed and the same events always give the same states.
2. Each of INV-63 to INV-74 has a property test over the real reducer with `checkProperty`. The generators play whole
   chains (right and wrong cards, missing tells, every thing given, both checks, points at both parts), mix in the
   events of every other trial, ticks, language changes, play again and the leave. INV-1 to INV-4 also run over
   sequences that contain the new events. The properties about `run` judge the steps that start or end in trial 6, as
   the other trials' do since spec 08.
3. Unit tests cover: the parts and looks of a lamp, the pinned chains of several seeds, the rules (no wish repeats, the
   jobs differ, the slip part moves, the answer tile moves) for 100 seeds, each event in each stage, the made lamp for
   right and wrong tells, both checks on both kinds of lamp, the fix cards, the clear, the entry, the leave in every
   stage and nowhere else, play again from the clear and nowhere else, and that `Tick` does nothing in trial 6. For
   content and view: ja/en same keys, placeholders, lengths, no blame, fear or claims, the controls per stage, the
   marks of the row of steps, the town's lamps, the message per stage and note, and the title's fifth button.
4. A model check over the real reducer (`crown.model.test.ts`) covers the entrance from the title with two seeds and
   trial 6 after it, with a finite alphabet that includes every card, every thing, a thing that is not on screen, both
   checks, both points, every fix card, invalid events of the other trials, `Tick`, `Start` and language changes. It
   checks the state against an independent record of what the child did (the made lamp keeps what was told but one
   part; a fix changes only the pointed part; a lamp is lit only by "same" on the wish; the clear comes only after three
   lit lamps; nothing returns to the tell step inside a chain; `run` never moves), and that from every reachable state
   a lit lamp, the clear and the title are reachable (and the clear without the "Title" button). It records the number
   of states and the counterexamples of deliberate breaks, and drops no state to pass.
5. Mutation testing finds no surviving mutant in the unit-tested code.

### REQ-9.16 The real taps and the real screen

1. The mobile smoke enters trial 6 from the title with a real tap (not `dispatch`) and plays three chains through taps
   only: in the first, a "Tell" with one card (the wisp asks, nothing moves), the second card and "Tell", a secret (no
   move), a tool that does not fit and "Go!" (back to give), the right tool and "Go!", a "Same" on the made lamp (look
   again), "Not the same", a tap on the part that is the same (the part is fine), a tap on the slip part, a card, "Same";
   then two more chains straight through; "Next" to the clear; "Play again"; and "Title" from a chain and from the clear,
   with a quick second tap not starting trial 1. `window.__game` is used to read the state, never to do what a tap can
   do; `dispatch` is not used.
2. The smoke checks the screen, not only the state: the frame and ticks of the row of steps, the picked cards' marks,
   the tick badge of a lit lamp, the town's lamps, the buttons and the message are seen in the pixels. A state that says
   "lit" with a dark town lamp fails.
3. Japanese and English screenshots of each step, of the clear and of the title are looked at. The desktop smoke plays a
   chain with the mouse and checks that a held press on a part does not move the hero. Offline after the first load, in
   both languages, the whole path still works.
4. The smoke of trials 1 to 5, including the score attack, still passes. The title's trial 6 button starts none of them,
   and a tap in the middle of the title still starts trial 1.

### REQ-9.17 No gate gets weaker, and what is verified is said

1. No threshold, config, check script, workflow or existing test is loosened, deleted or relaxed to pass. Where this
   spec forces an old expectation to change, `tasks.md` names the old test and the new one, and why trials 1 to 5 are
   not weaker.
2. `npm run check` passes. Tasks that connect input to the screen also pass `npm run build` followed by `npm run smoke`.
3. The smoke targets mobile WebKit and desktop Chromium. Where WebKit cannot start in the authoring sandbox, the result
   says that the mobile smoke ran on Chromium with the iPhone 13 touch profile, and CI's WebKit run is what counts. The
   work is not called done before CI's smoke is green. A Playwright run is never called a check on a real phone. A test,
   hook or agent that was not run is not reported as run, and a Result line states only what was measured.

## Invariants

Rules from `.kiro/steering/domain-invariants.md` apply: ids are never reused or renumbered, each new invariant gets a
property test in the same pull request, and only rules a child depends on are listed. Ids 6, 7, 25 and 37 are retired;
1 to 5, 8 to 24, 26 to 36 and 38 to 62 are in use at the start of this spec. This spec adds 63 to 74.

| id | invariant | child depends on |
|---|---|---|
| INV-63 | A chain is `wishAt(seed, chain)`, `jobAt(seed, chain)`, `thingsAt(seed, chain)` and `slipAt(seed, chain)`. The seed holds for the whole visit; the chain grows only by 1, only by `NextLamp` after a lit lamp, and stays below 3; no wish repeats the one before it, the three jobs of a seed are all different, and the slip part is never the same two chains in a row. | what comes is fair and the same for the same seed |
| INV-64 | The stage moves only along the chain, each move by its own step's event: tell to give (`Tell`), give to go (`GiveItem` with a tool), go to give or check (`Go`), check to fix or lit (`CheckLamp`), fix to check (`FixLamp`), lit to the next chain's tell or the clear (`NextLamp`). Every other event of trial 6 leaves the stage, and no event moves a chain back to its tell step. | a step cannot be skipped, and there is no starting over |
| INV-65 | `SayLook` while telling sets exactly its part's told look and changes nothing else in the chain (a look that is not a roof's or a light's returns the same state). `Tell` with both parts told moves to give with exactly the looks told; with a part missing it moves nothing and notes the first missing part. | the wisp is told exactly what I picked, and never guesses the rest |
| INV-66 | `GiveItem` with one of the chain's three things: a tool moves to go holding exactly that tool; a secret moves nothing and only notes that it is a secret; any other thing returns the same state. `Go` tries exactly the held tool: the job's tool moves to check with the made lamp, any other tool moves back to give with the told lamp kept and a note of the tool. | the wisp can do only what the tool I gave lets it, and a secret is never a tool |
| INV-67 | The made lamp (the lamp at the check right after `Go`) has the told look in every part but the chain's slip part, and there a look that is neither the told look nor the wish's. So the lamp the wisp makes is never the wish. | the wisp kept what I said, slipped in one part, and I have to check |
| INV-68 | `CheckLamp` "same" on a lamp that is the wish lights it, "not the same" on a lamp that differs moves to fix; the other two change only the note. A lamp is lit only by "same" on a lamp that is the wish. | only a checked lamp is accepted |
| INV-69 | `PointLamp` in the fix step on a part that differs from the wish points at it, and its two cards are the looks it does not have; on a part that is the same it only notes that the part is fine. `FixLamp` with one of the two cards gives the pointed part exactly that look, changes no other part, and moves to check; any other `FixLamp` returns the same state. | the wisp changes exactly the part I pointed at, to exactly what I said |
| INV-70 | The trial is clear only after `NextLamp` on the third lit lamp, and the clear stays until `StartCrown` or `LeaveCrown`. | the town is lit only when all three lamps are |
| INV-71 | Trial 6 has no clock and no score: every step that starts or ends in trial 6, `Tick` included, leaves `run` equal. | no hurry, and nothing to lose |
| INV-72 | The crown's step events return the same state outside trial 6; in it they change only `crown`. `crown` is the initial value whenever `trial` is not 6. In trial 6 the events of trials 1 to 5 return the same state, so the lane, the shed, the field, the shadows and the lantern stay initial. | the other trials cannot be broken from here, and trial 6 cannot be broken from them |
| INV-73 | `LeaveCrown` in trial 6, in any stage, returns to the title (`phase` `title`, `trial` 0, `crown` initial) and changes nothing else. Anywhere else it returns the same state. | I can go back from anywhere; I cannot fall out of another trial |
| INV-74 | `StartCrown` from the title or the clear begins a visit: `phase` `trial`, `trial` 6, the tell step of chain 0 of the seed, nothing told, and nothing else changes. Anywhere else it returns the same state. | a new visit is a fresh start |

`.kiro/steering/domain-invariants.md` has the rows and the note on this scope. INV-1 to INV-5, INV-8 to INV-24, INV-26
to INV-36 and INV-38 to INV-62 keep their text and their tests.

## Verification summary

| layer | what | requirement |
|---|---|---|
| unit (`crown.test.ts`, `reducer.test.ts`) | the rules and events of trial 6, the pinned seeds, the made lamp, the checks, the fix, the clear, the entry, the leave, no clock | REQ-9.3 to 9.11 |
| property (`crown.pbt.test.ts`) | INV-1 to INV-4 with the new events, INV-63 to INV-74 | REQ-9.9, 9.11, 9.15 |
| model (`crown.model.test.ts`) | states, invariants, goals, deliberate breaks | REQ-9.3 to 9.10, 9.15 |
| content (`crown-content.test.ts`) | keys, placeholders, Japanese rules, lengths, no blame, fear or claims, the title caption | REQ-9.1.6, 9.8, 9.14 |
| view and layout (`crown-view.test.ts`, `crown-layout.test.ts`, `title-view.test.ts`, `route.test.ts`, `lantern-layout.test.ts`) | what each stage shows, the marks, no overlap, targets of 80 or more, the title's card and five buttons, scene choice | REQ-9.1 to 9.12 |
| mutation (`npm run mutation`) | no surviving mutant | REQ-9.15, 9.17 |
| mobile and desktop smoke | real taps, pixels, silence, grayscale, screenshots, offline | REQ-9.1 to 9.16 |
