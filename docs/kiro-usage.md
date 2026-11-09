# Kiro usage

## The central case: the loop we teach is the loop we used

Trial 1 teaches "say exactly what you want, check what comes back, tell it again". Building it went
the same way: a request with acceptance criteria, a spec that restated them, an implementation
that did exactly what the spec said, and a review that found where the spec and the work differed
(`docs/evidence/didnt-work.md`, 2026-11-09 rows 6 and 7). The review caught two things our own
checks had passed: a right-result message that did not name the item, and an offline test that went
offline later than the spec said.

## Spec-driven development

The chain for trial 1, from instruction to decision (Kiro Web, 2026-11-09):

| step | where it is |
|---|---|
| instruction | One request: trial 1 only, from start to retry; two picture cards; the helper searches only when asked; ja and en; portrait, one finger, mouse, offline after the first load; pure reducer; property test for "not asked", model check for retry, mobile smoke with real taps; no gate weakened. |
| spec | `.kiro/specs/02-trial-tell/` (`requirements.md` REQ-2.1 to 2.15, `design.md`, `tasks.md`); Japanese translation in `jp/` |
| pull requests | #37 spec, #38 rules, #39 property tests, #40 model check, #41 content, #42 game modules, #43 scene, #44 smoke, #45 translation |
| verification | `npm run check` in each task; mutation score 100%; real WebKit smoke in CI on #44; each test also run against a deliberately broken implementation (see `docs/evidence/pbt/trial-1.md` and the Result lines in `tasks.md`) |
| decisions | The Decisions section of each pull request: a missing card does not search (against a line in `docs/device-checklist.md`), no in-game language switch, stacked pull requests not merged, WebKit not runnable in the sandbox |
| requirement to test to result | the traceability table at the end of `tasks.md` |

The review after the work found three gaps; they are task 9 in `tasks.md`.

## Steering

## Hooks

- `.kiro/hooks/evidence-log.json` (`Stop`): appends one metadata record each time the agent stops to
  `docs/evidence/kiro-log/`, the source for the hook numbers in `metrics.md`.
- `.kiro/hooks/ptuf.json` (`SessionStart` + `PreToolUse`): cloud sessions start from a fresh clone,
  so `SessionStart` installs the pinned [ptuf](https://github.com/watany-dev/ptuf) binary, and
  `PreToolUse` sends every tool call to it. ptuf allows, asks or denies by rule (`.ptuf.yaml`),
  not by asking a model. If the binary is missing, the hook blocks the call instead of letting it
  through.

## Property-based testing

Trial 1: INV-5 to INV-7 (the helper never searches unprompted; a missing card is not a search; what
was asked cannot change). Results, the generator and the deliberately broken versions that each
property was shown to catch are in `docs/evidence/pbt/trial-1.md`.

## Custom agents

## MCP

## Powers

## Surfaces: IDE, CLI, Web, Crew

Trial 1 was built on Kiro Web only (`docs/evidence/surfaces.md`). The Web sandbox could not start
WebKit, so the mobile smoke ran on Chromium with the iPhone 13 touch profile there and on WebKit in
CI.

## Numbers (from `docs/evidence/metrics.md`)

## What didn't work

Entries with the date, the cause and what we did instead are in `docs/evidence/didnt-work.md`. The
ones from trial 1: WebKit does not start in the Web sandbox; the first smoke missed two scene bugs;
`npm run check` before `git add` hides files that `check-submission.sh` reads later; looking at the
built screens found two defects that types and tests did not; two review findings in tasks.md 9.1.
