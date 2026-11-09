# Tasks: a vague request brings a different item

One task per branch and per pull request (`AGENTS.md`). Branch `03-trial-tell-vague-request/<task>`;
each branch is cut from the one before, and each pull request targets the previous task's branch until
that one is merged (task 1.1 targets `main`). Every task leaves the game working and passes
`npm run check`; tasks 7.1 and 8.1 also pass `npm run build` and the smoke. Sized for review on a
phone: aim for under 300 changed lines, tests included.

Status: `[ ]` open, `[x]` done. A task fills its **Result** line in its own pull request, with what it
ran and what it saw. Nothing is recorded as run unless it was run.

The order keeps each step safe to ship on its own:
2.1 adds the rule without using it; 3.1 adds the words without using them; 4.1 makes the screen read the
brought item (same behavior while the old ask rule holds); 5.1 flips the rule; 6.1 shows the closing
line; 7.1 plays it through with taps.

## Tests of the old behavior that this spec replaces (REQ-3.9.1)

Each is replaced in the task that changes its behavior, and the new test is shown to fail on the old
behavior (the Result line of that task says how).

| old test | file | replaced in | by |
|---|---|---|---|
| ask with only a color, or only an object, "is not a search and returns the same state" | `reducer.test.ts` | 5.1 | one-card asks search; the no-card case stays |
| INV-6 `missing-card-is-not-a-search`, INV-7 `asked-request-is-fixed` | `reducer.pbt.test.ts` | 5.1 | INV-8 to INV-14 |
| `canAsk` "is true only with both cards picked and no search yet" | `lane.test.ts` | 5.1 | one card is enough |
| "a search has a complete pick" model invariant and the 220-state count | `reducer.model.test.ts` | 5.1 | "at least one card"; 280 states |
| "invites the child to pick, saying what is still missing" (`pickBoth`, `pickColor`, `pickThing`) | `lane-view.test.ts` | 4.1 | `pickAny` and `ready` |
| "arms the wisp only with both cards picked", "fades the wisp while it cannot be sent" for one card | `lane-view.test.ts` | 5.1 | one card arms and un-fades the wisp |
| the mobile step "a color alone is not a request" | `e2e/smoke.mobile.spec.ts` | 5.1 (the step), 7.1 (the full paths) | the step becomes "a color alone is a request"; 7.1 adds the color-only and object-only paths |

## 1. Spec

- [x] 1.1 Write `requirements.md`, `design.md` and this file, with the Japanese translation in `jp/`,
      and add the pointer and the replaced-requirement notes to the three files of `02-trial-tell`
      (and their `jp/` copies). Past results in the old files are not edited.
  - Requirements: all (REQ-3.1 to REQ-3.9)
  - Tests: none (documents). `npm run check` includes `check-trace` (reads the ids) and the
    Japanese-text gate (specs are on the allowlist).
  - Result: `npm run check` passes on Node 26.13.0 (148 tests, mutation score 100%, `check-trace: 7
    invariants, 0 without tests`, the Japanese-text gate and the size budget ok). Nothing outside
    `.kiro/specs/` changed. The `02-trial-tell` files only gained the note at the top of each; no
    line of their requirements, designs or results was edited.

## 2. Domain: the brought item

- [x] 2.1 Add `hasPick`, `deliver` and `delivered` to `lane.ts`, with unit tests. Nothing calls them
      yet, so the game does not change.
  - Requirements: REQ-3.3 (1 to 5, 7)
  - Tests: `lane.test.ts`: all 30 rows (six wishes x five single cards) written by hand; both cards
    give the pair itself for every pair, and a complete request that equals the wish brings the wish;
    no card; the wrap from the last color and the last object; a vague request differs from the wish
    for every wish and card; the result does not change on a second call.
  - Done when: `npm run check` passes with no surviving mutant.
  - Result: `npm run check` passes on Node 26.13.0: 188 tests (40 new, in `lane.test.ts`), mutation
    score 100% (70 mutants in `lane.ts`, none survived), knip clean. The 30-row table is written by hand
    and agrees with the rule; a separate test checks that it covers all six wishes and all five cards.
    First run of the new tests failed lint (`toSorted` is not in the TypeScript lib target, and an
    `as Wish` cast is banned), so the test looks the item up in the list of six instead of casting.
    The game does not change: `canAsk` and `outcome` are untouched and nothing calls the new functions.

## 3. Content

