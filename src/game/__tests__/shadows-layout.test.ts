import { describe, expect, it } from "vite-plus/test";
import { initialState } from "../../domain/state";
import { buttonRects, fieldWisp, fieldWispSize, titleArt, titleFieldButton } from "../field-layout";
import { canvas, heroSize, heroStart, hudBar, hudScore, hudTime, type Rect } from "../lane-layout";
import {
  bubbleBox,
  bubbleItem,
  itemArt,
  itemLabel,
  itemTile,
  lockBadge,
  probes,
  shadowBox,
  shadowsMessage,
  tickBadge,
  titleShadowsButton,
  whyBox,
  whyWrap,
} from "../shadows-layout";
import { guideText, leaveButton, titleArtBottom, titleShedButton } from "../shed-layout";
import { titleCard, titleIntro, titlePrompt, titleText } from "../title-layout";

const left = (r: Rect) => r.x - r.width / 2;
const right = (r: Rect) => r.x + r.width / 2;
const top = (r: Rect) => r.y - r.height / 2;
const bottom = (r: Rect) => r.y + r.height / 2;
const overlap = (a: Rect, b: Rect) =>
  left(a) < right(b) && left(b) < right(a) && top(a) < bottom(b) && top(b) < bottom(a);
const box = (t: { x: number; y: number; wrap: number; height: number }): Rect => ({
  x: t.x,
  y: t.y,
  width: t.wrap,
  height: t.height,
});
const square = (c: { x: number; y: number }, size: number): Rect => ({
  ...c,
  width: size,
  height: size,
});
const inside = (p: { x: number; y: number }, r: Rect, margin = 0) =>
  p.x - margin >= left(r) &&
  p.x + margin <= right(r) &&
  p.y - margin >= top(r) &&
  p.y + margin <= bottom(r);

