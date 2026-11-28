import { describe, expect, it } from "vite-plus/test";
import { parts } from "../../domain/lantern";
import { initialState } from "../../domain/state";
import { buttonRects, fieldWisp, fieldWispSize, titleArt, titleFieldButton } from "../field-layout";
import { canvas, heroSize, heroStart, hudBar, hudScore, hudTime, type Rect } from "../lane-layout";
import {
  frame,
  frameDots,
  glass,
  lanternMessage,
  lanternPanel,
  panelLabel,
  partProbes,
  partRect,
  partSize,
  probes,
  tickBadge,
  titleLanternButton,
  wishPanel,
  wishPartAt,
} from "../lantern-layout";
import { titleShadowsButton } from "../shadows-layout";
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
const inside = (p: { x: number; y: number }, r: Rect) =>
  p.x >= left(r) && p.x <= right(r) && p.y >= top(r) && p.y <= bottom(r);

const guide = box(guideText);
const message = box(lanternMessage);
const wisp = square(fieldWisp, fieldWispSize);
/** The labels above the panels, as wide as the panels and one line high. */
const label = (panel: Rect): Rect => ({
  x: panel.x,
  y: panelLabel.y,
  width: panel.width,
  height: panelLabel.size + 2,
});
const badge: Rect = { x: tickBadge.x, y: tickBadge.y, width: 30, height: 30 };

/** Everything on the screen in each stage. Looking has no buttons; pointing has two cards; lit has Next and the badge. */
const base = {
  guide,
  wishLabel: label(wishPanel),
  lanternLabel: label(lanternPanel),
  wish: wishPanel,
  lantern: lanternPanel,
  message,
  wisp,
  leave: leaveButton,
};
const stages: Record<string, Record<string, Rect>> = {
  looking: base,
  pointing: { ...base, left: buttonRects.left, right: buttonRects.right },
  lit: { ...base, next: buttonRects.single },
};

