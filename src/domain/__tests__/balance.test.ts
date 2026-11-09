// Scaffold stub: replaced by .kiro/specs/01-core-loop

import { expect, it } from "vite-plus/test";
import { balance } from "../balance";
import { colors, things } from "../lane";

it("balance constants are positive", () => {
  expect(balance.heroSpeed).toBeGreaterThan(0);
  expect(balance.wispSpeed).toBeGreaterThan(0);
});

it("REQ-2.5: every wish is one of the six lane items, and the wishes are all different", () => {
  const keys = balance.wishes.map((w) => `${w.color}/${w.thing}`);
  for (const w of balance.wishes) {
    expect(colors).toContain(w.color);
    expect(things).toContain(w.thing);
  }
  expect(new Set(keys).size).toBe(keys.length);
  expect(balance.wishes.length).toBeGreaterThanOrEqual(2);
});
