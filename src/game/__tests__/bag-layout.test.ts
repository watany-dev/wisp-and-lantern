import { describe, expect, it } from "vite-plus/test";
import { initialState } from "../../domain/state";
import {
  addressPin,
  bagLesson,
  bagMessage,
  givenProbe,
  itemArt,
  itemCard,
  itemCenter,
  itemLabel,
  itemRect,
  keptProbe,
  lockBadge,
  ruleLock,
  rulePictures,
  ruleProbes,
  rulePinProbe,
  rulesRect,
  shadowSize,
  shadowSpots,
  tickBadge,
  titleBagButton,
} from "../bag-layout";
import { buttonRects, fieldWisp, fieldWispSize, titleArt, titleFieldButton } from "../field-layout";
import { canvas, heroSize, heroStart, hudBar, hudScore, hudTime, type Rect } from "../lane-layout";
import { guideText, leaveButton, titleArtBottom, titleShedButton } from "../shed-layout";
import { titleCard } from "../title-layout";

const left = (r: Rect) => r.x - r.width / 2;
const right = (r: Rect) => r.x + r.width / 2;
const top = (r: Rect) => r.y - r.height / 2;
const bottom = (r: Rect) => r.y + r.height / 2;
const overlap = (a: Rect, b: Rect) =>
  left(a) < right(b) && left(b) < right(a) && top(a) < bottom(b) && top(b) < bottom(a);
const square = (c: { x: number; y: number }, size: number): Rect => ({
  ...c,
  width: size,
  height: size,
});
const box = (t: { x: number; y: number; wrap: number; height: number }): Rect => ({
  x: t.x,
  y: t.y,
  width: t.wrap,
  height: t.height,
});
const inside = (p: { x: number; y: number }, r: Rect) =>
  p.x >= left(r) && p.x <= right(r) && p.y >= top(r) && p.y <= bottom(r);
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

const places = [0, 1, 2, 3, 4];
const items = places.map(itemRect);
const guide = box(guideText);
const message = box(bagMessage);
const wisp = square(fieldWisp, fieldWispSize);
const shadows = shadowSpots.map((p) => ({ ...p, ...shadowSize }));
const itemsByName = Object.fromEntries(places.map((i) => [`thing ${i}`, itemRect(i)]));
const always = {
  clock: hudTime,
  bar: hudBar,
  score: hudScore,
  title: leaveButton,
  guide,
  message,
  rules: rulesRect,
  wisp,
  "shadow left": shadows[0]!,
  "shadow right": shadows[1]!,
  ...itemsByName,
};
/** Each stage of the bag: a round in progress has no button; a done round has "Next". */
const stages: Record<string, Record<string, Rect>> = {
  giving: always,
  done: { ...always, next: buttonRects.single },
};

describe("bag layout (REQ-7.9)", () => {
  it("puts the things, the wisp, the shadows and the title's button where the design says", () => {
    expect(places.map(itemCenter)).toEqual([
      { x: 75, y: 160 },
      { x: 195, y: 160 },
      { x: 315, y: 160 },
      { x: 135, y: 268 },
      { x: 255, y: 268 },
    ]);
    expect(itemCard).toEqual({ width: 104, height: 100 });
    expect(bagMessage).toEqual({ x: 195, y: 354, wrap: 340, height: 60 });
    expect(rulesRect).toEqual({ x: 195, y: 440, width: 340, height: 96 });
    expect(shadowSpots).toEqual([
      { x: 92, y: 708 },
      { x: 298, y: 708 },
    ]);
    expect(titleBagButton).toEqual({ x: 195, y: 560, width: 300, height: 80 });
  });

  it("makes every target (thing, button) at least 80 x 80", () => {
    for (const r of [...items, buttonRects.single, leaveButton, titleBagButton]) {
      expect(r.width).toBeGreaterThanOrEqual(80);
      expect(r.height).toBeGreaterThanOrEqual(80);
    }
  });

  it.each(Object.keys(stages))("keeps the %s stage inside the canvas", (name) => {
    for (const [what, r] of Object.entries(stages[name]!)) {
      expect(left(r), what).toBeGreaterThanOrEqual(0);
      expect(top(r), what).toBeGreaterThanOrEqual(0);
      expect(right(r), what).toBeLessThanOrEqual(canvas.width);
      expect(bottom(r), what).toBeLessThanOrEqual(canvas.height);
    }
  });

  it.each(Object.keys(stages))("keeps the %s stage free of overlap", (name) => {
    const stage = stages[name]!;
    const names = Object.keys(stage);
    for (const [i, a] of names.entries()) {
      for (const b of names.slice(i + 1)) {
        expect(overlap(stage[a]!, stage[b]!), `${a} / ${b}`).toBe(false);
      }
    }
  });
});

