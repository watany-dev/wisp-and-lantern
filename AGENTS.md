# AGENTS.md

Wisp & Lantern is a portrait mobile web game (Phaser 3 + TypeScript 7 + Vite+) that teaches
6-year-olds how to work with an AI agent. It is a Kiroween 2026 hackathon entry.

## Commands
- `npm ci` — install exact versions from the lockfile
- `npm run dev` — dev server
- `npm run check` — format, lint and typecheck (`vp check`), knip, unit and property tests, repository checks.
  Must pass before every PR. `npm run fmt` fixes formatting.
- `npm run build` / `npm run smoke` — production build / Playwright smoke (mobile + desktop)
- `npm run font` — regenerate the Japanese subset font after changing any string
- `npm run metrics` — regenerate `docs/evidence/metrics.md`

## Layout
- `src/domain/` — pure reducer over `GameState` + `GameEvent`. No Phaser, no DOM, no `Date.now()`,
  no `Math.random()` without an injected RNG.
- `src/game/` — Phaser scenes, input, effects. Renders state and dispatches events; never mutates state.
- `src/content/` — all player-facing text and cards (JSON). No player-facing literals in `src/game/`.
- Property tests call `checkProperty(name, property)` from `src/domain/__tests__/support/pbt.ts`. When one
  fails, commit the reported `seed` and `path` to `support/pbt-regressions.json` together with the fix.
- `.kiro/` — specs, steering, hooks, agents. `docs/evidence/` — records of how the game was built.

## Hard rules
1. Everything in the repository is English, except the files listed in `scripts/check-cjk-allowlist.txt`.
2. Japanese child-facing text: hiragana and katakana only, max 12 characters per line, max 2 lines.
   `npm run kid` enforces this.
3. `src/domain/**` must not import `phaser` or touch `Date`, `Math.random`, `crypto`, timers or browser
   globals (Oxlint enforces this through `lint` in `vite.config.ts`).
4. The game makes no network requests. Fonts and images are bundled.
5. No third-party trademarks, logos or characters. Assets are original or CC0; fonts are OFL.
6. Dependency versions are pinned exactly. Explain any new dependency in the PR.
7. Meaning is never carried by color alone. Every interaction works with one finger and with a mouse.

## Workflow
- One task from `.kiro/specs/<spec>/tasks.md` per branch and per PR. Branch name `<spec>/<task>`,
  e.g. `02-trial-tell/3.2`.
- PR title: English conventional commit, e.g. `feat(trial-tell): add color cards`.
  Fill in every section of `.github/pull_request_template.md`, including Spec and Device check.
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
