import { describe, expect, it } from "vite-plus/test";
import { lampParts } from "../../domain/crown";
import {
  badgeOf,
  crownGuide,
  crownMessage,
  heldTool,
  lampPanel,
  lampRow,
  oneButton,
  panelLabel,
  pointFrame,
  probes,
  rowSize,
  shedPicture,
  stepCell,
  stepRect,
  stepTick,
  stepWord,
  tellButton,
  tellCard,
  thingTile,
  titleCrownButton,
  townLamp,
  twoButtons,
  wishPanel,
  wishRow,
} from "../crown-layout";
import { fieldWisp, fieldWispSize, titleArt, titleFieldButton } from "../field-layout";
import { canvas, heroSize, heroStart, type Rect } from "../lane-layout";
import { titleLanternButton } from "../lantern-layout";
import { titleShadowsButton } from "../shadows-layout";
import { leaveButton, shedBox, titleArtBottom, titleShedButton } from "../shed-layout";
import { titleCard, titleIntro, titlePrompt, titleText } from "../title-layout";

// Trial 6's layout (spec 09-trial-hollow-crown, REQ-9.1.1, REQ-9.2, REQ-9.12).

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
const inside = (p: { x: number; y: number }, r: Rect) =>
  p.x >= left(r) && p.x <= right(r) && p.y >= top(r) && p.y <= bottom(r);
const within = (a: Rect, b: Rect) =>
  left(a) >= left(b) && right(a) <= right(b) && top(a) >= top(b) && bottom(a) <= bottom(b);

const steps = [0, 1, 2, 3, 4].map(stepRect);
const label = (panel: Rect): Rect => ({
  x: panel.x,
  y: panelLabel.y,
  width: panel.width,
  height: panelLabel.size + 2,
});
const wisp: Rect = { ...fieldWisp, width: fieldWispSize, height: fieldWispSize };
const town = [0, 1, 2].map(townLamp);
const cards = lampParts.flatMap((part) => [0, 1, 2].map((i) => tellCard(part, i)));
const tiles = [0, 1, 2].map(thingTile);

/** What is on screen in every stage, and what each stage adds. */
const always: Record<string, Rect> = {
  ...Object.fromEntries(steps.map((r, i) => [`step${i}`, r])),
  guide: box(crownGuide),
  wishLabel: label(wishPanel),
  lampLabel: label(lampPanel),
  wish: wishPanel,
  lamp: lampPanel,
  message: box(crownMessage),
  wisp,
  leave: leaveButton,
  ...Object.fromEntries(town.map((r, i) => [`town${i}`, r])),
};
const controls: Record<string, Rect[]> = {
  tell: [...cards, tellButton],
  give: tiles,
  go: [oneButton],
  check: [...twoButtons],
  fix: [...twoButtons],
  lit: [oneButton],
};
const targets = [...cards, tellButton, ...tiles, oneButton, ...twoButtons, leaveButton];

describe("crown layout (REQ-9.12)", () => {
  it("puts the panels, the rows, the controls and the title's button where the design says", () => {
    expect(wishPanel).toEqual({ x: 97, y: 214, width: 170, height: 172 });
    expect(lampPanel).toEqual({ x: 293, y: 214, width: 170, height: 172 });
    expect(lampRow("roof")).toEqual({ x: 293, y: 168, width: 160, height: 80 });
    expect(lampRow("light")).toEqual({ x: 293, y: 250, width: 160, height: 80 });
    expect(wishRow("roof")).toEqual({ x: 97, y: 168 });
    expect(wishRow("light")).toEqual({ x: 97, y: 250 });
    expect(stepRect(0)).toEqual({ x: 39, y: 26, width: 72, height: 40 });
    expect(stepRect(4)).toEqual({ x: 351, y: 26, width: 72, height: 40 });
    expect(tellCard("roof", 0)).toEqual({ x: 52, y: 412, width: 88, height: 80 });
    expect(tellCard("light", 2)).toEqual({ x: 240, y: 506, width: 88, height: 80 });
    expect(tellButton).toEqual({ x: 340, y: 459, width: 88, height: 174 });
    expect(thingTile(0)).toEqual({ x: 75, y: 455, width: 110, height: 110 });
    expect(thingTile(2)).toEqual({ x: 315, y: 455, width: 110, height: 110 });
    expect(townLamp(0)).toEqual({ x: 36, y: 796, width: 56, height: 64 });
    expect(townLamp(2)).toEqual({ x: 148, y: 796, width: 56, height: 64 });
    expect(titleCrownButton).toEqual({ x: 195, y: 240, width: 300, height: 80 });
    expect(oneButton).toEqual({ x: 195, y: 455, width: 300, height: 96 });
    expect(twoButtons).toEqual([
      { x: 106, y: 455, width: 170, height: 96 },
      { x: 284, y: 455, width: 170, height: 96 },
    ]);
  });

  it("keeps everything inside the canvas", () => {
    const canvasRect: Rect = { x: canvas.width / 2, y: canvas.height / 2, ...canvas };
    for (const r of [
      ...Object.values(always),
      ...Object.values(controls).flat(),
      titleCrownButton,
    ]) {
      expect(within(r, canvasRect), JSON.stringify(r)).toBe(true);
    }
  });

  it("makes every target at least 80 x 80: the cards, Tell, the things, the buttons, the parts, the way back", () => {
    for (const r of [...targets, ...lampParts.map(lampRow), titleCrownButton]) {
      expect(r.width, JSON.stringify(r)).toBeGreaterThanOrEqual(80);
      expect(r.height, JSON.stringify(r)).toBeGreaterThanOrEqual(80);
    }
  });

  it("lets nothing overlap in any stage, with what is always on screen", () => {
    for (const [stage, added] of Object.entries(controls)) {
      const all = [...Object.entries(always), ...added.map((r, i) => [`${stage}${i}`, r] as const)];
      for (let i = 0; i < all.length; i += 1) {
        for (let j = i + 1; j < all.length; j += 1) {
          const [a, ra] = all[i]!;
          const [b, rb] = all[j]!;
          expect(overlap(ra, rb), `${stage}: ${a} and ${b}`).toBe(false);
        }
      }
    }
  });
});

