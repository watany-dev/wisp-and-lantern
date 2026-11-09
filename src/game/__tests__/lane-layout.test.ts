import { describe, expect, it } from "vite-plus/test";
import { colors, things, type CardId } from "../../domain/lane";
import { initialState } from "../../domain/state";
import {
  buttonRect,
  canvas,
  cardCenter,
  cardRect,
  fontSize,
  heroSize,
  heroStart,
  hudBar,
  hudScore,
  hudTime,
  lessonBox,
  messageText,
  overLockMs,
  overText,
  resultText,
  slotCenter,
  slotSize,
  wishPicture,
  wishText,
  wishPictureSize,
  wispRect,
  type Rect,
} from "../lane-layout";

const cardIds: CardId[] = [...colors, ...things];
const square = (c: { x: number; y: number }, size: number): Rect => ({
  ...c,
  width: size,
  height: size,
});
const slots = colors.flatMap((c) => things.map((t) => square(slotCenter(c, t), slotSize)));
const message: Rect = {
  x: messageText.x,
  y: messageText.y,
  width: messageText.wrap,
  height: messageText.height,
};

/** Everything the player sees or touches, apart from the hero. */
const shown: Record<string, Rect> = {
  ...Object.fromEntries(cardIds.map((id) => [`card ${id}`, cardRect(id)])),
  ...Object.fromEntries(slots.map((r, i) => [`slot ${i}`, r])),
  wisp: wispRect,
  button: buttonRect,
  message,
  "wish text": wishText,
  "wish picture": square(wishPicture, wishPictureSize),
  "clock number": hudTime,
  "clock bar": hudBar,
  score: hudScore,
};
const interactive = [...cardIds.map(cardRect), wispRect, buttonRect];

const resultMessage: Rect = {
  x: resultText.x,
  y: resultText.y,
  width: resultText.wrap,
  height: resultText.height,
};
/**
 * After a result the wisp is at a slot, not at home, and the choosing message gives way to the result
 * message and, on the right result, the closing line. Each stage is checked on its own.
 */
const resultStage: Record<string, Rect> = {
  ...Object.fromEntries(cardIds.map((id) => [`card ${id}`, cardRect(id)])),
  ...Object.fromEntries(slots.map((r, i) => [`slot ${i}`, r])),
  button: buttonRect,
  "result message": resultMessage,
  "closing line": lessonBox,
  "wish text": wishText,
  "wish picture": square(wishPicture, wishPictureSize),
  "clock number": hudTime,
  "clock bar": hudBar,
  score: hudScore,
};

const left = (r: Rect) => r.x - r.width / 2;
const right = (r: Rect) => r.x + r.width / 2;
const top = (r: Rect) => r.y - r.height / 2;
const bottom = (r: Rect) => r.y + r.height / 2;
const overlap = (a: Rect, b: Rect) =>
  left(a) < right(b) && left(b) < right(a) && top(a) < bottom(b) && top(b) < bottom(a);

