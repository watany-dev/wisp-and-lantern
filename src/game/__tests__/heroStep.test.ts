import fc from "fast-check";
import { describe, expect, it } from "vite-plus/test";
import { stepToward } from "../heroStep";

describe("stepToward", () => {
  it("moves speed * delta toward a far target", () => {
    expect(stepToward({ x: 0, y: 0 }, { x: 100, y: 0 }, 100, 240)).toEqual({ x: 24, y: 0 });
    expect(stepToward({ x: 0, y: 0 }, { x: 0, y: -100 }, 500, 20)).toEqual({ x: 0, y: -10 });
  });

  it("moves along a diagonal", () => {
    const p = stepToward({ x: 0, y: 0 }, { x: 30, y: 40 }, 1000, 25);
    expect(p?.x).toBeCloseTo(15);
    expect(p?.y).toBeCloseTo(20);
  });

  it("clamps to the target instead of overshooting", () => {
    expect(stepToward({ x: 0, y: 0 }, { x: 5, y: 0 }, 1000, 240)).toEqual({ x: 5, y: 0 });
  });

  it("returns null below distance 1 and moves at exactly 1", () => {
    expect(stepToward({ x: 0, y: 0 }, { x: 0.99, y: 0 }, 1000, 240)).toBeNull();
    expect(stepToward({ x: 0, y: 0 }, { x: 0, y: 0 }, 1000, 240)).toBeNull();
    expect(stepToward({ x: 0, y: 0 }, { x: 1, y: 0 }, 1000, 240)).toEqual({ x: 1, y: 0 });
  });

  it("moves nothing when delta or speed is zero", () => {
    expect(stepToward({ x: 2, y: 3 }, { x: 50, y: 3 }, 0, 240)).toEqual({ x: 2, y: 3 });
    expect(stepToward({ x: 2, y: 3 }, { x: 50, y: 3 }, 16, 0)).toEqual({ x: 2, y: 3 });
  });

  it("never overshoots and moves at most speed * delta (property)", () => {
    const coord = fc.double({ min: -1000, max: 1000, noNaN: true });
    const point = fc.record({ x: coord, y: coord });
    fc.assert(
      fc.property(
        point,
        point,
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 500 }),
        (hero, target, deltaMs, speed) => {
          const remaining = Math.hypot(target.x - hero.x, target.y - hero.y);
          const next = stepToward(hero, target, deltaMs, speed);
          if (next === null) return remaining < 1;
          const moved = Math.hypot(next.x - hero.x, next.y - hero.y);
          return (
            moved <= Math.min(remaining, (speed * deltaMs) / 1000) + 1e-9 &&
            Math.hypot(target.x - next.x, target.y - next.y) <= remaining + 1e-9
          );
        },
      ),
    );
  });
});
