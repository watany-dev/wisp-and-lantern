# 0002. Static GitHub Pages site with a preview per pull request

- Status: Accepted; the `device-checked` gate is superseded by [0004](0004-no-human-gates.md)
- Date: 2026-11-02

## Context

Judges may only read the description and watch the video, and if they do play, they most likely
use a desktop browser. The site must stay up, unattended, until judging ends on 2027-01-30.
Agents in cloud sessions cannot test on a phone, so a human has to check every device-facing change
on real devices before it merges.

## Decision

- The game is a static Vite build served from the `gh-pages` branch: `main` at the root, each pull
  request at `/pr-preview/pr-<n>/`, removed when the pull request closes.
- CI builds `dist/` with the production base path, smokes that exact build in Playwright (mobile and
  desktop), deploys it, waits until Pages serves the new build SHA, and smokes the live URL again.
- Changes under `src/game/`, `src/content/` and `public/` need the `device-checked` label, which the
  maintainer adds after trying the preview on phones.
- A nightly job checks that production still serves the expected SHA and passes the smoke.

## Consequences

- No server, no secrets at runtime, nothing to patch during judging.
- Rolling back is running the CI workflow from a tag.
- Every pull request costs a Pages deploy; previews of closed pull requests must be cleaned up,
  which `preview.yml` does.
- GitHub Pages limits (size, soft bandwidth) apply; `scripts/check-size.mjs` keeps the build small.