describe("crown layout: order and room (REQ-9.12.4)", () => {
  it("goes from the top: the steps, the guide, the labels, the panels, the message, the controls", () => {
    expect(bottom(steps[0]!)).toBeLessThanOrEqual(top(box(crownGuide)));
    expect(bottom(box(crownGuide))).toBeLessThanOrEqual(panelLabel.y - panelLabel.size / 2);
    expect(panelLabel.y + panelLabel.size / 2).toBeLessThanOrEqual(top(wishPanel));
    expect(bottom(wishPanel)).toBeLessThanOrEqual(top(box(crownMessage)));
    for (const r of Object.values(controls).flat()) {
      expect(top(r)).toBeGreaterThanOrEqual(bottom(box(crownMessage)));
    }
  });

  it("ends every control above the hero's start place, so the floor drag stays free", () => {
    const hero: Rect = { ...heroStart, width: heroSize, height: heroSize };
    for (const r of Object.values(controls).flat()) {
      expect(bottom(r)).toBeLessThan(top(hero));
    }
    for (const r of Object.values(always)) expect(overlap(r, hero), JSON.stringify(r)).toBe(false);
  });

  it("puts the two panels' rows on the same lines, inside the panels, so they compare row by row", () => {
    for (const part of lampParts) {
      expect(wishRow(part).y).toBe(lampRow(part).y);
      const row = lampRow(part);
      expect(within(row, lampPanel)).toBe(true);
      expect(within({ ...row, x: wishRow(part).x }, wishPanel)).toBe(true);
      expect(rowSize).toEqual({ width: 160, height: 80 });
    }
    expect(overlap(lampRow("roof"), lampRow("light"))).toBe(false);
    expect(wishPanel.y).toBe(lampPanel.y);
    expect(wishPanel.width).toBe(lampPanel.width);
  });

  it("keeps the wish's lit glow inside its panel: the light's row ends 10 pixels above the panel's bottom", () => {
    expect(bottom(wishPanel) - bottom(lampRow("light"))).toBeGreaterThanOrEqual(10);
  });

  it("keeps the town's lamps clear of the wisp's glow, about 60 pixels round it", () => {
    for (const r of town)
      expect(Math.hypot(r.x - fieldWisp.x, top(r) - fieldWisp.y)).toBeGreaterThan(60);
  });

  it("fits the half-size shed and the held tool inside the wisp's panel", () => {
    const shed: Rect = {
      x: shedPicture.x,
      y: shedPicture.y,
      width: shedBox.width * shedPicture.scale,
      height: shedBox.height * shedPicture.scale,
    };
    expect(within(shed, lampPanel)).toBe(true);
    const tool: Rect = {
      x: heldTool.x,
      y: heldTool.y,
      width: heldTool.size,
      height: heldTool.size,
    };
    expect(within(tool, lampPanel)).toBe(true);
    expect(overlap(tool, shed)).toBe(false);
  });

  it("puts the way back to the title where the shed has it (REQ-9.10.4)", () => {
    expect(leaveButton).toEqual({ x: 347, y: 788, width: 80, height: 80 });
  });

  it("keeps the step's tick and word inside its cell, and the frame of a pointed part inside its row", () => {
    for (const r of steps) {
      expect(inside({ x: r.x + stepTick.x - stepTick.size, y: r.y }, r)).toBe(true);
      expect(inside({ x: r.x + stepWord.x, y: r.y }, r)).toBe(true);
    }
    expect(stepCell).toEqual({ width: 72, height: 40 });
    expect(pointFrame.inset).toBeGreaterThan(0);
    expect(pointFrame.inset + pointFrame.line).toBeLessThan(rowSize.height / 2);
  });
});

