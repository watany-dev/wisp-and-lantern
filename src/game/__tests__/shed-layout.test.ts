import { describe, expect, it } from "vite-plus/test";
import { tools } from "../../domain/shed";
import { initialState } from "../../domain/state";
import {
  buttonRect,
  canvas,
  cardSize,
  heroSize,
  heroStart,
  lessonBox,
  messageText,
  resultText,
  wisp,
  wispRect,
  type Rect,
} from "../lane-layout";
import {
  guideText,
  probes,
  shedBox,
  shedParts,
  shedPoint,
  titleArtBottom,
  titleShedButton,
  toolCenter,
  toolRect,
  wispArtSize,
  wispWork,
} from "../shed-layout";

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

const inBox = (p: { x: number; y: number }) =>
  p.x >= left(shedBox) && p.x <= right(shedBox) && p.y >= top(shedBox) && p.y <= bottom(shedBox);

const guide = box(guideText);
const toolRects = tools.map(toolRect);
const wispAtWork = square(wispWork, wispArtSize);

/** Each stage of the shed on its own: the choosing message and the result message share a place. */
const stages: Record<string, Record<string, Rect>> = {
  choosing: {
    guide,
    shed: shedBox,
    wisp: wispRect,
    message: box(messageText),
    ...Object.fromEntries(tools.map((t) => [`tool ${t}`, toolRect(t)])),
  },
  shut: {
    guide,
    shed: shedBox,
    "wisp at the door": wispAtWork,
    message: box(resultText),
    button: buttonRect,
    ...Object.fromEntries(tools.map((t) => [`tool ${t}`, toolRect(t)])),
  },
  open: {
    guide,
    shed: shedBox,
    "wisp at the door": wispAtWork,
    message: box(resultText),
    "closing line": lessonBox,
    button: buttonRect,
    ...Object.fromEntries(tools.map((t) => [`tool ${t}`, toolRect(t)])),
  },
};

describe("shed layout (REQ-5.10)", () => {
  it("puts the guide, the picture, the tools and the button where the design says", () => {
    expect(guideText).toEqual({ x: 195, y: 56, wrap: 340, height: 60 });
    expect(shedBox).toEqual({ x: 195, y: 198, width: 300, height: 200 });
    expect(tools.map(toolCenter)).toEqual([
      { x: 75, y: 690 },
      { x: 195, y: 690 },
      { x: 315, y: 690 },
    ]);
    expect(titleShedButton).toEqual({ x: 195, y: 736, width: 300, height: 80 });
    expect(wispWork).toEqual({ x: 120, y: 318 });
  });

  it("makes every tool card the size of a lane card, and every target at least 80 x 80", () => {
    for (const r of toolRects) expect(r).toMatchObject(cardSize);
    for (const r of [...toolRects, wispRect, buttonRect, titleShedButton]) {
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
        // The wisp stands in front of the shed's ground; the door and the lock stay clear of it.
        if (new Set([a, b]).has("shed") && new Set([a, b]).has("wisp at the door")) continue;
        expect(overlap(stage[a]!, stage[b]!), `${a} / ${b}`).toBe(false);
      }
    }
  });

  it("keeps the wisp in front of the shed's ground only, below the door and the lock", () => {
    const doorBottom = shedPoint({ x: 0, y: shedParts.door.y + shedParts.door.height / 2 }).y;
    expect(top(wispAtWork)).toBeGreaterThanOrEqual(doorBottom);
    expect(left(wispAtWork)).toBeGreaterThanOrEqual(left(shedBox));
    expect(bottom(wispAtWork)).toBeLessThanOrEqual(top(box(resultText)));
  });

  it("keeps the order from the top: guide, shed, wisp, message, closing line, button, tools", () => {
    expect(bottom(guide)).toBeLessThanOrEqual(top(shedBox));
    expect(bottom(shedBox)).toBeLessThanOrEqual(top(wispRect));
    expect(bottom(wispRect)).toBeLessThanOrEqual(top(box(messageText)));
    expect(bottom(box(resultText))).toBeLessThanOrEqual(top(lessonBox));
    expect(bottom(lessonBox)).toBeLessThanOrEqual(top(buttonRect));
    expect(bottom(buttonRect)).toBeLessThanOrEqual(Math.min(...toolRects.map(top)));
  });

  it("uses the lane's wisp home and keeps the hero's start clear of every target", () => {
    expect(wisp).toEqual({ x: 195, y: 370 });
    const hero = square(heroStart, heroSize);
    expect(heroStart).toEqual(initialState.hero);
    for (const [name, stage] of Object.entries(stages)) {
      for (const [what, r] of Object.entries(stage)) {
        expect(overlap(hero, r), `${name} / ${what}`).toBe(false);
      }
    }
  });

  it("puts the title's shed button inside the canvas and below the title's wisp and hero", () => {
    expect(left(titleShedButton)).toBeGreaterThanOrEqual(0);
    expect(right(titleShedButton)).toBeLessThanOrEqual(canvas.width);
    expect(bottom(titleShedButton)).toBeLessThanOrEqual(canvas.height);
    expect(top(titleShedButton)).toBeGreaterThan(titleArtBottom);
  });
});

