# 0003. Which quality gates block a merge, and which we left out

- Status: Accepted; the Process gates are superseded by [0004](0004-no-human-gates.md)
- Date: 2026-11-03

## Context

Most changes are made by an agent working without per-change approval and reviewed by one person.
A gate the agent can weaken, or a gate that passes when it should fail, is worse than no gate. The
project is small and short-lived (one month of building, two months of judging), so each gate has
to be cheap to run and cheap to keep green.

## Decision

Required checks on every pull request (defined in `ci.yml` and `guard.yml`, listed in
`docs/maintainer-setup.md`):

- **Static**: Oxfmt, Oxlint (correctness and suspicious rules, size limits, domain purity), the
  TypeScript 7 type check, knip, repository checks (`npm run verify`), license and source policy,
  `npm audit` for shipped dependencies, registry signatures, ShellCheck.
- **Thin untested code**: coverage and mutation testing exclude `src/main.ts`, `src/game/boot.ts`
  and `src/game/{scenes,fx,ui}/**` because they only run in a browser. Oxlint holds those paths to
  30 lines per function and complexity 5 (the rest of `src/` allows 80 and 15), so logic such as
  pointer math or hit tests moves into unit-tested modules like `src/game/steer.ts`.
- **Tests**: unit, property (fast-check, with recorded counterexamples replayed), an exhaustive
  model check of the reducer (invariants and no soft-lock), and tests of the check scripts
  themselves. Coverage of unit-tested code at least 95% on every metric.
- **Mutation**: Stryker over the same code; any surviving mutant fails. Equivalent mutants are
  disabled in place with the reason.
- **SAST**: Semgrep `p/default`; any finding fails.
- **Delivery**: size budget, Playwright smoke of the built site, benchmark regression over 5%.
- **Process**: protected paths need `human-approved`; device-facing paths need `device-checked`;
  the guard runs from the base branch so a pull request cannot change its own gate.

Nightly: 2000-run property tests with a fresh seed, `npm audit` including dev tools, and a
production liveness check.

Considered and left out:

- **TLA+ or an SMT solver** for the rules: the reducer is small and finite once abstracted, so a
  breadth-first search over the real code (`checkModel`) gives the same guarantees without a second
  model that can drift from the code.
- **A browser and OS matrix**: Playwright covers Chromium and WebKit; the real-device check covers
  iOS Safari and Android Chrome.
- **CodeQL**: Semgrep already gates, and code scanning needs a public repository.
- **Diff-only mutation testing**: the whole run takes seconds; revisit if it passes 10 minutes.

## Consequences

- A change that is not covered by a test that would notice it breaking does not merge.
- The agent spends time killing mutants and writing model-check alphabets for each trial; that is
  the intended trade.
- The thresholds are strict on purpose. Lowering one is a protected-path change and needs a reason
  in the pull request.
