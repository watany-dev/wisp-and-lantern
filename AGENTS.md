# AGENTS.md

Wisp & Lantern is a portrait mobile web game (Phaser 4 + TypeScript 7 + Vite+) that teaches
6-year-olds how to work with an AI agent. It is a Kiroween 2026 hackathon entry.

## Commands
- `npm ci` — install exact versions from the lockfile
- `npm run dev` — dev server
- `npm run check` — format, lint and typecheck (`vp check`), knip, unit and property tests, repository checks.
  Must pass before every PR. `npm run fmt` fixes formatting.
- `npm run mutation` — Stryker over the unit-tested code; any surviving mutant fails CI. Kill it with a
  test, or for an equivalent mutant add `// Stryker disable next-line <mutator>: <why no test can tell>`
- `npm run build` / `npm run smoke` — production build / Playwright smoke (mobile + desktop)
- `scripts/__tests__/` runs every `check-*` gate against fixtures (part of `npm test`); CI also runs
  ShellCheck over `scripts/*.sh`. Change a gate together with its test.
- CI runs Semgrep (`p/default`) and fails on any finding. Fix the code; suppress only a false positive
  with `// nosemgrep: <rule-id>` and the reason on the same line.
- `npm run font` — regenerate the Japanese subset font after changing any string
- `npm run metrics` — regenerate `docs/evidence/metrics.md`

## Layout
See `.kiro/steering/structure.md` (directories, test helpers, where invariants live) and
`.kiro/steering/tech.md` (stack and how each rule is enforced).

## Hard rules
Numbered rules 1 to 7 are in `.kiro/steering/product.md`. Other files cite them as "hard rule n".
Named domain invariants (`INV-n`) are in `.kiro/steering/domain-invariants.md`; each needs a
property test in the same PR.

## Workflow
- One task from `.kiro/specs/<spec>/tasks.md` per branch and per PR. Branch name `<spec>/<task>`,
  e.g. `02-trial-tell/3.2`.
- PR title: English conventional commit, e.g. `feat(trial-tell): add color cards`.
  Fill in every section of `.github/pull_request_template.md`, including Spec and Device check.
  For Reviewer, run the `reviewer` agent (`.kiro/agents/`), and `kid-reader` when strings change.
- Protected paths (`.github/`, `.kiro/permissions.yaml`, `.kiro/settings/`, `scripts/check-*`,
  test and lint configs (`vite.config.ts`, `.zghalint.yml`), `package.json`, `package-lock.json`, `docs/evidence/playtest-*`) need the
  maintainer's `human-approved` label. Never change them to make a check pass; explain the problem in the PR.
- Never push to `main`, never force-push, never edit playtest records.
- e2e tests navigate with relative URLs (`page.goto("./?judge=1")`) so they work under any base path,
  and read state through `window.__game`.

## Cloud sessions
- The sandbox is a fresh clone every time. The `SessionStart` hook runs `npm ci`; if `node_modules`
  is missing, run it yourself.
- Do exactly one task, run `npm run check`, commit, and open a PR. Do not start the next task.
- The `AgentStop` hook appends to `docs/evidence/kiro-log/<session>.jsonl`. Commit that file with
  your change and never edit existing lines.
- You cannot test on a real phone. The maintainer checks the PR preview URL on devices and applies
  `device-checked`; that check is required for changes under `src/game/`, `src/content/` and `public/`.