describe("lantern layout (REQ-8.11)", () => {
  it("puts the panels, the parts, the message and the title's button where the design says", () => {
    expect(wishPanel).toEqual({ x: 97, y: 260, width: 170, height: 264 });
    expect(lanternPanel).toEqual({ x: 293, y: 260, width: 170, height: 264 });
    expect(panelLabel).toEqual({ y: 110, size: 16 });
    expect(parts.map((p) => partRect(p))).toEqual([
      { x: 293, y: 176, width: 160, height: 80 },
      { x: 293, y: 260, width: 160, height: 80 },
      { x: 293, y: 344, width: 160, height: 80 },
    ]);
    expect(parts.map((p) => wishPartAt(p))).toEqual([
      { x: 97, y: 176 },
      { x: 97, y: 260 },
      { x: 97, y: 344 },
    ]);
    expect(lanternMessage).toEqual({ x: 195, y: 432, wrap: 340, height: 60 });
    expect(titleLanternButton).toEqual({ x: 195, y: 472, width: 300, height: 80 });
    expect(glass).toEqual({ width: 96, height: 56 });
  });

  it("makes every target (each part, the cards, Next, the title's buttons, the way back) at least 80 x 80", () => {
    expect(partSize.height).toBeGreaterThanOrEqual(80);
    const targets = [
      ...parts.map((p) => partRect(p)),
      ...Object.values(buttonRects),
      titleLanternButton,
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

describe("lantern layout, order and the two panels (REQ-8.2)", () => {
  it("keeps the order from the top: the top row, the guide, the labels, the panels, the message, the buttons, the wisp", () => {
    for (const r of [hudTime, hudBar, hudScore]) expect(bottom(r)).toBeLessThanOrEqual(top(guide));
    expect(bottom(guide)).toBeLessThanOrEqual(top(label(wishPanel)));
    expect(bottom(label(wishPanel))).toBeLessThanOrEqual(top(wishPanel));
    expect(bottom(lanternPanel)).toBeLessThanOrEqual(top(message));
    for (const r of Object.values(buttonRects)) {
      expect(bottom(message)).toBeLessThanOrEqual(top(r));
      expect(bottom(r)).toBeLessThanOrEqual(top(wisp));
    }
  });

  it("puts the panels side by side, the same size, with a gap, and the parts on the same rows in both", () => {
    expect(right(wishPanel)).toBeLessThan(left(lanternPanel));
    expect(wishPanel.y).toBe(lanternPanel.y);
    expect(wishPanel.width).toBe(lanternPanel.width);
    expect(wishPanel.height).toBe(lanternPanel.height);
    for (const part of parts) {
      expect(wishPartAt(part).y).toBe(partRect(part).y);
      expect(wishPartAt(part).x).toBe(wishPanel.x);
    }
  });

  it("stacks the three parts inside the lantern's panel without touching, from the handle down", () => {
    const rects = parts.map((p) => partRect(p));
    for (const r of rects) {
      expect(left(r)).toBeGreaterThanOrEqual(left(lanternPanel));
      expect(right(r)).toBeLessThanOrEqual(right(lanternPanel));
      expect(top(r)).toBeGreaterThanOrEqual(top(lanternPanel));
      expect(bottom(r)).toBeLessThanOrEqual(bottom(lanternPanel));
    }
    for (let i = 1; i < rects.length; i += 1) {
      expect(bottom(rects[i - 1]!)).toBeLessThan(top(rects[i]!));
    }
  });

  it("fits the glass inside the light's row", () => {
    const light = partRect("light");
    expect(glass.width).toBeLessThan(light.width);
    expect(glass.height).toBeLessThan(light.height);
  });

  it("puts the way back to the title where the shed has it (REQ-8.9.5)", () => {
    expect(leaveButton).toEqual({ x: 347, y: 788, width: 80, height: 80 });
    expect(left(leaveButton)).toBeGreaterThanOrEqual(right(wisp));
    expect(top(leaveButton)).toBeGreaterThanOrEqual(bottom(buttonRects.single));
  });
});

describe("the frames and the probes (REQ-8.3.3, REQ-8.15.2)", () => {
  it("lays the dots of a frame 16 apart, 4 inside the part, on all four sides", () => {
    expect(frame).toEqual({ step: 16, inset: 4, dot: 3.5, line: 4 });
    const r = partRect("handle");
    const dots = frameDots(r);
    // 152 pixels between the insets along the top: 9 dots; 72 along the side: 4 dots.
    expect(dots).toHaveLength(2 * 9 + 2 * 4);
    expect(dots[0]).toEqual({ x: left(r) + 4 + 8, y: top(r) + 4 });
    expect(dots[1]!.x - dots[0]!.x).toBe(16);
    for (const d of dots) expect(inside(d, r)).toBe(true);
    const tops = dots.filter((d) => d.y === top(r) + 4);
    expect(tops).toHaveLength(9);
    expect(dots.filter((d) => d.y === bottom(r) - 4)).toHaveLength(9);
    expect(dots.filter((d) => d.x === left(r) + 4)).toHaveLength(4);
    expect(dots.filter((d) => d.x === right(r) - 4)).toHaveLength(4);
  });

  it("reads each part's frame at a dot of its top edge and halfway to the next dot", () => {
    for (const part of parts) {
      const { dot, gap } = partProbes(part);
      const r = partRect(part);
      expect(frameDots(r)).toContainEqual(dot);
      expect(dot.y).toBe(top(r) + frame.inset);
      expect(gap).toEqual({ x: dot.x + 8, y: dot.y });
      // The gap is farther from every dot than a dot's radius plus the probe's reach of 2.
      for (const d of frameDots(r)) {
        expect(Math.hypot(gap.x - d.x, gap.y - d.y)).toBeGreaterThan(frame.dot + 2);
      }
    }
  });

  it("puts the tick on the lantern panel's top right corner, and reads it above the panel, on the sky without it", () => {
    expect(tickBadge).toEqual({ x: right(lanternPanel) - 8, y: top(lanternPanel) + 8, radius: 15 });
    expect(Math.hypot(probes.tick.x - tickBadge.x, probes.tick.y - tickBadge.y)).toBeLessThan(15);
    expect(probes.tick.y).toBeLessThan(top(lanternPanel));
    expect(probes.tick.y).toBeGreaterThan(bottom(label(lanternPanel)));
    expect(right(badge)).toBeLessThanOrEqual(canvas.width);
  });

  it("reads the light inside the glass, clear of the light's picture in the middle", () => {
    const light = partRect("light");
    const g = { x: light.x, y: light.y, width: glass.width, height: glass.height };
    expect(inside(probes.light, g)).toBe(true);
    expect(Math.abs(probes.light.x - light.x)).toBeGreaterThan(24);
  });
});

describe("the title's four buttons and trial 1's card (REQ-8.1.1, REQ-8.1.6)", () => {
  const buttons = [titleLanternButton, titleShadowsButton, titleFieldButton, titleShedButton];

  it("keeps the lantern button inside the canvas, above the shadows button with a gap of at least 8", () => {
    expect(left(titleLanternButton)).toBeGreaterThanOrEqual(0);
    expect(right(titleLanternButton)).toBeLessThanOrEqual(canvas.width);
    expect(top(titleShadowsButton) - bottom(titleLanternButton)).toBeGreaterThanOrEqual(8);
  });

  it("does not move the other three buttons", () => {
    expect(titleShadowsButton).toEqual({ x: 195, y: 560, width: 300, height: 80 });
    expect(titleFieldButton).toEqual({ x: 195, y: 648, width: 300, height: 80 });
    expect(titleShedButton).toEqual({ x: 195, y: 736, width: 300, height: 80 });
  });

  it("moves the name, the card and the art up, and keeps all four buttons below the art", () => {
    // Spec 08 moved them up 88 pixels; spec 09 moves the name and the card up again, and the card 16 pixels shorter,
    // so that trial 6's button fits between the card and the art (REQ-9.1.1). The art did not move again.
    expect(titleText).toEqual({ x: 195, y: 34 });
    expect(titleCard).toEqual({ x: 195, y: 128, width: 340, height: 128 });
    expect(titlePrompt).toEqual({ x: 195, y: 96, size: 26 });
    expect(titleIntro).toEqual({ x: 195, y: 154, size: 22 });
    expect(titleArtBottom).toBe(426);
    const wispBottom = titleArt.wisp.y + titleArt.wisp.scale * titleArt.wisp.bottom;
    const heroBottom = titleArt.hero.y + titleArt.hero.scale * titleArt.hero.bottom;
    expect(Math.max(wispBottom, heroBottom)).toBeLessThanOrEqual(titleArtBottom);
    for (const button of buttons) expect(top(button)).toBeGreaterThan(titleArtBottom);
  });

  it("keeps the name above the card, the card above the art, and the card clear of every button", () => {
    expect(titleText.y - 16).toBeGreaterThan(0);
    expect(titleText.y + 16).toBeLessThan(top(titleCard));
    expect(titleArt.wisp.y - titleArt.wisp.scale * 31).toBeGreaterThan(bottom(titleCard));
    expect(titleArt.hero.y - titleArt.hero.scale * 40).toBeGreaterThan(bottom(titleCard));
    for (const button of buttons) {
      expect(overlap(titleCard, button)).toBe(false);
      expect(top(button) - bottom(titleCard)).toBeGreaterThan(100);
    }
  });

  it("leaves the middle of the title, where a tap starts trial 1, outside every button", () => {
    const middle = { x: canvas.width / 2, y: canvas.height / 2 };
    for (const button of buttons) expect(inside(middle, button)).toBe(false);
  });
});
