# Wisp & Lantern

A mobile game for 6-year-olds that teaches how to work with an AI agent: a ghost helper that does
nothing until you ask, does exactly what you ask, and sometimes gets it wrong.

## Play

- Live: https://watany-dev.github.io/wisp-and-lantern/ (placeholder until the first deploy)
- Portrait phone with one finger, or desktop with the mouse only. No install, no sign-in, no network after the first load.

## For judges

- `?judge=1` unlocks every trial and shows a state overlay. `?trial=n` (1–6) starts a trial directly. `?lang=en` or `?lang=ja` picks the language.
- A 4-minute path through trials 1, 3, 6 and the parent screen: _to be written_.

## For parents

_To be written: what each lesson (L1–L4) means for real AI agents, in one sentence each._

## How to run

- Node.js version in `.nvmrc`, then `npm ci` and `npm run dev`.
- Deploying (GitHub Pages, PR previews, rulesets, labels, secrets): see [`docs/maintainer-setup.md`](docs/maintainer-setup.md).

## How to test

- `npm run check` — lint, typecheck, unused code (knip), unit and property tests with coverage (95% minimum on `src/`, Phaser rendering code excluded), repository checks.
- `npm run build && npm run smoke` — Playwright smoke on a phone (WebKit) and desktop (Chromium).
- `npm run bench` — benchmarks in `src/**/__perf__/`. On pull requests CI fails if any is more than 5% slower than the base branch (`scripts/check-perf.mjs`).
- `FC_RUNS=2000 FC_SEED=<n> npx vitest run pbt` — reproduce a nightly property-test failure.

## Repository map

- `src/domain/` pure game rules, `src/game/` Phaser scenes, `src/content/` text and cards (JSON).
- `e2e/` Playwright smoke, `perf/` benchmark harness, `scripts/` repository checks and tools.
- `.github/` CI, PR gate, preview and production deploys, nightly checks.
- `.kiro/` specs, steering, hooks and agents. `docs/` design notes, checklists and `docs/evidence/`.

## Prior work

None.

## Tooling

The build scaffold (Vite, Phaser, test and CI configuration) started from a standard template. All specs, steering, hooks, agents and game logic are built with Kiro; see `docs/kiro-usage.md`.

## Third-party tools

_To be written: libraries and services used, with versions from `package.json`._

## Kiro usage

See [`docs/kiro-usage.md`](docs/kiro-usage.md).

## Assets & font credits

See [`public/assets/CREDITS.md`](public/assets/CREDITS.md). Zen Maru Gothic is used under the SIL Open Font License 1.1.

## License

MIT — see [`LICENSE`](LICENSE).
