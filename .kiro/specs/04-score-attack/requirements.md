# Requirements: A 60-second score attack, and a better-looking game

Spec `04-score-attack`. Requirement ids are `REQ-4.n`. `REQ-3.n` belongs to
`03-trial-tell-vague-request`, `REQ-2.n` to `02-trial-tell`; none is reused.

## Why (feedback from the maintainer's own play, 2026-11-09)

- "The picture quality is too poor to be fun." The game draws flat gray and orange squares for the
  wisp and the hero, plain dark panels for the lane, and renders at 390 x 844 pixels, so every phone
  upscales it and blurs the shapes and the text.
- "Once I catch one, it is over, which is boring." After a find the child sees a closing line and
  a button, and nothing is at stake or counted. There is no reason to play again.

The answer to the second point is a 60-second score attack: find as many wishes as possible before
the clock runs out. The answer to the first is a separate task of this spec (task 2.1, REQ-4.9 to 4.11).

## Scope

In: trial 1 (The Dark Lane) as the only game, from the title to the end screen. Touches `src/domain`,
`src/game`, `src/content`, their tests, `e2e/`, the steering invariants file, and the smallest notes
that keep other documents true.

Out: trials 2 to 6, the parent screen, sound, saving the best score between sessions (it lives for the
session only), a leaderboard, network use, new card kinds, changes to `vite.config.ts`,
`stryker.config.json`, `package.json`, `scripts/check-*` or `.github/`.

## What does not change

The learning rules of trial 1 stay as `03-trial-tell-vague-request` specified them: a request with one
card brings another item and never the wish (REQ-3.3), a request with both cards brings exactly that pair
(REQ-3.3.2), no card is not a request (REQ-3.2), the message names what was brought (REQ-3.4), and the
closing line on a find (REQ-3.5). The score rewards what the lesson teaches: only telling the wisp both
the color and the object finds the wish.

## Requirements

### REQ-4.1 A run is 60 seconds

1. The game starts a run when the child taps the title screen. The run lasts 60 seconds of play time.
2. The title screen says so, in a short line in the child's language.
3. Nothing else starts or ends a run: not a find, not a miss, not a retry.

### REQ-4.2 The clock

1. The clock counts down while the lane is on screen, whatever the child is doing: choosing, waiting for
   the wisp, or reading a result.
2. Time reaches the game only as a `Tick` event with the milliseconds that passed. The reducer never reads
   a clock (hard rule 3, ADR 0001).
3. A frame that took longer than 250 ms (for example after the tab was in the background) counts as 250 ms,
   so a pause does not use up the run.
4. The top row shows the whole seconds left (rounded up, so the last second reads 1), and a bar that
   shrinks with the time. Meaning is never carried by color alone (hard rule 7): the number says it too.

### REQ-4.3 The score

1. A wish found scores 100. Each wish found in a row before it adds 50 more, up to 4 in a row: 100, 150,
   200, 250, 300, 300, and so on.
2. Any result that is not the wish (a different complete request, or a request with one card) scores
   nothing and ends the streak. Nothing is taken away, and nothing is red, crossed or loud (REQ-2.4.3 stays).
3. The score is added when the wisp is sent, with the result, not when the child moves on.
4. The top row shows the score. A find also shows the points it scored ("+150") rising from the lit slot.
5. Picking, retrying and asking with no card never score.

### REQ-4.4 Wishes

1. The villager's wishes cover all six lane items once, in a fixed order, then start again.
2. A wish never repeats the one before it, in the color or the object, including the wrap from the last to
   the first. The first three wishes keep their order (yellow lantern, red pumpkin, blue lantern).
3. After a wish that was not found, the same wish stays (REQ-2.7 stays).

### REQ-4.5 Time up

1. When the clock reaches zero the run is over at once, even if the wisp is searching or a result is showing.
   The end screen replaces the lane.
2. The end screen says the time is up, shows the score of the run and the best score of the session.
3. If the score beat the best, the end screen says so ("New best!"). A run that scored nothing never does.
4. The best score is kept for the session only (reload starts again at 0).
5. The end screen ignores taps for 0.8 seconds, so a last quick tap in the lane does not restart the run
   before the child sees the score.

### REQ-4.6 Play again

1. The end screen has one big button. Tapping it begins a new run: a full clock, score 0, streak 0, the
   first wish, nothing picked. Only the best score and the language carry over.
2. From every state the child can reach a new run (no soft-lock).

### REQ-4.7 Layout

1. The clock number, the bar and the score share one row at the top. The wish moves down to make room.
2. Nothing overlaps, everything is inside the canvas, and every target is still at least 80 x 80 game
   pixels (REQ-2.11).
3. The end screen lays out its lines from the top to the button without overlap.

### REQ-4.8 What carries over

1. Every child-facing string exists in Japanese (hiragana and katakana only) and English (hard rule 2).
2. The game makes no network request (hard rule 4) and works with one finger and with a mouse (hard rule 7).
3. The next-wish button after a find says "Next" instead of "Play again", since "play again" now means a
   new run.

### REQ-4.9 Sharp rendering (task 2.1)

1. The game is drawn at the device's pixel ratio (capped at 2, which keeps the canvas light), so shapes and text are sharp on a phone.
2. The layout in game pixels (390 x 844) and every tap position stay the same.

### REQ-4.10 Characters and scenery (task 2.1)

1. The wisp, the hero, the slots, the cards and the background are drawn as finished pictures made in code,
   not flat squares. No file is added, no third-party art is used (hard rule 5).
2. Pictures keep their shape and pattern cues, so a color is still told by more than color (hard rule 7).

### REQ-4.11 Motion (task 2.1)

1. The wisp floats and glows, a find bursts into sparks, and the lit slot glows.
2. Motion never carries the only meaning, never flashes faster than 3 times a second, and can be ignored
   without losing information.
