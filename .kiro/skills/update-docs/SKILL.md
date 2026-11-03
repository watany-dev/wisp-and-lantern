---
name: update-docs
description: >
  Sync implementation changes in src/, scripts/ and package.json to README.md,
  AGENTS.md, docs/ and .kiro/steering/. Use after code changes, when
  documentation may be stale, or when the user invokes /update-docs.
metadata:
  adapted-from: watany-dev/chokkin .claude/skills/update-docs
---

# update-docs

Close the gap between the code and documentation that goes stale. Five phases.

## Phase 1: Code audit

Find out what the code does now:

- `src/domain/`: events, state shape, reducer rules, balance constants
- `src/content/`: trials, cards, languages
- `src/game/`: scenes and URL parameters (`?judge=1`, `?trial=n`, `?lang=`)
  and `window.__game`
- `package.json` scripts, `vite.config.ts`, `.github/workflows/` (which checks
  run where)

## Phase 2: Design documents

Compare `.kiro/specs/`, `.kiro/steering/` and `docs/adr/` with the code:

- Reflect rule and event changes in the matching spec requirements and tasks.
- If a change reverses or extends an ADR, add a new ADR (`docs/adr/README.md`
  explains the format) instead of rewriting the old one.
- Keep named invariants (`INV-n`) and requirements (`REQ-x.y`) in step with the
  tests; `scripts/check-trace.mjs` checks this.

## Phase 3: README and AGENTS.md

Check and update:

- `README.md`: play instructions, judge parameters, how to run and test,
  repository map, credits
- `AGENTS.md`: commands, workflow, and pointers to `.kiro/steering/` for layout
  and hard rules. Keep it short; it is read at the start of every agent session.
- `.kiro/steering/`: `structure.md` (layout), `tech.md` (stack, enforcement),
  `product.md` (hard rules, never renumbered)
- `CHANGELOG.md` for user-visible changes

## Phase 4: Consistency

Align across all Markdown:

- command names, script names, paths, URL parameters, trial numbers, terms
- language: everything is English except the files in
  `scripts/check-cjk-allowlist.txt`
- no vendor names of the scaffold tool (`scripts/check-submission.sh` fails on
  them)

Never edit `docs/evidence/playtest-*` or existing lines in
`docs/evidence/kiro-log/`. Regenerate `docs/evidence/metrics.md` with
`npm run metrics` instead of editing it. Changes to protected paths need the
`human-approved` label.

## Phase 5: Report

Give a structured report:

- files updated
- documentation candidates (in the code but not documented)
- inconsistencies that need a design decision
