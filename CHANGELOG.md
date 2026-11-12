# Changelog

Notable changes to Wisp & Lantern. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
There are no numbered releases: the `submitted` tag marks the version entered in Kiroween 2026.

## [Unreleased]

### Changed

- The game looks finished: it is drawn at the screen's pixel ratio (up to 2) so shapes and text are
  sharp, and the flat placeholder squares are gone. The wisp is a glowing ghost that floats, the hero
  a little witch with a lantern, the pumpkins and lanterns are shaded, the slots, cards and buttons
  have depth, and a night sky with a moon, stars and trees sits behind every screen. A find pops the
  star and bursts gold sparks. All art is drawn in code; no image files are shipped.
- The game is now a 60-second score attack. The clock runs from the first tap, each wish found scores
  100 (plus 50 for each find in a row, up to 4), a different or vague request scores nothing, and
  when time is up an end screen shows the score and the best of the session with a button to play
  again. The six lane items all come up as wishes, and the next-wish button says "Next". Spec in
  `.kiro/specs/04-score-attack/`; INV-1 and INV-14 are widened and INV-15 to INV-17 added.

- Trial 1, The Dark Lane: one card is now enough to send the wisp. With only a color or only an
  object, the wisp brings an item that keeps what the child said and differs from the wish where the
  child said nothing, names it, and lets the child tell it again. Picking both cards finds the wish as
  before, and the right result now shows a closing line ("You told it / color & item"). Spec in
  `.kiro/specs/03-trial-tell-vague-request/`; invariants INV-6 and INV-7 are retired and INV-8 to
  INV-14 added.

### Added

- Trial 3, The Wisp Field ("check it", learning goal L3): the wisp brings five stars and one or two are
  fakes. A fake shines brighter than a real star and its rim is a ring of dots instead of one line, so the
  child can tell by looking, from the first screen, with no color and no sound. The child taps a star to look
  at it closely (it is shown larger), then decides "real" or "fake". A right decision sorts the star. A wrong
  one sorts nothing, says kindly what happened ("a fake got mixed in", "that one was real") and asks for
  another look; it can be tried again without limit. When all five are sorted, a button keeps the real stars
  (and only those). Two rounds (one fake, then two) clear the trial: a result screen shows "Cleared!", the
  closing line, "Play again" and "Title". The fake stars come from a seed the game draws when the field opens,
  so the same seed plays the same. No clock or score. The child opens it from a new star button on the title
  (above the key button; the title's wisp and hero moved up to make room); a tap elsewhere on the title still
  starts trial 1. On the title, trial 1's way in and its 60 seconds now sit in their own card, and the two
  buttons say they have no timer. Japanese and English, one finger or a mouse, drawn in code, no network
  after the first load. Spec in `.kiro/specs/06-trial-verify-stars/` (revision 2: the first build, a tap that
  showed the answer, was replaced after three preview rounds); invariants INV-26 to INV-39 (25 retired). The
  other trials' events and the clock still act only in their own trial.

- Trial 2, The Locked Shed ("hand over the tools", learning goal L2) is now a 60-second time attack with five
  puzzles. A cat is stuck in a different way each round: a padlock, a heap of leaves, boards nailed over
  the door, a rope round it, or up on the roof. The child picks one of five tools (key, broom, hammer,
  scissors, ladder), taps the wisp to hand it over, and the wisp tries exactly that tool. Each puzzle has one
  tool that fits; any other tool leaves the puzzle as it was, and the child tries again. A freed cat scores
  100 (plus 50 for each in a row, up to 4), shows its own closing line and a "Next puzzle" button. The clock,
  the score and the end screen are trial 1's: when the 60 seconds are up the end screen shows the score and the
  best, with "Play again" and a new "Title" button. A "Title" button is also on the shed's screen, so the
  child can always go back. The order of the puzzles comes from a seed the game draws when a run starts. The
  child opens it from the key button on the title, which now says "How many in 60 seconds?"; a tap elsewhere
  on the title still starts trial 1. Japanese and English, one finger or a mouse, drawn in code, no network
  after the first load. Spec in `.kiro/specs/05-trial-grant-tools/` (revision 2: the first build had three
  tools, one answer, no clock and no way back, and got three comments); invariants INV-18 to INV-24 reworded,
  INV-15 to INV-17 widened to the shed, INV-40 to INV-43 added. Trial 1 events act only in trial 1 and the
  shed's events only in trial 2.

- Trial 1, The Dark Lane: pick a color card and an object card, tap the wisp to ask, see what it
  brings, and try again. The helper searches only when asked and only with both cards picked. Plays
  in Japanese and English, in portrait with one finger or a mouse, and needs no network after the
  first load. Spec in `.kiro/specs/02-trial-tell/`; invariants INV-5 to INV-7.
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

- No pull request waits for a human (ADR 0004): the `human-approved`, `device-checked` and `hotfix`
  label gates and the post-deadline freeze are removed, and agents merge their own pull request once
  every required check is green. Real devices are checked weekly instead of per pull request.
- The `deploy` and `preview` jobs and the nightly `liveness` job check the Pages API first. When
  there is no Pages site (private repository on a plan without Pages, or no Source set), they skip
  the 15 minute wait and the live smoke with a warning instead of failing the run.
- Code that coverage and mutation testing skip (`src/main.ts`, `src/game/boot.ts`,
  `src/game/{scenes,fx,ui}/**`) is held to 30 lines per function and complexity 5 by lint, so
  logic moves into unit-tested modules. The hero step calculation is now `src/game/steer.ts`.
