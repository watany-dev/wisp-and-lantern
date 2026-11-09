# Device checklist

No pull request waits for a device check (ADR 0004). Run this pass on production once a week and
open an issue for each problem.

## Weekly full pass

- [ ] Phone (iOS Safari or Android Chrome): flows changed this week work with one finger, targets are easy to hit
- [ ] Phone: switch to another app and back; no stuck input, no sound before the first tap
- [ ] Japanese and English: no clipped text, the rounded font is used (no system font)

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
- [ ] Trial 2: children (5–8) finish The Locked Shed without verbal help, and say in their own words that the key was the one that worked (record verbatim); note whether they try the hammer again after the door stays shut, and how they read the closing line
- [ ] Color: trial 2 tools are told apart by outline in grayscale, and the picked tool is told by its frame and tick
- [ ] Stability: one full playthrough on iPhone Safari, Android Chrome and desktop Chrome
- [ ] Performance: 60 fps target; if it stays under 30 fps, cut effects
