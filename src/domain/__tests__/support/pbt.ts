import fc from "fast-check";
import recorded from "./pbt-regressions.json" with { type: "json" };

/**
 * A counterexample fast-check once found, replayed on every run so the bug stays fixed.
 * Copy `seed` and `path` from the failure message ("seed: 123, path: \"4:0:1\"").
 */
type Regression = { property: string; seed: number; path: string; note: string };

const regressions: Regression[] = recorded;

/**
 * Runs `property` under `name`: first every recorded counterexample for that name, then a
 * normal run (`FC_RUNS` and `FC_SEED` from vitest.setup.ts). Use it instead of `fc.assert`.
 */
export function checkProperty<Ts extends [unknown, ...unknown[]]>(
  name: string,
  property: fc.IProperty<Ts>,
): void {
  for (const r of regressions.filter((x) => x.property === name)) {
    fc.assert(property, { seed: r.seed, path: r.path, endOnFailure: true });
  }
  fc.assert(property);
}

/** Freezes `value` and everything it reaches, so a mutating reducer throws in strict mode. */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}
