# What didn't work

| date | what we tried | why it didn't work | what we did instead |
|---|---|---|---|
| 2026-11-09 | Run the WebKit mobile smoke (`npm run smoke`) in the Kiro Web sandbox | WebKit does not start: system libraries are missing and there is no apt | Ran the mobile tests locally on Chromium with the iPhone 13 touch profile, and left the real WebKit run to the CI `smoke` job (PR #44: 6 passed) |
| 2026-11-09 | Trust the first version of the trial 1 smoke | Deliberately breaking the scene showed it missed two bugs: a picked card that also asks, and a press on a card that walks the hero (a tap is too short to walk the hero) | `pickCards` now asserts that picking alone has not asked; the hero check is a desktop test with a held mouse press |
| 2026-11-09 | Run `npm run check` before `git add` | `check-submission.sh` reads `git ls-files`, so an untracked file with Japanese text passes locally and fails after the add (PR #41, #42) | `git add` first, then check; Japanese in test files is written as `\u` escapes |
| 2026-11-09 | Keep the lane on a second `Start` with a title/trial branch | Stryker kept a mutant alive: the branch cannot be observed, because `trial` is already 1 in a trial | `Start` is one expression with no branch (PR #38) |
| 2026-11-09 | Judge the scene from types, lint and tests only | Looking at the built screens found two defects none of them caught: the wisp square covered the lit item, and the lantern caps were invisible on the dark lane | Draw the lit item above the wisp; mid-tone caps (PR #43) |
| 2026-11-09 | Test the result messages by comparing with the fixed string | The right-result message did not name the item, which REQ-2.5 requires; the test only compared the message with itself (found in review) | The message names the item, and tests assert the name for all six pairs in both languages (task 9) |
| 2026-11-09 | Describe the offline smoke as "offline from the title" while the code went offline after the trial had started | The check covered less than the spec said (found in review) | Wait for network idle, go offline on the title screen, then start the trial; a stray request in the scene now fails the test (task 9) |
