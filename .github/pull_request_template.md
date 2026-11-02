## What
<!-- One paragraph. If balance or pacing changed, the intended feel in one sentence. -->

## Spec
- Spec: `.kiro/specs/<id>/` — task N.M
- Requirements: REQ-x.y
- Invariants: INV-n (or "none")

## Checks
- [ ] `npm run check` passed in the session

## Reviewer
<!-- Paste the reviewer subagent summary. For string changes, add the kid-reader table. Or "n/a". -->

## Device check
<!-- Required when src/game/, src/content/, public/, index.html or vite.config.ts change.
     Open the preview URL from the bot comment, tick every box, then add the `device-checked` label.
     New device-facing commits remove the label automatically. -->
- [ ] Phone (iOS Safari or Android Chrome): the changed flow works with one finger, targets are easy to hit
- [ ] Phone: switch to another app and back; no stuck input, no sound before the first tap
- [ ] Desktop Chrome at 1280x800: the same flow works with the mouse only, no keyboard
- [ ] Japanese and English: no clipped text, the rounded font is used (no system font)
- Checked on: <!-- device / browser -->
