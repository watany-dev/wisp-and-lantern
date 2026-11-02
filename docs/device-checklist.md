# Device checklist

## Per PR

Required by `device-gate` when `src/game/`, `src/content/`, `public/`, `index.html` or `vite.config.ts` change. Use the preview URL from the bot comment, then add the `device-checked` label.

- [ ] Phone (iOS Safari or Android Chrome): the changed flow works with one finger, targets are easy to hit
- [ ] Phone: switch to another app and back; no stuck input, no sound before the first tap
- [ ] Desktop Chrome at 1280x800: the same flow works with the mouse only, no keyboard
- [ ] Japanese and English: no clipped text, the rounded font is used (no system font)

## Weekly full pass

- [ ] Two-finger touch does not break input
- [ ] Sound: soft effects only, nothing before the first tap, nothing louder than the UI click
- [ ] One full playthrough on a phone
- [ ] Desktop at 1280x800 and 1920x1080 with the mouse only
- [ ] Trial 1 is solvable from a grayscale screenshot

## Provisional pass criteria (ours, not contest rules)

- [ ] Onboarding: within 10 seconds of Start the child has dragged to move and tapped the helper to send it
- [ ] Understanding: in trial 1 the child says in their own words that a missing card brings the wrong thing (record verbatim)
- [ ] Controls: 4 of 5 children (5–8) finish trial 1 without verbal help
- [ ] Judges: an adult on desktop reaches trials 1, 3, 6 and the parent screen within 4 minutes using only the README
- [ ] Color: trial 1 cards and targets are distinguishable in grayscale
- [ ] Stability: one full playthrough on iPhone Safari, Android Chrome and desktop Chrome
- [ ] Performance: 60 fps target; if it stays under 30 fps, cut effects
