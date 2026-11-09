import { describe, expect, it } from "vite-plus/test";
import { maxTickMs, tickMs } from "../clock";

describe("tickMs (REQ-4.2)", () => {
  it("passes a normal frame through", () => {
    expect(tickMs(16)).toBe(16);
    expect(tickMs(16.7)).toBe(16.7);
  });

  it("counts a stalled frame as at most a quarter of a second", () => {
    expect(maxTickMs).toBe(250);
    expect(tickMs(250)).toBe(250);
    expect(tickMs(251)).toBe(250);
    expect(tickMs(60_000)).toBe(250);
  });

  it("never goes below zero", () => {
    expect(tickMs(0)).toBe(0);
    expect(tickMs(-20)).toBe(0);
  });
});
