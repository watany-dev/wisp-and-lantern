---
inclusion: always
---

# Tech

Versions are pinned in `package.json`; that file wins if this list is out of date.

- Runtime and language: Node.js 26 (`.nvmrc`), TypeScript 7, ES modules.
- Game engine: Phaser 4, used only in `src/game/`.
- Build and tooling: Vite+ (`vp`), which bundles Vite, Vitest, Oxlint and Oxfmt. All their
  settings, including the domain-purity lint rules, live in `vite.config.ts`.
- Tests: Vitest for unit tests, fast-check for property tests, `checkModel` for exhaustive model
  checks, Stryker for mutation tests (`stryker.config.json`), Playwright for the smoke on mobile
  WebKit and desktop Chromium (`playwright.config.ts`), and benchmarks in `src/**/__perf__/`.
- Repository gates: `scripts/check-*.mjs`, run by `npm run verify`, each tested against fixtures in
  `scripts/__tests__/`. CI adds Semgrep, ShellCheck, zizmor, zghalint, gitleaks and `npm audit`.
- Hosting: static files on GitHub Pages, with a preview per pull request (ADR 0002).

## How the hard rules are enforced

- Rule 2: `npm run kid` (`scripts/check-kid-strings.mjs`). After changing any string, also run
  `npm run font` so the subset font covers every character (`check-font-coverage.mjs`).
- Rule 3: Oxlint restrictions in `vite.config.ts`. Time and randomness reach the reducer only
  through events or an injected RNG (ADR 0001).
- Rule 6: exact versions in `package.json`, `scripts/check-licenses.mjs` for licenses and sources.
- Rule 1: `scripts/check-cjk-allowlist.txt` lists the only files that may contain Japanese.

## Conventions

- Quality gates and the reasons behind them are in `docs/adr/0003-quality-gates.md`. Do not lower a
  threshold to pass a check; that is a protected-path change.
- A new dependency needs a reason in the PR and must pass `check-licenses.mjs`. Prefer the
  standard library or code already in the repository.
- No solver dependencies (Z3, TLA+); formal QA runs on `checkModel` and `checkProperty` (ADR 0003).