describe("crown probes (REQ-9.16.2)", () => {
  it("reads each step on its own cell, the frame on the top edge and the tick on the left", () => {
    for (let i = 0; i < 5; i += 1) {
      const r = stepRect(i);
      expect(inside(probes.stepFrame(i), r)).toBe(true);
      expect(probes.stepFrame(i).y).toBe(top(r));
      expect(inside(probes.stepTick(i), r)).toBe(true);
      expect(probes.stepTick(i).x).toBeLessThan(r.x + stepWord.x - 16);
    }
  });

  it("reads a card's or the lamp's badge on its top right corner, and a town lamp's top ray above its body", () => {
    expect(badgeOf(tellCard("roof", 0))).toEqual({ x: 88, y: 380 });
    expect(probes.badge(lampPanel)).toEqual({ x: 370, y: 126 });
    expect(probes.badge(tellCard("roof", 0))).toEqual({ x: 88, y: 370 });
    // Above the card or the panel, where nothing else is drawn.
    expect(probes.badge(lampPanel).y).toBeLessThan(top(lampPanel));
    expect(probes.badge(tellCard("light", 1)).y).toBeLessThan(top(tellCard("light", 1)));
    // At least 10 pixels below the roof's cards, so their edge does not reach the probe.
    expect(
      probes.badge(tellCard("light", 1)).y - bottom(tellCard("roof", 1)),
    ).toBeGreaterThanOrEqual(10);
    expect(probes.badge(tellCard("roof", 1)).y).toBeGreaterThan(bottom(box(crownMessage)));
    for (let i = 0; i < 3; i += 1) {
      const r = townLamp(i);
      expect(inside(probes.townRay(i), r)).toBe(true);
      expect(probes.townRay(i)).toEqual({ x: r.x, y: r.y - 29 });
    }
  });
});

describe("the title's five buttons and trial 1's card (REQ-9.1.1)", () => {
  const lower = [titleLanternButton, titleShadowsButton, titleFieldButton, titleShedButton];

  it("puts trial 6's button between trial 1's card and the art, clear of both", () => {
    expect(top(titleCrownButton) - bottom(titleCard)).toBeGreaterThanOrEqual(8);
    expect(overlap(titleCrownButton, titleCard)).toBe(false);
    expect(titleArt.wisp.y - titleArt.wisp.scale * 31).toBeGreaterThan(bottom(titleCrownButton));
    expect(titleArt.hero.y - titleArt.hero.scale * 40).toBeGreaterThan(bottom(titleCrownButton));
    expect(left(titleCrownButton)).toBeGreaterThanOrEqual(0);
    expect(right(titleCrownButton)).toBeLessThanOrEqual(canvas.width);
  });

  it("does not move the art or the other four buttons", () => {
    expect(titleArt.wisp).toMatchObject({ x: 285, y: 360 });
    expect(titleArt.hero).toMatchObject({ x: 110, y: 370 });
    expect(titleArtBottom).toBe(426);
    expect(lower.map((b) => b.y)).toEqual([472, 560, 648, 736]);
    for (const b of lower) expect(overlap(b, titleCrownButton)).toBe(false);
  });

  it("keeps the name above the card and the card holding its prompt and rule", () => {
    expect(titleText.y - 16).toBeGreaterThan(0);
    expect(titleText.y + 16).toBeLessThan(top(titleCard));
    const prompt = { ...titlePrompt, width: 300, height: titlePrompt.size + 8 };
    const intro = { ...titleIntro, width: 300, height: 2 * titleIntro.size + 8 };
    expect(within(prompt, titleCard)).toBe(true);
    expect(within(intro, titleCard)).toBe(true);
    expect(overlap(prompt, intro)).toBe(false);
  });

  it("leaves the middle of the title, where a tap starts trial 1, outside every button", () => {
    const middle = { x: canvas.width / 2, y: canvas.height / 2 };
    for (const b of [titleCrownButton, ...lower]) expect(inside(middle, b)).toBe(false);
  });
});
