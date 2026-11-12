import { describe, expect, it } from "vite-plus/test";
import { buttonLockMs, pressable, setChanged } from "../button-lock";

describe("pressable (REQ-6.9.5)", () => {
  it("ignores a press while a new set of buttons is younger than the lock", () => {
    expect(pressable(1_000, 1_000)).toBe(false);
    expect(pressable(1_000 + buttonLockMs - 1, 1_000)).toBe(false);
  });

  it("accepts a press once the set has been on screen for the lock, and ever after", () => {
    expect(pressable(1_000 + buttonLockMs, 1_000)).toBe(true);
    expect(pressable(60_000, 1_000)).toBe(true);
  });

  it("keeps the lock long enough for a double tap and short enough to feel instant", () => {
    expect(buttonLockMs).toBeGreaterThanOrEqual(300);
    expect(buttonLockMs).toBeLessThanOrEqual(600);
  });
});

describe("setChanged", () => {
  it("is false for the same ids in the same order, empty included", () => {
    expect(setChanged([], [])).toBe(false);
    expect(setChanged(["keep"], ["keep"])).toBe(false);
    expect(setChanged(["real", "fake"], ["real", "fake"])).toBe(false);
  });

  it("is true when an id is added, removed, or replaced, even by an id in the same place", () => {
    expect(setChanged([], ["keep"])).toBe(true);
    expect(setChanged(["keep"], [])).toBe(true);
    expect(setChanged(["keep"], ["next"])).toBe(true);
    expect(setChanged(["real", "fake"], ["real", "keep"])).toBe(true);
    expect(setChanged(["again", "leave"], ["again"])).toBe(true);
  });
});
