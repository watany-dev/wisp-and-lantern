---
name: wrapup
description: >
  Post-work review gate. Run after a task's implementation is done and before
  handing it off: correctness review, over-engineering review, formal QA of
  changed rules and state transitions, take in only the findings worth taking,
  then sweep comments. Use when the user invokes /wrapup or says "wrapup", or
  when an implementation task is finished and about to be committed or pushed.
metadata:
  adapted-from: watany-dev/chokkin .claude/skills/wrapup
---

# wrapup

The finishing pass after implementation. Run the reviews, take in **only the
useful findings**, then clean up comments.

When this skill says "apply the X skill", read `.kiro/skills/X/SKILL.md` and
follow it inside the current task.

## Steps

1. **CI.** `npm run check` passes. If it fails, fix it here.
2. **Correctness review.** If a code review subagent is available, run it on
   the diff. Otherwise review it yourself: read `git diff <base>...HEAD` and the
   code it touches, and list bugs, missing error handling, boundary conditions
   and missing tests as findings.
3. **Over-engineering review.** Apply the `ponytail-review` skill to the diff.
4. **Formal QA.** Decide whether the diff needs it (see "When to run formal
   QA"). If it does, apply the `formal-spec-extraction` skill scoped to the
   changed rules and follow "Formal QA in this repository" below. If it does
   not, report `Formal QA: skipped (<reason>)` in one line.
5. **Take in.** Sort every finding from steps 2 to 4 with the criteria below
   and fix only the accepted ones.
6. **Comment sweep.** Apply the `cleanup-comments` skill.
7. **Pass CI and commit.** Fixes from steps 1 to 5 may go in the same commit
   as the implementation; comment-only changes get their own commit.

## When to run formal QA

Run it when the diff changes any of:

- `src/domain/` (`reducer.ts`, `events.ts`, `state.ts`, `balance.ts`): event
  handling, state transitions, win and fail conditions, counters, caps
- card or trial data in `src/content/` that the rules interpret (conditions,
  limits, which cards can solve a trial)
- a `*.model.test.ts`, a property test or `support/model-check.ts`

Also run it when the user asks, for example `/wrapup formal`. Skip it for
changes to scenes, styling, strings only, docs or tooling; say which.

## Formal QA in this repository

ADR 0003 left TLA+ and SMT solvers out on purpose: the reducer is small and
finite once abstracted, so a breadth-first search over the real code gives the
same guarantees without a second model that can drift. So, in this order:

1. **Extract.** For the changed rules, write down the declared spec (specs,
   steering, test names, guards) and the implicit behavior separately. Ask the
   questions from section 3 of `formal-spec-extraction` for each one.
2. **Refute with the real reducer.** Express each claim as a named invariant
   or a goal and check it with `checkModel` in the trial's `*.model.test.ts`
   (every reachable state, shortest trace to a violation, no soft-lock) or with
   `checkProperty` in a `*.pbt.test.ts`. Keep the event alphabet small but
   include the boundaries (cap - 1, cap, cap + 1, empty hand, repeated taps).
3. **Prove the check is load-bearing.** Run `npm run mutation`. A surviving
   mutant in the changed code means the new invariant does not cover it.
4. **Leave a ledger** in the wrapup report: claims checked, result (holds /
   counterexample with trace), and questions for the user.

Do not add Z3, TLA+ or any other solver as a dependency. If a property really
needs one (for example, all inputs of a config with no finite abstraction),
report it as a finding with the reason; adopting a solver means a new ADR that
extends 0003, with the reason in the PR.

## Take-in criteria

Accept:

- defects that change behavior (wrong result, crash, leak, boundary condition)
- findings that make the diff shorter (`delete:` / `stdlib:` / `yagni:` /
  `shrink:`)
- adding tests for untested branches
- a formal QA counterexample that is clearly unintended: fix it, and keep the
  trace as a reducer test or model-check case. For a property-test failure,
  commit the reported `seed` and `path` to `support/pbt-regressions.json`
- a formal QA invariant that holds and guards behavior a child depends on (no
  soft-lock, caps, scoring): keep it as a regression guard in the model or
  property test. If `.kiro/steering/domain-invariants.md` exists, give it an
  `INV-n` id there and reference that id in a `*.pbt.test.ts`
- violations of the `AGENTS.md` hard rules: `phaser`, `Date`, `Math.random`,
  `crypto`, timers or browser globals in `src/domain/`; player-facing literals
  in `src/game/`; network requests; meaning carried by color alone; an
  interaction that needs more than one finger or a keyboard; unpinned
  dependencies

Decide and record in the PR's Decisions section:

- a formal QA counterexample that may be intended. Show the shortest event
  trace, decide whether it is intended using the spec and
  `docs/learning-design.md`, and give the reason. If intended, it becomes spec
  (`.kiro/specs/` or steering); if not, it is a bug to fix.

Decline:

- matters of taste, renaming, anything outside the diff
- generalization or future-proofing the current requirements do not ask for
- suggestions that go against the style of the surrounding code
- confirmation-only invariants that add CI time without guarding anything new

Report every declined finding with a one-line reason. Never drop one silently.

## Notes

- Syncing documentation is not part of wrapup. When `README.md`, `AGENTS.md`,
  `docs/` or `.kiro/steering/` need updating, invoke `update-docs` separately.
- Never change a protected path to make a check pass (`AGENTS.md`). Explain the
  problem in the PR instead.
