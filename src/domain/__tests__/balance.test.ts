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

it("REQ-4.4: the wishes are all six lane items, and a wish never repeats the one before it", () => {
  expect(balance.wishes).toHaveLength(colors.length * things.length);
  balance.wishes.forEach((wish, i) => {
    const next = balance.wishes[(i + 1) % balance.wishes.length]!;
    expect(next.color, `after wish ${i}`).not.toBe(wish.color);
    expect(next.thing, `after wish ${i}`).not.toBe(wish.thing);
  });
});

it("REQ-4.1, REQ-4.3: the run is 60 seconds and a find scores 100 plus 50 per find in a row, up to 4", () => {
  expect(balance.runMs).toBe(60_000);
  expect(balance.score).toEqual({ find: 100, streakStep: 50, streakCap: 4 });
});
