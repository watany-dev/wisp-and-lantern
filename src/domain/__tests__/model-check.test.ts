// The checker must catch broken models, or a passing model check proves nothing.

import { describe, expect, it } from "vite-plus/test";
import { checkModel, type Model } from "./support/model-check";

type Ev = "inc" | "dec" | "reset";

/** A counter from 0 to 4: inc, dec and reset. Every state can reach 0 and 4. */
const counter: Model<number, Ev> = {
  initial: 0,
  events: () => ["inc", "dec", "reset"],
  step: (n, e) => (e === "inc" ? Math.min(n + 1, 4) : e === "dec" ? Math.max(n - 1, 0) : 0),
  invariants: { "in range": (n) => n >= 0 && n <= 4 },
  goal: (n) => n === 4,
};

// "dec" at 0 falls into -1, and nothing leads out of -1. The goal stays reachable from 0..3.
const trapped = (n: number, e: Ev) => n === -1 || (n === 0 && e === "dec");

describe("checkModel", () => {
  it("visits every reachable state of a correct model and reports nothing", () => {
    expect(checkModel(counter)).toEqual({ states: 5, violations: [] });
  });

  it("reports a broken invariant with the shortest trace", () => {
    const r = checkModel({
      ...counter,
      step: (n: number, e: Ev) => (e === "inc" ? Math.min(n + 1, 6) : n),
      goal: undefined,
    });
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0]).toEqual({
      kind: "invariant",
      name: "in range",
      state: 5,
      trace: ["inc", "inc", "inc", "inc", "inc"],
    });
  });

  it("reports a soft-lock: a state from which the goal can never be reached", () => {
    const trap = {
      ...counter,
      invariants: {},
      step: (n: number, e: Ev) => (trapped(n, e) ? -1 : counter.step(n, e)),
    };
    expect(checkModel(trap).violations).toEqual([
      { kind: "stuck", name: "goal", state: -1, trace: ["dec"] },
    ]);
  });

  it("refuses models that are too large instead of running forever", () => {
    const unbounded = { ...counter, step: (n: number) => n + 1, invariants: {}, maxStates: 50 };
    expect(() => checkModel(unbounded)).toThrow("more than 50 states");
  });

  it("uses the key to merge states that differ only in ignored fields", () => {
    const r = checkModel({
      initial: { n: 0, seen: 0 },
      events: () => ["inc"] as const,
      step: (s) => ({ n: Math.min(s.n + 1, 2), seen: s.seen + 1 }),
      invariants: {},
      key: (s) => String(s.n),
    });
    expect(r.states).toBe(3);
  });
});
