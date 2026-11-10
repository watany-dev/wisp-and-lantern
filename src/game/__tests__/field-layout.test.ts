import { describe, expect, it } from "vite-plus/test";
import { initialState } from "../../domain/state";
import {
  buttonRect,
  canvas,
  heroSize,
  heroStart,
  lessonBox,
  resultText,
  type Rect,
} from "../lane-layout";
import {
  fieldWisp,
  fieldWispSize,
  starArt,
  starBadge,
  starCenter,
  starLabel,
  starProbes,
  starRect,
  starSlot,
  titleArt,
  titleFieldButton,
} from "../field-layout";
import { guideText, titleArtBottom, titleShedButton } from "../shed-layout";

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

const indexes = [0, 1, 2, 3, 4];
const starRects = indexes.map(starRect);
const guide = box(guideText);
const message = box(resultText);
const wispAtBottom = square(fieldWisp, fieldWispSize);
const starsByName = Object.fromEntries(indexes.map((i) => [`star ${i}`, starRect(i)]));

/** Each stage of the field on its own: checking, all checked (the keep button), and kept. */
const stages: Record<string, Record<string, Rect>> = {
  checking: { guide, message, wisp: wispAtBottom, ...starsByName },
  ready: { guide, message, button: buttonRect, wisp: wispAtBottom, ...starsByName },
  kept: {
    guide,
    message,
    "closing line": lessonBox,
    button: buttonRect,
    wisp: wispAtBottom,
    ...starsByName,
  },
};