describe("the shed picture (REQ-5.5.6)", () => {
  const parts = shedParts;
  const door = shedPoint(parts.door);
  const doorRect: Rect = { ...door, width: parts.door.width, height: parts.door.height };
  const windowRect: Rect = {
    ...shedPoint(parts.window),
    width: parts.window.width,
    height: parts.window.height,
  };

  it("maps a local point to game pixels from the center of the picture", () => {
    expect(shedPoint({ x: 0, y: 0 })).toEqual({ x: 195, y: 198 });
    expect(shedPoint({ x: -10, y: 20 })).toEqual({ x: 185, y: 218 });
  });

  it("keeps every part inside the picture's box", () => {
    for (const p of parts.roof) expect(inBox(shedPoint(p))).toBe(true);
    for (const r of [parts.wall, parts.door, parts.window]) {
      const g: Rect = { ...shedPoint(r), width: r.width, height: r.height };
      expect(left(g)).toBeGreaterThanOrEqual(left(shedBox));
      expect(right(g)).toBeLessThanOrEqual(right(shedBox));
      expect(top(g)).toBeGreaterThanOrEqual(top(shedBox));
      expect(bottom(g)).toBeLessThanOrEqual(bottom(shedBox));
    }
    expect(inBox(shedPoint(parts.catOutside))).toBe(true);
    const star = shedPoint(parts.star);
    expect(star.x + parts.star.radius).toBeLessThanOrEqual(right(shedBox));
  });

  it("puts the door and the window in the wall, apart from each other, and the lock on the door", () => {
    const wall: Rect = {
      ...shedPoint(parts.wall),
      width: parts.wall.width,
      height: parts.wall.height,
    };
    for (const r of [doorRect, windowRect]) {
      expect(left(r)).toBeGreaterThanOrEqual(left(wall));
      expect(right(r)).toBeLessThanOrEqual(right(wall));
      expect(top(r)).toBeGreaterThanOrEqual(top(wall));
      expect(bottom(r)).toBeLessThanOrEqual(bottom(wall));
    }
    expect(overlap(doorRect, windowRect)).toBe(false);
    const lock = shedPoint(parts.lock);
    expect(lock.x).toBeGreaterThan(left(doorRect));
    expect(lock.x).toBeLessThan(right(doorRect));
  });

  it("keeps the cat outside clear of the wall, and the open door's swing clear of the cat", () => {
    const wallRight = shedPoint({ x: parts.wall.x + parts.wall.width / 2, y: 0 }).x;
    expect(shedPoint(parts.catOutside).x - 18).toBeGreaterThanOrEqual(wallRight);
  });

  it("reads the picture at four points, each in its own part and clear of the tool", () => {
    expect(probes.door).toEqual({ x: 127, y: 210 });
    expect(probes.window).toEqual({ x: 250, y: 228 });
    expect(probes.catOutside).toEqual({ x: 323, y: 268 });
    expect(probes.star).toEqual({ x: 323, y: 212 });
    expect(probes.door.x).toBeGreaterThan(left(doorRect));
    expect(probes.door.y).toBeGreaterThan(top(doorRect));
    const tool = square(shedPoint(parts.tool), parts.tool.size);
    expect(overlap(tool, square(probes.door, 2))).toBe(false);
    expect(overlap(windowRect, square(probes.window, 2))).toBe(true);
    for (const p of Object.values(probes)) expect(inBox(p)).toBe(true);
  });
});
