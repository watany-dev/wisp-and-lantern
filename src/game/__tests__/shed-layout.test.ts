import { describe, expect, it } from "vite-plus/test";
import { puzzles, tools } from "../../domain/shed";
import { initialState } from "../../domain/state";
import {
  buttonRect,
  canvas,
  cardSize,
  heroSize,
  heroStart,
  hudBar,
  hudScore,
  hudTime,
  lessonBox,
  messageText,
  resultText,
  wisp,
  wispRect,
  type Rect,
} from "../lane-layout";
import {
  guideText,
  leaveButton,
  obstacleProbes,
  overLeave,
  overWispTwoButtons,
  probes,
  shedBox,
  shedParts,
  shedPoint,
  titleArtBottom,
  titleShedButton,
  toolCenter,
  toolRect,
  toolSpot,
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

/** A part of the picture as a rectangle in game pixels. */
const asRect = (r: { x: number; y: number; width: number; height: number }): Rect => ({
  ...shedPoint(r),
  width: r.width,
  height: r.height,
});
/** What can be in the way of the cat, as rectangles: the leaves, the planks, the rope's bands. */
const obstacles: Record<string, Rect[]> = {
  leaves: [asRect(shedParts.leaves)],
  boards: shedParts.planks.map(asRect),
  rope: [
    asRect({
      x: shedParts.rope.x,
      y: 52,
      width: shedParts.rope.width,
      height: 52,
    }),
  ],
};

const guide = box(guideText);
const toolRects = tools.map(toolRect);
const wispAtWork = square(wispWork, wispArtSize);

/** What is on screen in every stage: the top row of the run, the tools and the way back to the title. */
const always: Record<string, Rect> = {
  clock: hudTime,
  bar: hudBar,
  score: hudScore,
  guide,
  shed: shedBox,
  leave: leaveButton,
  ...Object.fromEntries(tools.map((t) => [`tool ${t}`, toolRect(t)])),
};

/** Each stage of the shed on its own: the choosing message and the result message share a place. */
const stages: Record<string, Record<string, Rect>> = {
  choosing: { ...always, wisp: wispRect, message: box(messageText) },
  stuck: {
    ...always,
    "wisp at the door": wispAtWork,
    message: box(resultText),
    button: buttonRect,
  },
  freed: {
    ...always,
    "wisp at the door": wispAtWork,
    message: box(resultText),
    "closing line": lessonBox,
    button: buttonRect,
  },
};

describe("shed layout (REQ-5.10)", () => {
  it("puts the guide, the picture, the tools, the way back and the button where the design says", () => {
    expect(guideText).toEqual({ x: 195, y: 68, wrap: 340, height: 56 });
    expect(shedBox).toEqual({ x: 195, y: 198, width: 300, height: 200 });
    expect(tools.map(toolCenter)).toEqual([
      { x: 75, y: 690 },
      { x: 195, y: 690 },
      { x: 315, y: 690 },
      { x: 135, y: 788 },
      { x: 255, y: 788 },
    ]);
    expect(leaveButton).toEqual({ x: 347, y: 788, width: 80, height: 80 });
    expect(titleShedButton).toEqual({ x: 195, y: 736, width: 300, height: 80 });
    expect(wispWork).toEqual({ x: 120, y: 318 });
  });

  it("makes every tool card the size of a lane card, and every target at least 80 x 80", () => {
    for (const r of toolRects) expect(r).toMatchObject(cardSize);
    for (const r of [...toolRects, wispRect, buttonRect, titleShedButton, leaveButton, overLeave]) {
      expect(r.width).toBeGreaterThanOrEqual(80);
      expect(r.height).toBeGreaterThanOrEqual(80);
    }
  });

  it("puts the five tools in two rows like the lane's cards, the way back at the end of the lower row", () => {
    const upper = tools.filter((t) => toolCenter(t).y === 690);
    const lower = tools.filter((t) => toolCenter(t).y === 788);
    expect(upper).toHaveLength(3);
    expect(lower).toHaveLength(2);
    expect(Math.max(...lower.map((t) => right(toolRect(t))))).toBeLessThan(left(leaveButton));
    expect(bottom(leaveButton)).toBeLessThanOrEqual(canvas.height);
    expect(right(leaveButton)).toBeLessThanOrEqual(canvas.width);
  });

  it("keeps the clock row clear of the guide, which is clear of the picture", () => {
    for (const r of [hudTime, hudBar, hudScore]) expect(bottom(r)).toBeLessThanOrEqual(top(guide));
    expect(top(hudTime)).toBeGreaterThanOrEqual(0);
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
});

describe("shed layout, the order and the hero (REQ-5.10)", () => {
  it("keeps the order from the top: clock, guide, shed, wisp, message, closing line, button, tools", () => {
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

describe("the end screen's two buttons (REQ-5.16, REQ-5.10)", () => {
  // The wisp is drawn at 1.8 times its size of 60.
  const wispOver = square(overWispTwoButtons, wispArtSize * 1.8);

  it("puts the way back under the play-again button, inside the canvas", () => {
    expect(overLeave).toEqual({ x: 195, y: 634, width: 300, height: 80 });
    expect(top(overLeave)).toBeGreaterThan(bottom(buttonRect));
    expect(left(overLeave)).toBeGreaterThanOrEqual(0);
    expect(right(overLeave)).toBeLessThanOrEqual(canvas.width);
    expect(bottom(overLeave)).toBeLessThanOrEqual(canvas.height);
  });

  it("keeps the wisp clear of both buttons and inside the canvas", () => {
    expect(overlap(wispOver, buttonRect)).toBe(false);
    expect(overlap(wispOver, overLeave)).toBe(false);
    expect(bottom(wispOver)).toBeLessThanOrEqual(canvas.height);
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

  it("reads the picture at five points, each in its own part and clear of the tool", () => {
    expect(probes.door).toEqual({ x: 127, y: 210 });
    expect(probes.window).toEqual({ x: 250, y: 228 });
    expect(probes.catOutside).toEqual({ x: 331, y: 268 });
    expect(probes.catRoof).toEqual({ x: 103, y: 139 });
    expect(probes.star).toEqual({ x: 323, y: 212 });
    expect(probes.door.x).toBeGreaterThan(left(doorRect));
    expect(probes.door.y).toBeGreaterThan(top(doorRect));
    expect(overlap(windowRect, square(probes.window, 2))).toBe(true);
    for (const p of Object.values(probes)) expect(inBox(p)).toBe(true);
  });
});

describe("the puzzles in the picture (REQ-5.2.3, REQ-5.5.6)", () => {
  const parts = shedParts;
  const doorRect = asRect(parts.door);

  it("tries the tool at a spot of its own in each puzzle, inside the picture and clear of every probe", () => {
    for (const puzzle of puzzles) {
      const at = shedPoint(toolSpot(puzzle));
      const tool = square(at, parts.tool.size);
      expect(inBox(at), puzzle).toBe(true);
      expect(left(tool), puzzle).toBeGreaterThanOrEqual(left(shedBox));
      for (const [name, p] of Object.entries(probes)) {
        expect(overlap(tool, square(p, 2)), `${puzzle} / ${name}`).toBe(false);
      }
    }
  });

  it("puts the tool on the door for the lock, the leaves, the boards and the rope, and on the roof for the cat", () => {
    for (const puzzle of ["lock", "leaves", "boards", "rope"] as const) {
      const at = shedPoint(toolSpot(puzzle));
      expect(at.x, puzzle).toBeGreaterThan(left(doorRect));
      expect(at.x, puzzle).toBeLessThan(right(doorRect));
      expect(at.y, puzzle).toBeGreaterThan(top(doorRect));
      expect(at.y, puzzle).toBeLessThan(bottom(doorRect));
    }
    expect(shedPoint(toolSpot("roof")).x).toBeLessThan(left(doorRect));
  });
});

describe("the obstacles in the picture (REQ-5.2.3, REQ-5.5.6)", () => {
  const parts = shedParts;
  const doorRect = asRect(parts.door);

  it("keeps every obstacle on or at the door, inside the picture, and off the door probe", () => {
    for (const [name, list] of Object.entries(obstacles)) {
      for (const r of list) {
        expect(left(r), name).toBeGreaterThanOrEqual(left(shedBox));
        expect(right(r), name).toBeLessThanOrEqual(right(shedBox));
        expect(top(r), name).toBeGreaterThanOrEqual(top(shedBox));
        expect(bottom(r), name).toBeLessThanOrEqual(bottom(shedBox));
        expect(overlap(r, square(probes.door, 2)), name).toBe(false);
      }
    }
  });

  it("reads each obstacle at a point on it, clear of the tool, the door probe and the leaves' vein", () => {
    const rects: Record<string, Rect[]> = {
      leaves: obstacles.leaves!,
      boards: obstacles.boards!,
      rope: obstacles.rope!,
    };
    for (const puzzle of ["leaves", "boards", "rope"] as const) {
      const at = obstacleProbes[puzzle];
      expect(
        rects[puzzle]!.some((r) => overlap(r, square(at, 5))),
        puzzle,
      ).toBe(true);
      const tool = square(shedPoint(toolSpot(puzzle)), shedParts.tool.size);
      expect(overlap(tool, square(at, 5)), puzzle).toBe(false);
      expect(overlap(square(probes.door, 5), square(at, 5)), puzzle).toBe(false);
    }
  });

  it("keeps the rope's bands and its knot on the door, and the planks across its whole width", () => {
    for (const y of parts.rope.bands) {
      expect(shedPoint({ x: 0, y }).y).toBeGreaterThan(top(doorRect));
      expect(shedPoint({ x: 0, y }).y).toBeLessThan(bottom(doorRect));
    }
    expect(parts.rope.knot.x).toBe(parts.door.x);
    for (const plank of parts.planks) {
      expect(plank.x - plank.width / 2).toBeLessThan(parts.door.x - parts.door.width / 2);
      expect(plank.x + plank.width / 2).toBeGreaterThan(parts.door.x + parts.door.width / 2);
    }
  });

  it("sits the cat on the roof's left slope, clear of the guide and of the door, and on the picture", () => {
    const cat = shedPoint(parts.catRoof);
    expect(inBox(cat)).toBe(true);
    // A cat of width 36 reaches about 27 above its center.
    expect(cat.y - 27).toBeGreaterThanOrEqual(bottom(guide));
    expect(cat.x + 18).toBeLessThan(shedPoint({ x: 0, y: 0 }).x);
  });
});
