import { describe, expect, it } from "vite-plus/test";
import { initialState } from "../../domain/state";
import { dotAngles, rim } from "../field-look";
import {
  buttonRects,
  clearText,
  fieldMessage,
  fieldWisp,
  fieldWispSize,
  lensProbes,
  lensRect,
  lensStar,
  probesFor,
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
import { canvas, heroSize, heroStart, type Rect } from "../lane-layout";
import { guideText, titleArtBottom, titleShedButton } from "../shed-layout";
import { titleCard, titleIntro, titlePrompt } from "../title-layout";

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
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const inside = (p: { x: number; y: number }, r: Rect, margin = 0) =>
  p.x - margin >= left(r) &&
  p.x + margin <= right(r) &&
  p.y - margin >= top(r) &&
  p.y + margin <= bottom(r);

const round = (n: number) => Math.round(n * 1000) / 1000;
const indexes = [0, 1, 2, 3, 4];
const starRects = indexes.map(starRect);
const guide = box(guideText);
const message = box(fieldMessage);
const wispAtBottom = square(fieldWisp, fieldWispSize);
const starsByName = Object.fromEntries(indexes.map((i) => [`star ${i}`, starRect(i)]));
const clearTitle = { ...clearText.title, width: clearText.wrap, height: 36 };
const clearLesson = { ...clearText.lesson, width: clearText.wrap, height: 58 };

/** Each stage of the field on its own. The lens place is empty, holds the lens, or holds the clear panel. */
const stages: Record<string, Record<string, Rect>> = {
  idle: { guide, message, wisp: wispAtBottom, lens: lensRect, ...starsByName },
  looking: {
    guide,
    message,
    wisp: wispAtBottom,
    lens: lensRect,
    real: buttonRects.left,
    fake: buttonRects.right,
    ...starsByName,
  },
  ready: {
    guide,
    message,
    wisp: wispAtBottom,
    lens: lensRect,
    keep: buttonRects.single,
    ...starsByName,
  },
  kept: {
    guide,
    message,
    wisp: wispAtBottom,
    lens: lensRect,
    next: buttonRects.single,
    ...starsByName,
  },
  cleared: {
    guide,
    message,
    wisp: wispAtBottom,
    "clear word": clearTitle,
    "closing line": clearLesson,
    again: buttonRects.left,
    leave: buttonRects.right,
    ...starsByName,
  },
};

describe("field layout (REQ-6.9)", () => {
  it("puts the stars, the wisp and the title's button where the design says", () => {
    expect(indexes.map(starCenter)).toEqual([
      { x: 75, y: 160 },
      { x: 195, y: 160 },
      { x: 315, y: 160 },
      { x: 135, y: 256 },
      { x: 255, y: 256 },
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

  it("makes every star a square slot, and every target (star, button) at least 80 x 80", () => {
    for (const r of starRects) expect(r).toMatchObject({ width: 88, height: 88 });
    for (const r of [...starRects, ...Object.values(buttonRects), titleFieldButton]) {
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

describe("field layout, order and spacing (REQ-6.9)", () => {
  it("keeps the order from the top: guide, two rows of stars, message, lens, buttons, wisp", () => {
    expect(bottom(guide)).toBeLessThanOrEqual(Math.min(...starRects.map(top)));
    const upper = [0, 1, 2].map(starRect);
    const lower = [3, 4].map(starRect);
    expect(Math.max(...upper.map(bottom))).toBeLessThanOrEqual(Math.min(...lower.map(top)));
    expect(Math.max(...lower.map(bottom))).toBeLessThanOrEqual(top(message));
    expect(bottom(message)).toBeLessThanOrEqual(top(lensRect));
    for (const r of Object.values(buttonRects)) {
      expect(bottom(lensRect)).toBeLessThanOrEqual(top(r));
      expect(bottom(r)).toBeLessThanOrEqual(top(wispAtBottom));
    }
  });

  it("keeps the clear panel's texts inside the lens place, the word above the closing line", () => {
    expect(inside(clearTitle, lensRect)).toBe(true);
    expect(inside(clearLesson, lensRect)).toBe(true);
    expect(bottom(clearTitle)).toBeLessThanOrEqual(top(clearLesson));
  });

  it("puts two buttons side by side with a gap, and one wide button over both", () => {
    const { left: a, right: b, single } = buttonRects;
    expect(right(a)).toBeLessThan(left(b));
    expect(left(b) - right(a)).toBeGreaterThanOrEqual(8);
    expect(left(single)).toBeLessThanOrEqual(left(a));
    expect(right(single)).toBeGreaterThanOrEqual(right(b));
    expect(a.y).toBe(b.y);
    expect(a.y).toBe(single.y);
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

describe("inside a star's slot", () => {
  it("fits the star, its rim and its word in the slot without touching", () => {
    const slot = starRect(0);
    const half = starSlot / 2;
    const rimOuter = starArt.radius * (rim.radius + rim.lineWidth / 2);
    expect(starArt.y - rimOuter).toBeGreaterThanOrEqual(-half);
    expect(starArt.y + rimOuter).toBeLessThanOrEqual(starLabel.y - starLabel.size / 2);
    expect(rimOuter).toBeLessThanOrEqual(half);
    expect(starLabel.y + starLabel.size / 2).toBeLessThanOrEqual(half);
    expect(slot.width).toBe(starSlot);
  });

  it("puts the tick badge at the top right corner of the slot", () => {
    expect(starBadge).toEqual({ x: 36, y: -36, radius: 15 });
  });
});

describe("the probes the smoke reads (REQ-6.13.2)", () => {
  const samples = 2;
  it("reads the middle of a star, a point in its halo, and two points on its rim", () => {
    const at = starCenter(3);
    const probes = starProbes(3);
    expect(probes.center).toEqual({ x: at.x, y: at.y + starArt.y });
    expect(distance(probes.glow, probes.center)).toBeCloseTo(starArt.radius * 1.3, 8);
    expect(distance(probes.dot, probes.center)).toBeCloseTo(starArt.radius * rim.radius, 8);
    expect(distance(probes.gap, probes.center)).toBeCloseTo(starArt.radius * rim.radius, 8);
  });

  it("puts the probes at exact places: the halo probe 18 degrees below the right, the rim probes at 0 and 15 degrees", () => {
    const at = starCenter(3);
    const probes = starProbes(3);
    const middle = { x: at.x, y: at.y + starArt.y };
    const radius = starArt.radius;
    const angle = (18 * Math.PI) / 180;
    expect(round(probes.glow.x)).toBe(round(middle.x + radius * 1.3 * Math.cos(angle)));
    expect(round(probes.glow.y)).toBe(round(middle.y + radius * 1.3 * Math.sin(angle)));
    expect(round(probes.dot.x)).toBe(round(middle.x + radius * rim.radius));
    expect(round(probes.dot.y)).toBe(round(middle.y));
    const half = Math.PI / rim.dots;
    expect(round(probes.gap.x)).toBe(round(middle.x + radius * rim.radius * Math.cos(half)));
    expect(round(probes.gap.y)).toBe(round(middle.y + radius * rim.radius * Math.sin(half)));
    expect(probes.glow.y).toBeGreaterThan(middle.y);
    expect(probes.gap.y).toBeGreaterThan(middle.y);
  });

  it("puts the halo probe clear of the star's points and inside the rim, and the rim probes on the rim", () => {
    const outer = starArt.radius * 1.12;
    const inner = starArt.radius * (rim.radius - rim.lineWidth / 2);
    for (const i of [0, 1, 2, 3, 4]) {
      const p = starProbes(i);
      const glow = distance(p.glow, p.center);
      expect(glow - samples).toBeGreaterThan(outer);
      expect(glow + samples).toBeLessThan(inner);
      expect(inside(p.dot, starRect(i), samples)).toBe(true);
      expect(inside(p.gap, starRect(i), samples)).toBe(true);
    }
  });

  it("puts the gap probe half a step round from a dot, far enough from both dots to read dark", () => {
    const p = starProbes(0);
    const step = dotAngles[1]! - dotAngles[0]!;
    const radius = starArt.radius * rim.radius;
    const dotCenters = dotAngles.map((a) => ({
      x: p.center.x + radius * Math.cos(a),
      y: p.center.y + radius * Math.sin(a),
    }));
    expect(distance(p.dot, dotCenters[0]!)).toBeCloseTo(0, 8);
    const nearest = Math.min(...dotCenters.map((c) => distance(p.gap, c)));
    expect(nearest).toBeCloseTo(2 * radius * Math.sin(step / 4), 8);
    expect(nearest - starArt.radius * rim.dotRadius - samples).toBeGreaterThan(1.5);
  });

  it("keeps the badge probe in the upper half of the badge's disc, in the slot's corner", () => {
    const at = starCenter(2);
    const { badge } = starProbes(2);
    expect(badge).toEqual({ x: at.x + starBadge.x, y: at.y + starBadge.y - 10 });
    expect(distance(badge, { x: at.x + starBadge.x, y: at.y + starBadge.y })).toBeLessThan(
      starBadge.radius,
    );
  });

  it("reads the star in the lens the same way, on a larger star inside the lens place", () => {
    const middle = { x: lensRect.x, y: lensRect.y };
    expect(lensProbes).toEqual(probesFor(middle, lensStar.radius));
    expect(lensStar.radius).toBeGreaterThan(starArt.radius * 1.5);
    const rimOuter = lensStar.radius * (rim.radius + rim.lineWidth / 2);
    expect(rimOuter).toBeLessThan(lensRect.height / 2);
    for (const p of [lensProbes.center, lensProbes.glow, lensProbes.dot, lensProbes.gap]) {
      expect(inside(p, lensRect, samples)).toBe(true);
    }
  });
});

describe("the title's two buttons and Trial 1's card (REQ-6.1.1, REQ-6.1.6)", () => {
  it("keeps the field button inside the canvas, apart from the shed button by at least 8", () => {
    expect(left(titleFieldButton)).toBeGreaterThanOrEqual(0);
    expect(right(titleFieldButton)).toBeLessThanOrEqual(canvas.width);
    expect(overlap(titleFieldButton, titleShedButton)).toBe(false);
    expect(top(titleShedButton) - bottom(titleFieldButton)).toBeGreaterThanOrEqual(8);
  });

  it("moves the title's wisp and hero up so both end above the field button", () => {
    const wispBottom = titleArt.wisp.y + titleArt.wisp.scale * titleArt.wisp.bottom;
    const heroBottom = titleArt.hero.y + titleArt.hero.scale * titleArt.hero.bottom;
    expect(Math.max(wispBottom, heroBottom)).toBeLessThanOrEqual(titleArtBottom);
    expect(top(titleFieldButton)).toBeGreaterThan(titleArtBottom);
    expect(top(titleShedButton)).toBeGreaterThan(titleArtBottom);
  });

  it("keeps the title's wisp and hero below Trial 1's card and inside the canvas", () => {
    expect(titleArt.wisp.y - titleArt.wisp.scale * 31).toBeGreaterThan(bottom(titleCard));
    expect(titleArt.hero.y - titleArt.hero.scale * 40).toBeGreaterThan(bottom(titleCard));
    expect(titleArt.wisp.x + titleArt.wisp.scale * 30).toBeLessThanOrEqual(canvas.width);
    expect(titleArt.hero.x - titleArt.hero.scale * 30).toBeGreaterThanOrEqual(0);
  });

  it("holds Trial 1's way in and its 60 seconds in one card that touches neither button", () => {
    const prompt = { ...titlePrompt, width: 300, height: titlePrompt.size + 8 };
    const intro = { ...titleIntro, width: 300, height: 2 * titleIntro.size + 8 };
    expect(inside(prompt, titleCard)).toBe(true);
    expect(inside(intro, titleCard)).toBe(true);
    expect(bottom(prompt)).toBeLessThanOrEqual(top(intro));
    for (const button of [titleFieldButton, titleShedButton]) {
      expect(overlap(titleCard, button)).toBe(false);
      expect(top(button) - bottom(titleCard)).toBeGreaterThan(100);
    }
    expect(left(titleCard)).toBeGreaterThanOrEqual(0);
    expect(right(titleCard)).toBeLessThanOrEqual(canvas.width);
  });
});