- [x] 3.1 Add `lane.pickAny`, `lane.vague` and `lane.lesson` to both string files, regenerate the
      subset font, extend `lane-content.test.ts`. The old keys stay until 4.1. Nothing reads the new
      keys yet.
  - Requirements: REQ-3.5 (5), REQ-3.6
  - Tests: `lane-content.test.ts`: same keys in both languages; `{0}` once in `right`, `wrong` and
    `vague` and nowhere else; the Japanese rules for every item name in all three; the closing line
    is two lines of at most 12 characters in both languages; no blame words in the new strings.
    `npm run kid` and `check-font-coverage` pass. The kid-reader table (applied by hand) goes in the
    pull request.
  - Done when: `npm run check` passes.
  - Result: `npm run check` passes on Node 26.13.0: 194 tests (6 new), mutation score 100%,
    `npm run kid` ok, `check-font-coverage` ok. `npm run font` was run and left the subset font
    byte-identical (`cmp`), because the font already holds 350 code points including `カ`, `ー`, `ド`.
    The new tests were checked against two deliberate breaks, each restored: the English closing line
    from the draft (`Color & item / Just right!`) fails two tests (it does not say what the child
    told, and it repeats "Just right" from the found message); `vague` with "just as you asked" fails
    one. The kid-reader rubric was applied by hand (table in the pull request); the agent itself was
    not run.

## 4. View: show the brought item

- [x] 4.1 `laneView` reads the brought item: `lit`, `wispTarget` and the name in the message come from
      `delivered(lane)`. Choosing shows `ready` or `pickAny`; a result shows `right`, `wrong` or
      `vague`. Add `lesson` (right result only). Remove `pickBoth`, `pickColor` and `pickThing`.
      (`messageAt` moves to 6.1, where the layout it points into is added.) The ask rule is still the old one here, so the screen behaves as before.
  - Requirements: REQ-3.1 (7), REQ-3.2 (2), REQ-3.3 (6), REQ-3.4 (1, 2), REQ-3.5 (1, 2)
  - Tests: `lane-view.test.ts`: states built directly, since the old rule cannot reach a one-card
    result; for every wish and every single card the lit slot and the wisp target are the brought
    item, the message names it, and no unpicked card is marked; the key per stage; `lesson` only on
    the right result, in both languages.
  - Done when: `npm run check` passes; `npm run kid` passes.
  - Result: `npm run check` passes on Node 26.13.0: 203 tests (9 new), mutation score 100% (67 mutants in
    `lane-view.ts`, none survived), `npm run kid` ok. `npm run font` left the font identical. Two
    deliberate breaks, each restored: a view that lights the pick instead of the brought item fails 4
    tests (the one-card cases and the "as you asked" case); a view that shows the closing line on
    every result fails 2. With the old ask rule the screen behaves as before, except that one card
    shows "Pick a card" instead of "Pick a thing"; 5.1 changes that to `ready`. Replaced test:
    "invites the child to pick, saying what is still missing" is now "invites the child to pick a
    card when none is picked".

## 5. Domain: one card is a request

- [x] 5.1 Flip the rule: `canAsk` uses `hasPick`, `outcome` uses `delivered`. Retire INV-6 and INV-7
      (definition and test together), add INV-8 to INV-14 with their property tests, update the unit
      tests of the old behavior, and update the model check.
  - Requirements: REQ-3.1, REQ-3.2, REQ-3.3, REQ-3.4, REQ-3.8 (2, 3, 4)
  - Tests: `reducer.test.ts`, `lane.test.ts`, `lane-view.test.ts` (armed, ring and fade for one
    card), `reducer.pbt.test.ts` (INV-5, INV-8 to INV-14), `reducer.model.test.ts` (280 states, the
    four goals, the old rule fails goals 3 and 4). Each new property and each new unit case is shown
    to fail on the old behavior.
  - Done when: `npm run check` passes with no surviving mutant and `check-trace` reports every INV as
    tested.
  - Result: `npm run check` passes on Node 26.13.0: 224 tests, mutation score 100% (313 mutants, none
    survived), `check-trace: 12 invariants, 0 without tests`, `npm run bench` runs (21 µs per 1,000
    events; CI compares it with the base branch). The model check reaches **280 states** (4 on the
    title, then 2 x 2 x 3 x 23), with all four invariants holding and goals 1 to 4 reachable from
    every state. Changing only `canAsk` and `outcome` first failed exactly the 10 tests of the old
    behavior in the table above, before they were replaced. **Old rule against the new tests:** with
    `canAsk` back to "both cards", 19 tests fail, among them INV-9, the one-card unit cases, the
    model goals for a color-only and an object-only result, and the view's armed, fade and `ready`
    cases. **Counterexample recorded in `reducer.model.test.ts`:** under the old rule, from the
    state "Start, pick red" (and from the start state with the full alphabet) the goal "a result
    for a color-only request" is `stuck` with an empty trace: no event leads to it; under the new
    rule the same start reaches it in one `Ask` (2 states). **Each invariant against a break**
    (lane.ts changed, then restored): `Ask` with no card allowed fails INV-8; the old ask rule
    fails INV-9; `Ask` that fills in the missing card fails INV-10; a dropped picked color fails
    INV-11 and INV-13; a missing card filled with the wish's own card fails INV-12; a complete
    request corrected toward the wish fails INV-11, INV-12 and INV-13; picking allowed after the
    search fails INV-14. One break made no test fail, and it is equivalent: `outcome` judging by the
    pick instead of by the brought item, because a request is right exactly when it is complete and
    equals the wish. It is written against the brought item to follow the requirement; no test can
    tell, and mutation testing finds nothing to complain about. INV-6 and INV-7 were deleted with
    their tests; the numbers are listed as retired in `domain-invariants.md` (without the `INV-`
    prefix, so the trace check does not count them). Replaced tests: see the table above. CI caught one I had planned for 7.1: the existing mobile smoke still expected a color alone to do nothing, so the smoke job failed on this PR. The step now expects a color alone to send the wisp (a minimal change; the full paths stay in 7.1), and the lint caught the import it left unused. After the fix `npm run check` passes again (224 tests) and the 6 smoke tests pass on a fresh build (Chromium; CI runs WebKit).