/** How far `p` is from the center of a badge, whose offset is from the tile's center. */
const fromCenter = (p: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(p.x - (itemTile.x + b.x), p.y - (itemTile.y + b.y));

const guide = box(guideText);
const message = box(shadowsMessage);
const wisp = square(fieldWisp, fieldWispSize);

/** Everything on the screen in each stage. Deciding has two buttons; decided has one wide button and the closing line. */
const base = {
  guide,
  tile: itemTile,
  shadow: shadowBox,
  message,
  wisp,
  leave: leaveButton,
};
const stages: Record<string, Record<string, Rect>> = {
  deciding: { ...base, give: buttonRects.left, secret: buttonRects.right },
  "deciding with the bubble hidden": { ...base, give: buttonRects.left, secret: buttonRects.right },
  decided: { ...base, bubble: bubbleBox, why: whyBox, next: buttonRects.single },
};

describe("shadows layout (REQ-7.9)", () => {
  it("puts the tile, the shadow, the bubble, the message, the closing line and the title's button where the design says", () => {
    expect(itemTile).toEqual({ x: 112, y: 232, width: 140, height: 140 });
    expect(shadowBox).toEqual({ x: 290, y: 246, width: 130, height: 120 });
    expect(bubbleBox).toEqual({ x: 290, y: 138, width: 88, height: 60 });
    expect(shadowsMessage).toEqual({ x: 195, y: 352, wrap: 340, height: 60 });
    expect(whyBox).toEqual({ x: 195, y: 440, width: 340, height: 88 });
    expect(whyWrap).toBe(320);
    expect(titleShadowsButton).toEqual({ x: 195, y: 560, width: 300, height: 80 });
    expect(itemArt).toEqual({ y: -14, size: 76 });
    expect(itemLabel).toEqual({ y: 50, size: 20 });
    expect(bubbleItem.size).toBe(40);
  });

  it("makes every target (the buttons, the title's buttons) at least 80 x 80", () => {
    const targets = [
      ...Object.values(buttonRects),
      titleShadowsButton,
      titleFieldButton,
      titleShedButton,
      leaveButton,
    ];
    for (const r of targets) {
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

describe("shadows layout, order and spacing (REQ-7.2, REQ-7.9)", () => {
  it("keeps the order from the top: guide, bubble, the tile and the shadow, message, closing line, buttons, wisp", () => {
    expect(bottom(guide)).toBeLessThanOrEqual(top(bubbleBox));
    expect(bottom(bubbleBox)).toBeLessThanOrEqual(top(shadowBox));
    expect(bottom(guide)).toBeLessThanOrEqual(top(itemTile));
    expect(Math.max(bottom(itemTile), bottom(shadowBox))).toBeLessThanOrEqual(top(message));
    expect(bottom(message)).toBeLessThanOrEqual(top(whyBox));
    for (const r of Object.values(buttonRects)) {
      expect(bottom(whyBox)).toBeLessThanOrEqual(top(r));
      expect(bottom(r)).toBeLessThanOrEqual(top(wisp));
    }
  });

  it("puts the tile and the shadow side by side, with the shadow's ear toward the tile and a gap between", () => {
    expect(right(itemTile)).toBeLessThan(left(shadowBox));
    expect(Math.abs(itemTile.y - shadowBox.y)).toBeLessThanOrEqual(20);
    expect(bubbleBox.x).toBe(shadowBox.x);
    expect(top(whyBox) - bottom(message)).toBeGreaterThan(0);
  });

  it("puts the run's top row above the guide, and the way back to the title where the shed has it (REQ-7.7.5)", () => {
    for (const r of [hudTime, hudBar, hudScore]) {
      expect(bottom(r)).toBeLessThanOrEqual(top(guide));
      expect(top(r)).toBeGreaterThanOrEqual(0);
    }
    expect(leaveButton).toEqual({ x: 347, y: 788, width: 80, height: 80 });
    expect(left(leaveButton)).toBeGreaterThanOrEqual(right(wisp));
    expect(top(leaveButton)).toBeGreaterThanOrEqual(bottom(buttonRects.single));
    expect(bottom(leaveButton)).toBeLessThanOrEqual(canvas.height);
  });

  it("puts two buttons side by side with a gap, and one wide button over both", () => {
    const { left: a, right: b, single } = buttonRects;
    expect(right(a)).toBeLessThan(left(b));
    expect(left(single)).toBeLessThanOrEqual(left(a));
    expect(right(single)).toBeGreaterThanOrEqual(right(b));
  });
});

describe("inside the tile (REQ-7.2.3, REQ-7.2.6)", () => {
  it("fits the item's picture and its name in the tile without touching", () => {
    const half = itemTile.width / 2;
    expect(itemArt.y - itemArt.size / 2).toBeGreaterThanOrEqual(-half);
    expect(itemArt.y + itemArt.size / 2).toBeLessThanOrEqual(itemLabel.y - itemLabel.size / 2);
    expect(itemLabel.y + itemLabel.size / 2).toBeLessThanOrEqual(half);
  });

  it("puts the tick on the top right corner and the padlock on the top left, apart from each other", () => {
    expect(tickBadge).toEqual({ x: 62, y: -62, radius: 15 });
    expect(lockBadge).toEqual({ x: -62, y: -62, radius: 15 });
    expect(tickBadge.x - lockBadge.x).toBeGreaterThan(tickBadge.radius + lockBadge.radius);
    // The tick's disc is `drawPickedMark`'s: 8 in from the corner, as on the field's stars.
    expect(tickBadge).toMatchObject({ x: itemTile.width / 2 - 8, y: -itemTile.height / 2 + 8 });
    expect(lockBadge).toMatchObject({ x: -itemTile.width / 2 + 8, y: -itemTile.height / 2 + 8 });
  });

  it("keeps the badges clear of the item's picture, to its left and right", () => {
    const art = itemArt.size / 2;
    expect(tickBadge.x - tickBadge.radius).toBeGreaterThanOrEqual(art);
    expect(-lockBadge.x - lockBadge.radius).toBeGreaterThanOrEqual(art);
  });

  it("reads the inner side of each badge's disc from the screenshot, clear of the glyph, the frame and the picture", () => {
    expect(probes.tick).toEqual({ x: itemTile.x + tickBadge.x - 12, y: itemTile.y + tickBadge.y });
    expect(probes.lock).toEqual({ x: itemTile.x + lockBadge.x + 12, y: itemTile.y + lockBadge.y });
    expect(fromCenter(probes.tick, tickBadge)).toBeLessThan(tickBadge.radius);
    expect(fromCenter(probes.lock, lockBadge)).toBeLessThan(lockBadge.radius);
    // Inside the tile, under the frame's inner edge (the frame is 6 wide, centered on the tile's edge) ...
    const frameInner = itemTile.height / 2 - 3;
    for (const p of [probes.tick, probes.lock]) {
      expect(inside(p, itemTile, 0)).toBe(true);
      expect(Math.abs(p.y - itemTile.y)).toBeLessThan(frameInner);
      expect(Math.abs(p.x - itemTile.x)).toBeLessThan(frameInner);
      // ... and outside the picture, which is centered and `itemArt.size` square.
      expect(Math.abs(p.x - itemTile.x)).toBeGreaterThan(itemArt.size / 2);
    }
  });
});

describe("the bubble (REQ-7.2.5)", () => {
  it("holds the small item with a margin, over the shadow's head", () => {
    expect(bubbleItem.size + 8).toBeLessThanOrEqual(bubbleBox.height);
    expect(bubbleItem.size + 8).toBeLessThanOrEqual(bubbleBox.width);
  });
});

describe("the title's three buttons and Trial 1's card (REQ-7.1.1, REQ-7.1.6)", () => {
  const buttons = [titleShadowsButton, titleFieldButton, titleShedButton];

  it("keeps the shadows button inside the canvas, above the field button with a gap of at least 8", () => {
    expect(left(titleShadowsButton)).toBeGreaterThanOrEqual(0);
    expect(right(titleShadowsButton)).toBeLessThanOrEqual(canvas.width);
    expect(overlap(titleShadowsButton, titleFieldButton)).toBe(false);
    expect(top(titleFieldButton) - bottom(titleShadowsButton)).toBeGreaterThanOrEqual(8);
  });

  it("does not move the field and shed buttons", () => {
    expect(titleFieldButton).toEqual({ x: 195, y: 648, width: 300, height: 80 });
    expect(titleShedButton).toEqual({ x: 195, y: 736, width: 300, height: 80 });
  });

  it("keeps all three buttons below the title's wisp and hero, which end at titleArtBottom", () => {
    const wispBottom = titleArt.wisp.y + titleArt.wisp.scale * titleArt.wisp.bottom;
    const heroBottom = titleArt.hero.y + titleArt.hero.scale * titleArt.hero.bottom;
    expect(Math.max(wispBottom, heroBottom)).toBeLessThanOrEqual(titleArtBottom);
    for (const button of buttons) expect(top(button)).toBeGreaterThan(titleArtBottom);
    expect(bottom(titleShedButton)).toBeLessThanOrEqual(canvas.height);
  });

  it("keeps the title's name above Trial 1's card, the card above the wisp and the hero, and nothing outside the canvas", () => {
    expect(titleText.y + 16).toBeLessThan(top(titleCard));
    expect(titleArt.wisp.y - titleArt.wisp.scale * 31).toBeGreaterThan(bottom(titleCard));
    expect(titleArt.hero.y - titleArt.hero.scale * 40).toBeGreaterThan(bottom(titleCard));
    expect(left(titleCard)).toBeGreaterThanOrEqual(0);
    expect(right(titleCard)).toBeLessThanOrEqual(canvas.width);
    expect(top(titleCard)).toBeGreaterThan(0);
  });

  it("holds Trial 1's way in and its 60 seconds in one card that touches no button", () => {
    const prompt = { ...titlePrompt, width: 300, height: titlePrompt.size + 8 };
    const intro = { ...titleIntro, width: 300, height: 2 * titleIntro.size + 8 };
    expect(inside(prompt, titleCard)).toBe(true);
    expect(inside(intro, titleCard)).toBe(true);
    expect(bottom(prompt)).toBeLessThanOrEqual(top(intro));
    for (const button of buttons) {
      expect(overlap(titleCard, button)).toBe(false);
      expect(top(button) - bottom(titleCard)).toBeGreaterThan(100);
    }
  });
});
