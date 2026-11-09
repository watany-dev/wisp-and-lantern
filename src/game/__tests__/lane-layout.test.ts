import { describe, expect, it } from "vite-plus/test";
import { colors, things, type CardId } from "../../domain/lane";
import { initialState } from "../../domain/state";
import {
  buttonRect,
  canvas,
  cardCenter,
  cardRect,
  heroSize,
  heroStart,
  messageText,
  slotCenter,
  slotSize,
  wishPicture,
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
  "wish picture": square(wishPicture, wishPictureSize),
};
const interactive = [...cardIds.map(cardRect), wispRect, buttonRect];

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

  it("keeps the hero's start clear of every target, so the floor drag has room", () => {
    const hero = square(heroStart, heroSize);
    expect(heroStart).toEqual(initialState.hero);
    for (const r of interactive) expect(overlap(hero, r)).toBe(false);
  });
});