## 6. Scene: the closing line

- [x] 6.1 Add the result block to the layout (message position after a result, closing line panel and
      text), add `messageAt` to the view, and show them in `LaneScene`. Nothing shrinks, nothing is
      hidden.
  - Requirements: REQ-3.5 (1 to 4), REQ-3.7 (1)
  - Tests: `lane-layout.test.ts`: per stage, everything inside the canvas, no overlap, targets at
    least 80 px, the hero strip free. `lane-view.test.ts`: `messageAt` per stage. The scene is excluded from unit tests (ADR 0003); 7.1 checks it.
  - Done when: `npm run check` passes; `npm run build` passes; the built page was looked at in both
    languages.
  - Result: `npm run check` passes on Node 26.13.0: 230 tests, mutation score 100%, build and size
    budget ok (352.8 KB gzip of 1,024 KB). I looked at the built page, driven by real touch taps on
    Chromium with the iPhone 13 profile (WebKit cannot start here), in `ja` and `en`, at these
    steps: empty, one card picked, color-only result, object-only result, right result, next wish.
    Seen: with one card the ring and the "tap the wisp" message show; a vague result lights the
    brought item (red pumpkin for the yellow lantern wish with red only; red lantern with lantern
    only), names it, and shows the retry button; the right result shows the star, the found message,
    the closing line in its own bordered panel, and the button, with the wish row, the lane, the cards
    and the button all visible and no text smaller than before; the closing line is absent on the
    vague results. The English found message wraps with "right" alone on line 2; that is unchanged
    from 02 and I left it. Screenshots are in the git-ignored `e2e/screenshots` and are not
    attached.

## 7. Smoke

- [ ] 7.1 Mobile smoke: color only, ask, a different item with its name, retry, color and object,
      found with the closing line; object only, the same. Replace the old "a color alone is not a
      request" step. Desktop smoke with the mouse. A PNG pixel check shows the closing line on screen.
      Offline run in both languages. Update `e2e/helpers.ts`.
  - Requirements: REQ-3.1 to REQ-3.8
  - Tests: `e2e/smoke.mobile.spec.ts`, `e2e/smoke.desktop.spec.ts`. Each new test is shown to fail on
    a deliberately broken scene or rule: a scene that never draws the closing line, a rule that
    ignores one-card asks, a scene that draws the closing line on a different result.
  - Done when: `npm run check`, `npm run build` and the smoke pass; the screenshots were looked at.
  - Result:

## 8. Documents

- [ ] 8.1 `CHANGELOG.md`; the trial 1 row of `docs/learning-design.md` if it now disagrees; the
      traceability table below filled; a final run of everything.
  - Requirements: REQ-3.9
  - Tests: none (documents).
  - Done when: `npm run check` passes.
  - Result:

## Traceability

Filled in as tasks land: each row names the test file that fails when the requirement breaks.

| requirement | task | test | result |
|---|---|---|---|
| REQ-3.1 one card is enough to ask | 4.1, 5.1, 7.1 | `reducer.test.ts`, `reducer.pbt.test.ts` INV-9, `smoke.mobile.spec.ts` | |
| REQ-3.2 no card is not a request | 4.1, 5.1 | `reducer.pbt.test.ts` INV-8, `lane-view.test.ts` | |
| REQ-3.3 what the wisp brings | 2.1, 4.1, 5.1 | `lane.test.ts`, `reducer.pbt.test.ts` INV-10 to INV-13 | |
| REQ-3.4 compare, retry without blame | 3.1, 4.1, 5.1, 7.1 | `lane-content.test.ts`, `reducer.model.test.ts`, `smoke.mobile.spec.ts` | |
| REQ-3.5 the right result closes the lesson | 3.1, 4.1, 6.1, 7.1 | `lane-content.test.ts`, `lane-view.test.ts`, `lane-layout.test.ts`, `smoke.mobile.spec.ts` | |
| REQ-3.6 text lives in `src/content` | 3.1, 4.1 | `lane-content.test.ts`, `npm run kid`, `npm run font` | |
| REQ-3.7 what must keep working | 6.1, 7.1 | `lane-layout.test.ts`, both smokes | |
| REQ-3.8 pure rules, checked several ways | 5.1, 7.1 | PBT, model check, both smokes | |
| REQ-3.9 no gate gets weaker | every task | `git diff` shows no config, script or workflow change | |
