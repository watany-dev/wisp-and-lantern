import { describe, expect, it } from "vite-plus/test";
import { stepToward } from "../steer";

describe("stepToward", () => {
  it("moves speed * delta pixels along the line to the target", () => {
    // 100 px/s for 500 ms is 50 px; the target is 100 px to the right.
    expect(stepToward({ x: 10, y: 20 }, { x: 110, y: 20 }, 100, 500)).toEqual({ x: 60, y: 20 });
  });

  it("moves along a diagonal in proportion to each axis", () => {
    // 3-4-5 triangle: a 5 px step covers the whole 5 px distance, a 2.5 px step covers half.
    expect(stepToward({ x: 0, y: 0 }, { x: 3, y: 4 }, 2.5, 1000)).toEqual({ x: 1.5, y: 2 });
    expect(stepToward({ x: 0, y: 0 }, { x: -3, y: -4 }, 2.5, 1000)).toEqual({ x: -1.5, y: -2 });
  });

  it("lands on the target instead of overshooting it", () => {
    expect(stepToward({ x: 0, y: 0 }, { x: 30, y: 40 }, 1000, 1000)).toEqual({ x: 30, y: 40 });
  });

  it("returns null when the target is less than one pixel away", () => {
    expect(stepToward({ x: 5, y: 5 }, { x: 5, y: 5 }, 100, 16)).toBeNull();
    expect(stepToward({ x: 5, y: 5 }, { x: 5.99, y: 5 }, 100, 16)).toBeNull();
  });

  it("moves when the target is exactly one pixel away", () => {
    expect(stepToward({ x: 5, y: 5 }, { x: 6, y: 5 }, 100, 1000)).toEqual({ x: 6, y: 5 });
  });

  it("does not move when no time has passed", () => {
    expect(stepToward({ x: 0, y: 0 }, { x: 50, y: 0 }, 100, 0)).toEqual({ x: 0, y: 0 });
  });
});
