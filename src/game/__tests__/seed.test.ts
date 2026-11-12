import { describe, expect, it } from "vite-plus/test";
import { newSeed } from "../seed";

describe("newSeed (REQ-6.12.1)", () => {
  it("turns the random number into a whole number from 0 up to 2 to the 32nd", () => {
    expect(newSeed(() => 0)).toBe(0);
    expect(newSeed(() => 0.5)).toBe(2 ** 31);
    expect(newSeed(() => 0.999999999)).toBe(4_294_967_291);
    expect(newSeed(() => 0.25)).toBe(1_073_741_824);
  });

  it("uses Math.random by default and stays a whole number", () => {
    for (let i = 0; i < 50; i += 1) {
      const seed = newSeed();
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(2 ** 32);
    }
  });
});
