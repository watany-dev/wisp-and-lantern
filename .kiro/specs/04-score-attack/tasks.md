# Tasks: a 60-second score attack

One task per branch and per pull request (`AGENTS.md`). Branch `04-score-attack/<task>`; task 2.1 is cut
from 1.1 and targets it until 1.1 is merged. Every task leaves the game working and passes `npm run check`.

Status: `[ ]` open, `[x]` done. A task fills its **Result** line in its own pull request.

## 1. Score attack

- [x] 1.1 Spec, run rules, end screen and top row.
  - Requirements: REQ-4.1 to REQ-4.8
  - Invariants: INV-1, INV-14 to INV-17
  - Tests: as in design.md, "Tests"
  - Result: `npm run check` passes on Node 26.13.0: 297 unit and property tests, 100% coverage, mutation score
    100% (409 mutants, none survived), `check-trace: 15 invariants, 0 without tests`, size budget ok (354 KB gzip).
    The smoke (11 tests: 8 mobile, 3 desktop) passes on Chromium with the iPhone 13 profile, since the sandbox
    cannot run WebKit; CI runs the real WebKit pass. The first full run found one surviving mutant (`Ask`
    outside a trial) and a knip finding (an unused export); both fixed.

## 2. Looks

- [ ] 2.1 Sharp rendering, drawn characters and scenery, motion.
  - Requirements: REQ-4.9 to REQ-4.11
  - Tests: layout and view stay unit-tested; the smoke plays through and its screenshots are read
  - Result: (fill in when run)

## Tests of the old behavior that this spec replaces

| old test | file | now |
|---|---|---|
| "cycles through the wishes and wraps to the first" (3 wishes) | `reducer.test.ts` | six wishes |
| the trial 1 model state counts (220 / 280) | `reducer.model.test.ts` | counts for six wishes, `run` left out of the key |
| INV-1 "title or trial" | `reducer.pbt.test.ts` | "title, trial or over" |
| INV-14 "only `Retry` changes the lane" | `reducer.pbt.test.ts` | "inside a run" |
