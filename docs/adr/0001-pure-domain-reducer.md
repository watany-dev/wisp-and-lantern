# 0001. Game rules are a pure reducer, separate from Phaser

- Status: Accepted
- Date: 2026-11-02

## Context

The game teaches six-year-olds to give an assistant clear instructions, so the rules (what a card
means, when a trial is solved) must behave the same on every device and must be testable without a
browser. Phaser scenes mix rendering, input and timing, which makes them slow and flaky to test.
Most of the code will be written by an agent in cloud sessions that cannot touch a real phone.

## Decision

- `src/domain/` holds the rules as `reduce(state, event) => state` over plain data. It imports no
  Phaser and reads no clock, randomness or browser API; time and randomness arrive in events or an
  injected RNG. Oxlint enforces this in `vite.config.ts`.
- `src/game/` renders state and turns input into events. It never mutates state.
- Balance constants live in `src/domain/balance.ts`; player-facing text lives in `src/content/`.
- Tests and e2e read the game through `window.__game = { state, dispatch }`.

## Consequences

- Rules can be checked exhaustively: property tests (fast-check), an explicit-state model check
  (`checkModel`) and mutation tests (Stryker) all run in Node in seconds.
- Replaying the same events always gives the same state, so a bug report is an event list.
- Anything that needs time or randomness has to be designed as an event, which costs a little
  ceremony in `src/game/`.
- Scene code is excluded from unit coverage and mutation testing; the Playwright smoke and the
  real-device check on each preview cover it instead, so logic must not hide in scenes.