describe("lane layout (REQ-2.11)", () => {
  it("puts the cards where the design says", () => {
    expect(colors.map((c) => cardCenter(c))).toEqual([
      { x: 75, y: 690 },
      { x: 195, y: 690 },
      { x: 315, y: 690 },
    ]);
    expect(things.map((t) => cardCenter(t))).toEqual([
      { x: 135, y: 788 },
      { x: 255, y: 788 },
    ]);
  });

  it("puts a slot for each color column and object row", () => {
    expect(slotCenter("red", "pumpkin")).toEqual({ x: 75, y: 170 });
    expect(slotCenter("blue", "lantern")).toEqual({ x: 195, y: 270 });
    expect(slotCenter("yellow", "pumpkin")).toEqual({ x: 315, y: 170 });
  });

  it("keeps everything inside the canvas", () => {
    for (const [name, r] of Object.entries(shown)) {
      expect(left(r), name).toBeGreaterThanOrEqual(0);
      expect(top(r), name).toBeGreaterThanOrEqual(0);
      expect(right(r), name).toBeLessThanOrEqual(canvas.width);
      expect(bottom(r), name).toBeLessThanOrEqual(canvas.height);
    }
  });

  it("makes every target at least 80 x 80 game pixels", () => {
    for (const r of interactive) {
      expect(r.width).toBeGreaterThanOrEqual(80);
      expect(r.height).toBeGreaterThanOrEqual(80);
    }
  });

  it("keeps targets and pictures from overlapping", () => {
    const names = Object.keys(shown);
    for (const [i, a] of names.entries()) {
      for (const b of names.slice(i + 1)) {
        expect(overlap(shown[a]!, shown[b]!), `${a} / ${b}`).toBe(false);
      }
    }
  });

  it("keeps the result stage inside the canvas and free of overlap (REQ-3.5.4)", () => {
    const names = Object.keys(resultStage);
    for (const [i, a] of names.entries()) {
      const r = resultStage[a]!;
      expect(left(r), a).toBeGreaterThanOrEqual(0);
      expect(top(r), a).toBeGreaterThanOrEqual(0);
      expect(right(r), a).toBeLessThanOrEqual(canvas.width);
      expect(bottom(r), a).toBeLessThanOrEqual(canvas.height);
      for (const b of names.slice(i + 1)) {
        expect(overlap(r, resultStage[b]!), `${a} / ${b}`).toBe(false);
      }
    }
  });

  it("puts the result message and the closing line between the slots and the button, in that order", () => {
    const lowestSlot = Math.max(...slots.map(bottom));
    expect(top(resultMessage)).toBeGreaterThan(lowestSlot);
    expect(bottom(resultMessage)).toBeLessThanOrEqual(top(lessonBox));
    expect(bottom(lessonBox)).toBeLessThanOrEqual(top(buttonRect));
  });

  it("uses the space the wisp left, and keeps the choosing message where it was", () => {
    expect(top(resultMessage)).toBeGreaterThanOrEqual(top(wispRect));
    expect(messageText).toMatchObject({ x: 195, y: 454 });
    expect(resultText).toMatchObject({ x: 195, y: 380 });
  });

  it("does not make the closing line smaller than the message (REQ-3.5.4)", () => {
    expect(fontSize.lesson).toBeGreaterThanOrEqual(fontSize.message);
    expect(lessonBox.width).toBeLessThanOrEqual(canvas.width);
  });

  it("keeps the hero's start clear of every target, so the floor drag has room", () => {
    const hero = square(heroStart, heroSize);
    expect(heroStart).toEqual(initialState.hero);
    for (const r of interactive) expect(overlap(hero, r)).toBe(false);
    for (const [name, r] of Object.entries(resultStage)) expect(overlap(hero, r), name).toBe(false);
  });
});

describe("run layout (REQ-4.7)", () => {
  it("keeps the clock and the score in the top row, above the wish and the slots", () => {
    const row = [hudTime, hudBar, hudScore];
    const topOfSlots = Math.min(...slots.map(top));
    for (const r of row) {
      expect(bottom(r)).toBeLessThan(top(wishText));
      expect(bottom(r)).toBeLessThan(top(square(wishPicture, wishPictureSize)));
      expect(bottom(r)).toBeLessThan(topOfSlots);
    }
  });

  it("puts the clock number, the bar and the score side by side, in that order", () => {
    expect(right(hudTime)).toBeLessThanOrEqual(left(hudBar));
    expect(right(hudBar)).toBeLessThanOrEqual(left(hudScore));
    expect(right(hudScore)).toBeLessThanOrEqual(canvas.width);
  });

  it("lays the end screen out from the top to the button without overlap", () => {
    const lines = [overText.title, overText.record, overText.score, overText.best];
    const ys = lines.map((l) => l.y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
    expect(Math.min(...ys.slice(1).map((y, i) => y - ys[i]!))).toBeGreaterThanOrEqual(50);
    expect(ys.at(-1)!).toBeLessThan(top(buttonRect));
    expect(overText.wrap).toBeLessThanOrEqual(canvas.width);
    expect(overLockMs).toBeGreaterThan(0);
  });
});
