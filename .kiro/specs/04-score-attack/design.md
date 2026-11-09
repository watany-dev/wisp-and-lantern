# Design: A 60-second score attack

Requirements: `requirements.md`. The reducer stays pure (ADR 0001): time comes in as an event.

## Domain

`src/domain/run.ts` holds the rules of one run as pure functions over `Run`:

```ts
type Run = { remainingMs: number; score: number; streak: number; best: number; record: boolean };
```

| function | rule |
|---|---|
| `pointsFor(streak)` | `100 + 50 * min(streak, 4)` |
| `scoreSearch(run, found)` | found: add `pointsFor(streak)`, streak + 1. Otherwise streak 0. |
| `runDown(run, ms)` | `remainingMs = max(0, remainingMs - ms)` |
| `finishRun(run)` | `best = max(best, score)`, `record = score > best` (before the update) |
| `restartRun(run)` | `initialRun` with the same `best` |

Constants (`balance.ts`): `runMs` 60000 and `score { find 100, streakStep 50, streakCap 4 }`. `balance.wishes`
lists all six items, in an order whose neighbors differ in both color and object.

`GameState` gains `run: Run`, and `phase` gains `"over"`. `GameEvent` gains `{ type: "Tick"; ms }`.

| event | in `title` | in `trial` | in `over` |
|---|---|---|---|
| `Start` | begins a run | sets the language only | begins a run |
| `Tick` | ignored | clock down; at zero the run is over (`finishRun`) | ignored |
| `Ask` | ignored | the lane rule, then `scoreSearch` once, when the search starts | ignored |
| `PickCard`, `Retry` | ignored | the lane rule | ignored |
| `SetLang`, `MoveHeroTo` | as before | as before | as before |

`Tick` with `ms <= 0` or `NaN` returns the same state. Scoring happens in the reducer's `Ask` case, not
in `lane.ts`, so the lane stays free of the run (`outcome(lane) === "right"` decides the find).

### Why not auto-advance after a result

An earlier idea was to move to the next wish after about 1.8 seconds. It was left out: it adds a second
timer to the state, makes the smoke race the screen, and takes the reading pace away from a 6-year-old.
The clock already rewards speed. The button stays; if play shows it slows the game, a hold time in
`balance.ts` can add it later.

### Invariants

`INV-1` widens to the end screen. New: `INV-15` the clock only runs down inside a run, `INV-16` the score
only goes up on an `Ask` that brings the wish, `INV-17` trial means time left and over means none, and the
end screen takes only `Start`, `SetLang` and `MoveHeroTo`. `INV-14` says "inside a run" since a new run
starts from a clean lane.

### Model checks

The trial 1 model check ignores `run` in its state key (the score would make the state space endless) and
visits 6 wishes now: `4 + 2 * 2 * 6 * (12 + 11)` states. A second check adds `Tick` and `Start` and shows
that from every state the run can end and a new full-clock run can begin; without `Start` the end screen is
a soft-lock, so the check is load-bearing.

## Game

- `clock.ts`: `tickMs(deltaMs)` clamps a frame to 0 to 250 ms. The lane scene dispatches
  `Tick` from `update`.
- `lane-view.ts`: `hudView(state)` returns the seconds (rounded up), the bar fraction and the score text.
  It is separate from `laneView` because it changes every frame and `laneView` only with the lane.
- `over-view.ts`: `overView(state)` returns the title, the optional "new best" line, the score, the best
  and the button.
- `lane-layout.ts`: the HUD row at y 24, the wish row moved from y 62 to y 76, the end screen's lines and
  `overLockMs`.
- `scenes/LaneScene.ts` draws the HUD and the "+points" pop-up and starts `OverScene` when the phase is
  `over`. Its fields are reset in `create`, because Phaser reuses the scene object for the next run.
- `scenes/OverScene.ts` draws `overView`, ignores taps for `overLockMs`, and dispatches `Start`.
- Strings: a `run` block in `strings.*.json`; `lane.again` is now "Next".

## Graphics (task 2.1)

Written when the task starts; this file is updated in that pull request.

## Tests

Unit: `run.test.ts`, `reducer.test.ts`, `balance.test.ts`, `lane-view.test.ts`, `over-view.test.ts`,
`clock.test.ts`, `lane-layout.test.ts`. Property: INV-1, INV-14 to INV-17. Model: the run check above.
Smoke: a mobile run with real taps and a real clock (only the jump to time up uses `dispatch`), and a
desktop run with the mouse.
