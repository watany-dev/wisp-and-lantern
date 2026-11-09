# Property-based testing: trial 1 (The Dark Lane)

Source: `src/domain/__tests__/reducer.pbt.test.ts`, run through `checkProperty`. Spec: `.kiro/specs/02-trial-tell/`.

| id | property | generator | result |
|---|---|---|---|
| INV-1, INV-2 | `phase` is `title` or `trial`; `trial` is a non-negative integer | event arrays up to 40 events (`Start`, `SetLang`, `MoveHeroTo`, `PickCard`, `Ask`, `Retry`) | holds |
| INV-3 | `reduce` never mutates its input (deep-frozen state) | same | holds |
| INV-4 | replaying the same events gives an equal state | same | holds |
| INV-5 | `lane.asked` turns true only on an `Ask`, so a sequence without `Ask` never searches | same, `PickCard` weighted 3 and `Ask` 2 so searches are reached | holds |
| INV-6 | `Ask` with a card missing, or after a search, returns the same state object | same | holds |
| INV-7 | after a search the pick is complete and only `Retry` changes the lane | same | holds |

- No counterexample was found, so `pbt-regressions.json` is unchanged.
- Each new property was run against a deliberately broken `lane.ts` (restored afterwards) to show it can fail:
  - `Ask` without the completeness check fails INV-6 and INV-7.
  - Picking allowed after a search fails INV-7.
  - A second pick that searches by itself fails INV-5.
- A `Retry` that keeps the pick passes every INV. It is covered by two unit tests in `reducer.test.ts`, not by an invariant.
- The model check (`reducer.model.test.ts`) complements these: 220 reachable states, four state invariants, the right result and the choosing state reachable from every one, and a soft-lock reported when `Retry` is removed from the alphabet.
