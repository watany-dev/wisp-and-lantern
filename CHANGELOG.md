# Changelog

Notable changes to Wisp & Lantern. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
There are no numbered releases: the `submitted` tag marks the version entered in Kiroween 2026.

## [Unreleased]

### Added

- Project scaffold: Phaser 3, TypeScript 7 and Vite+, with a pure domain reducer and a title scene.
- CI: format, lint and type check, unit and property tests with 95% coverage, size budget,
  Playwright smoke, secret scanning, per-pull-request previews and production deploys with a
  live smoke, nightly property tests and liveness checks.
- Lint rules that keep `src/domain/` free of time, randomness and browser globals, plus size and
  complexity limits.
- Property-test helper that replays recorded counterexamples, with purity and determinism
  properties.
- Mutation testing with Stryker; any surviving mutant fails CI.
- Tests for every repository check script, and ShellCheck in CI.
- Dependency policy: license and source check, `npm audit`, registry signatures, Dependabot with a
  7-day cooldown.
- Semgrep static analysis in CI.
- Exhaustive model check of the reducer for invariants and soft-locks.
- `SECURITY.md`, architecture decision records in `docs/adr/`, and this changelog.
- ptuf guardrail for Kiro agents: a `SessionStart` hook installs the pinned, checksum-verified
  binary and a `PreToolUse` hook checks every tool call against `.ptuf.yaml`, failing closed when
  the binary is missing.

### Changed

- Hero movement step math moved from `TitleScene` into the unit-tested `src/game/heroStep.ts` (issue #16, option c). Options (a) lint limits and (b) a share gate touch protected paths and need human approval.
- No pull request waits for a human (ADR 0004): the `human-approved`, `device-checked` and `hotfix`
  label gates and the post-deadline freeze are removed, and agents merge their own pull request once
  every required check is green. Real devices are checked weekly instead of per pull request.
- The `deploy` and `preview` jobs and the nightly `liveness` job check the Pages API first. When
  there is no Pages site (private repository on a plan without Pages, or no Source set), they skip
  the 15 minute wait and the live smoke with a warning instead of failing the run.