describe("bag layout, order and spacing (REQ-7.9)", () => {
  it("keeps the order from the top: guide, two rows of things, message, rule card, Next, hero, wisp", () => {
    expect(bottom(guide)).toBeLessThanOrEqual(Math.min(...items.map(top)));
    const upper = [0, 1, 2].map(itemRect);
    const lower = [3, 4].map(itemRect);
    expect(top(lower[0]!) - Math.max(...upper.map(bottom))).toBeGreaterThanOrEqual(8);
    expect(Math.max(...lower.map(bottom))).toBeLessThanOrEqual(top(message));
    expect(bottom(message)).toBeLessThanOrEqual(top(rulesRect));
    expect(bottom(rulesRect)).toBeLessThanOrEqual(top(buttonRects.single));
    expect(bottom(buttonRects.single)).toBeLessThanOrEqual(heroStart.y - heroSize / 2);
    expect(heroStart.y + heroSize / 2).toBeLessThanOrEqual(top(wisp));
  });

  it("keeps the things apart side by side, three above and two below, each row centered", () => {
    expect(left(itemRect(1)) - right(itemRect(0))).toBeGreaterThanOrEqual(8);
    expect(left(itemRect(4)) - right(itemRect(3))).toBeGreaterThanOrEqual(8);
    expect(itemCenter(1).x).toBe(canvas.width / 2);
    expect((itemCenter(3).x + itemCenter(4).x) / 2).toBe(canvas.width / 2);
  });

  it("keeps the hero's start and the floor strip clear of every target, the wisp and the shadows", () => {
    expect(heroStart).toEqual(initialState.hero);
    const hero = square(heroStart, heroSize);
    for (const [name, stage] of Object.entries(stages)) {
      for (const [what, r] of Object.entries(stage)) {
        expect(overlap(hero, r), `${name} / ${what}`).toBe(false);
      }
    }
  });

  it("puts the shadows beside the wisp, one on each side, and clear of the way back to the title", () => {
    expect(right(shadows[0]!)).toBeLessThan(left(wisp));
    expect(left(shadows[1]!)).toBeGreaterThan(right(wisp));
    for (const s of shadows) {
      expect(s.y).toBe(fieldWisp.y - 12);
      expect(overlap(s, leaveButton)).toBe(false);
    }
  });

  it("keeps the closing line inside the rule card's place, which it takes over once a round is done", () => {
    expect(bagLesson).toMatchObject({ x: rulesRect.x, y: rulesRect.y });
    expect(bagLesson.wrap).toBeLessThanOrEqual(rulesRect.width - 16);
    // Two lines of 22 px letters.
    expect(2 * 30).toBeLessThanOrEqual(rulesRect.height);
  });
});

describe("inside a thing's card, and the rule card (REQ-7.2.3, REQ-7.4.6)", () => {
  const card = { x: 0, y: 0, ...itemCard };
  const picture = square({ x: 0, y: itemArt.y }, itemArt.size);
  const name = { x: 0, y: itemLabel.y, width: itemCard.width - 8, height: itemLabel.size + 4 };
  const tick = square(tickBadge, 2 * tickBadge.radius);
  const lock = square(lockBadge, 2 * lockBadge.radius);

  it("puts the picture, the name and both badges inside the card, apart from each other", () => {
    for (const r of [picture, name]) {
      expect(left(r)).toBeGreaterThanOrEqual(left(card));
      expect(right(r)).toBeLessThanOrEqual(right(card));
      expect(top(r)).toBeGreaterThanOrEqual(top(card));
      expect(bottom(r)).toBeLessThanOrEqual(bottom(card));
    }
    expect(overlap(picture, name)).toBe(false);
    for (const badge of [tick, lock]) {
      expect(overlap(badge, picture)).toBe(false);
      expect(overlap(badge, name)).toBe(false);
    }
    expect(overlap(tick, lock)).toBe(false);
    expect(lock.x).toBeLessThan(0);
    expect(tick.x).toBeGreaterThan(0);
  });

  it("puts the tick badge where `drawPickedMark` draws it for a card of this size", () => {
    expect(tickBadge).toEqual({ x: 44, y: -42, radius: 15 });
  });

  it("puts the three pictures of the rule card inside it, apart, each with its padlock", () => {
    const pictures = rulePictures.xs.map((x) => square({ x, y: rulesRect.y }, rulePictures.size));
    for (const [i, p] of pictures.entries()) {
      const padlock = square({ x: p.x + ruleLock.x, y: p.y + ruleLock.y }, 2 * ruleLock.radius);
      for (const r of [p, padlock]) {
        expect(left(r)).toBeGreaterThanOrEqual(left(rulesRect));
        expect(right(r)).toBeLessThanOrEqual(right(rulesRect));
        expect(top(r)).toBeGreaterThanOrEqual(top(rulesRect));
        expect(bottom(r)).toBeLessThanOrEqual(bottom(rulesRect));
      }
      const next = pictures[i + 1];
      if (next) expect(overlap(padlock, next)).toBe(false);
    }
    expect(rulePictures.xs[1]).toBe(rulesRect.x);
  });
});

