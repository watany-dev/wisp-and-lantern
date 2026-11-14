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
- [ ] Trial 2: children (5–8) play The Locked Shed's 60 seconds without verbal help, and say in their own words why a tool worked or did not (record verbatim); note whether they try the same tool again after a puzzle stays stuck, whether they notice that the right tool changes with the puzzle, how they read the closing line, and whether the 60 seconds feels rushed or dull
- [ ] Color: trial 2's five tools are told apart by outline in grayscale, the five puzzles by their obstacle (padlock, leaves, planks, rope, cat on the roof), and the picked tool by its frame and tick
- [ ] Trial 2: the Title button at the end of the lower row of tools is found when wanted and not tapped by accident; the end screen's two buttons are told apart
- [ ] Trial 3: children (5–8) play The Wisp Field's 60 seconds without verbal help, and say in their own words how they knew a star was fake (record verbatim); note whether they say the wisp made a mistake or did it on purpose, whether they look at the glow and the edge before they press a button, whether they press both buttons without looking (and whether the streak makes them stop), how many rounds they get through, whether the 60 seconds feels rushed or dull, how they react to "a fake got mixed in" after a wrong decision, and how they read the closing line
- [ ] Trial 3: the title shows the 60 seconds in trial 1's card and in the captions of the shed's and the field's buttons; children say the field has a time limit
- [ ] Trial 3: the Title button at the bottom right is found when wanted and not tapped by accident while sorting; the end screen's two buttons are told apart
- [ ] Color: trial 3 fake stars are told from real ones in grayscale, with the sound off, by their brighter glow and their ring of dots, and a sorted star by its word and tick
- [ ] Stability: one full playthrough on iPhone Safari, Android Chrome and desktop Chrome
- [ ] Performance: 60 fps target; if it stays under 30 fps, cut effects