describe("field layout (REQ-6.9)", () => {
  it("puts the stars, the wisp and the title's button where the design says", () => {
    expect(indexes.map(starCenter)).toEqual([
      { x: 75, y: 170 },
      { x: 195, y: 170 },
      { x: 315, y: 170 },
      { x: 135, y: 270 },
      { x: 255, y: 270 },
    ]);
    expect(starSlot).toBe(88);
    expect(fieldWisp).toEqual({ x: 195, y: 720 });
    expect(fieldWispSize).toBe(60);
    expect(titleFieldButton).toEqual({ x: 195, y: 648, width: 300, height: 80 });
    expect(titleArt).toEqual({
      wisp: { x: 285, y: 538, scale: 2, bottom: 31 },
      hero: { x: 110, y: 548, scale: 1.6, bottom: 34 },
    });
  });

  it("makes every star a square slot, and every target at least 80 x 80", () => {
    for (const r of starRects) expect(r).toMatchObject({ width: 88, height: 88 });
    for (const r of [...starRects, buttonRect, titleFieldButton]) {
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

  it("keeps the order from the top: guide, two rows of stars, message, closing line, button, wisp", () => {
    expect(bottom(guide)).toBeLessThanOrEqual(Math.min(...starRects.map(top)));
    const upper = [0, 1, 2].map(starRect);
    const lower = [3, 4].map(starRect);
    expect(Math.max(...upper.map(bottom))).toBeLessThanOrEqual(Math.min(...lower.map(top)));
    expect(Math.max(...lower.map(bottom))).toBeLessThanOrEqual(top(message));
    expect(bottom(message)).toBeLessThanOrEqual(top(lessonBox));
    expect(bottom(lessonBox)).toBeLessThanOrEqual(top(buttonRect));
    expect(bottom(buttonRect)).toBeLessThanOrEqual(top(wispAtBottom));
  });

  it("puts three stars in the upper row and two in the lower row, each row centered", () => {
    expect(new Set([0, 1, 2].map((i) => starCenter(i).y)).size).toBe(1);
    expect(new Set([3, 4].map((i) => starCenter(i).y)).size).toBe(1);
    expect(starCenter(1).x).toBe(canvas.width / 2);
    expect((starCenter(3).x + starCenter(4).x) / 2).toBe(canvas.width / 2);
  });

  it("keeps the hero's start and the floor strip clear of every target and the wisp", () => {
    expect(heroStart).toEqual(initialState.hero);
    const hero = square(heroStart, heroSize);
    for (const [name, stage] of Object.entries(stages)) {
      for (const [what, r] of Object.entries(stage)) {
        expect(overlap(hero, r), `${name} / ${what}`).toBe(false);
      }
    }
  });
});

describe("a star's slot (REQ-6.3.2)", () => {
  const half = starSlot / 2;

  it("draws the star above the middle and its label below it, both inside the slot", () => {
    const starTop = starArt.y - starArt.radius * starArt.haloScale;
    const starBottom = starArt.y + starArt.radius * starArt.haloScale;
    expect(starTop).toBeGreaterThan(-half);
    expect(starBottom).toBeLessThan(starLabel.y - starLabel.height / 2);
    expect(starLabel.y + starLabel.height / 2).toBeLessThanOrEqual(half);
    expect(starLabel.size).toBe(18);
  });

  it("puts the tick badge at the top right, as drawPickedMark draws it for this slot", () => {
    expect(starBadge).toEqual({ x: 36, y: -36, radius: 15 });
    expect(starBadge.x + starBadge.radius).toBeLessThanOrEqual(half + 7);
  });

  it("reads each star at two points, the star's middle and the upper half of the badge", () => {
    expect(starProbes(0)).toEqual({ center: { x: 75, y: 160 }, badge: { x: 111, y: 124 } });
    expect(starProbes(4)).toEqual({ center: { x: 255, y: 260 }, badge: { x: 291, y: 224 } });
    for (const i of indexes) {
      const slot = starRect(i);
      const { center, badge } = starProbes(i);
      expect(center.x).toBe(slot.x);
      expect(center.y).toBe(slot.y + starArt.y);
      // The middle of the star is inside the star, clear of its label.
      expect(Math.abs(center.y - slot.y - starArt.y)).toBe(0);
      // The badge point is inside the disc, in its upper half, clear of the tick drawn across its middle.
      const dx = badge.x - (slot.x + starBadge.x);
      const dy = badge.y - (slot.y + starBadge.y);
      expect(Math.hypot(dx, dy)).toBeLessThan(starBadge.radius);
      expect(dy).toBeLessThanOrEqual(-8);
      expect(badge.y).toBeGreaterThan(top(slot) - 7);
    }
  });
});

describe("the title's two buttons (REQ-6.1.1)", () => {
  it("puts the field button inside the canvas, above the shed button and clear of it", () => {
    expect(left(titleFieldButton)).toBeGreaterThanOrEqual(0);
    expect(right(titleFieldButton)).toBeLessThanOrEqual(canvas.width);
    expect(overlap(titleFieldButton, titleShedButton)).toBe(false);
    expect(bottom(titleFieldButton)).toBeLessThanOrEqual(top(titleShedButton));
    expect(top(titleShedButton) - bottom(titleFieldButton)).toBeGreaterThanOrEqual(8);
  });

  it("moves the title's wisp and hero up so both end above the field button", () => {
    const wispBottom = titleArt.wisp.y + titleArt.wisp.scale * titleArt.wisp.bottom;
    const heroBottom = titleArt.hero.y + titleArt.hero.scale * titleArt.hero.bottom;
    expect(Math.max(wispBottom, heroBottom)).toBeLessThanOrEqual(titleArtBottom);
    expect(top(titleFieldButton)).toBeGreaterThan(titleArtBottom);
    expect(top(titleShedButton)).toBeGreaterThan(titleArtBottom);
  });

  it("keeps the title's wisp and hero below the intro text and inside the canvas", () => {
    // The intro is centered at y 430, two lines of 22 px.
    expect(titleArt.wisp.y - titleArt.wisp.scale * 31).toBeGreaterThan(430 + 22);
    expect(titleArt.hero.y - titleArt.hero.scale * 40).toBeGreaterThan(430 + 22);
    expect(titleArt.wisp.x + titleArt.wisp.scale * 30).toBeLessThanOrEqual(canvas.width);
    expect(titleArt.hero.x - titleArt.hero.scale * 30).toBeGreaterThanOrEqual(0);
  });
});