describe("the points the smoke reads (REQ-7.13.2)", () => {
  it("reads the tick on the upper half of its badge, inside the card", () => {
    for (const i of places) {
      const at = itemCenter(i);
      const p = givenProbe(i);
      expect(p).toEqual({ x: at.x + 44, y: at.y - 47 });
      expect(distance(p, { x: at.x + tickBadge.x, y: at.y + tickBadge.y })).toBeLessThan(
        tickBadge.radius,
      );
      expect(inside(p, itemRect(i))).toBe(true);
    }
  });

  it("reads the padlock badge on its dark disc, left of the padlock and clear of the picture", () => {
    for (const i of places) {
      const at = itemCenter(i);
      const p = keptProbe(i);
      expect(p).toEqual({ x: at.x - 47, y: at.y - 36 });
      const middle = { x: at.x + lockBadge.x, y: at.y + lockBadge.y };
      expect(distance(p, middle)).toBeLessThan(lockBadge.radius);
      expect(distance(p, middle)).toBeGreaterThan(6);
      expect(inside(p, itemRect(i))).toBe(true);
    }
  });

  it("reads the red head of the address picture's pin on the rule card, clear of the padlocks", () => {
    expect(addressPin).toEqual({ x: 0.22, y: -0.24, radius: 0.13 });
    expect(rulePinProbe.x).toBeCloseTo(204.68, 2);
    expect(rulePinProbe.y).toBeCloseTo(429.44, 2);
    // The pin's head is the second picture's (the address), inside the rule card.
    expect(rulePinProbe.x - rulePictures.xs[1]).toBeCloseTo(addressPin.x * rulePictures.size, 5);
    expect(inside(rulePinProbe, rulesRect)).toBe(true);
    for (const p of ruleProbes) expect(distance(p, rulePinProbe)).toBeGreaterThan(20);
  });

  it("reads each padlock of the rule card on its white body, just below the middle of its badge", () => {
    expect(ruleProbes).toEqual([
      { x: 127, y: 460 },
      { x: 217, y: 460 },
      { x: 307, y: 460 },
    ]);
    for (const [i, p] of ruleProbes.entries()) {
      const middle = { x: rulePictures.xs[i]! + ruleLock.x, y: rulesRect.y + ruleLock.y };
      expect(distance(p, middle)).toBeLessThan(ruleLock.radius * 0.3);
      expect(p.y).toBeGreaterThan(middle.y);
    }
  });
});

describe("the title's three buttons and trial 1's card (REQ-7.1.1)", () => {
  it("puts the bag's button above the field's, 8 apart, and keeps the field's and the shed's where they were", () => {
    expect(titleFieldButton).toEqual({ x: 195, y: 648, width: 300, height: 80 });
    expect(titleShedButton).toEqual({ x: 195, y: 736, width: 300, height: 80 });
    expect(top(titleFieldButton) - bottom(titleBagButton)).toBe(8);
    expect(overlap(titleBagButton, titleFieldButton)).toBe(false);
    expect(left(titleBagButton)).toBeGreaterThanOrEqual(0);
    expect(right(titleBagButton)).toBeLessThanOrEqual(canvas.width);
  });

  it("keeps the title's wisp and hero above the bag's button, and below trial 1's card", () => {
    const wispBottom = titleArt.wisp.y + titleArt.wisp.scale * titleArt.wisp.bottom;
    const heroBottom = titleArt.hero.y + titleArt.hero.scale * titleArt.hero.bottom;
    expect(Math.max(wispBottom, heroBottom)).toBeLessThanOrEqual(titleArtBottom);
    expect(top(titleBagButton)).toBeGreaterThan(titleArtBottom);
    expect(titleArt.wisp.y - titleArt.wisp.scale * 31).toBeGreaterThan(bottom(titleCard));
    expect(titleArt.hero.y - titleArt.hero.scale * 40).toBeGreaterThan(bottom(titleCard));
    expect(top(titleBagButton) - bottom(titleCard)).toBeGreaterThan(100);
  });

  it("leaves the middle of the canvas, where a tap starts trial 1, free of every button", () => {
    const middle = { x: canvas.width / 2, y: canvas.height / 2 };
    for (const button of [titleBagButton, titleFieldButton, titleShedButton]) {
      expect(inside(middle, button)).toBe(false);
    }
  });
});
