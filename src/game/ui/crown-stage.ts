// The two panels of trial 6: the wish on the left, always lit, and the wisp's panel on the right. The wisp's panel
// shows what the child has told so far (a ring of dots for a part not told yet), the shed with its job and the tool the
// wisp holds (trial 2's drawing at half size), or the lamp the wisp has, with a solid frame round the pointed part and
// a tick badge when it is lit. Its two rows are tap targets; the reducer ignores a tap outside the fix step.
// Painting only (ADR 0003).

import type Phaser from "phaser";
import { lampParts, type LampPart } from "../../domain/crown";
import {
  heldTool,
  lampPanel,
  lampRow,
  panelLabel,
  pointFrame,
  shedPicture,
  wishPanel,
  wishRow,
} from "../crown-layout";
import type { CrownView, PanelView } from "../crown-view";
import type { Rect } from "../lane-layout";
import { drawPanel, drawPickedMark, palette } from "./art";
import { drawPart } from "./lantern-art";
import { drawShed } from "./shed-art";
import { textStyle } from "./text";
import { drawTool } from "./tools";

type Graphics = Phaser.GameObjects.Graphics;
type Text = Phaser.GameObjects.Text;

export type CrownStage = {
  wish: Record<LampPart, Graphics>;
  rows: Record<LampPart, Graphics>;
  frame: Graphics;
  shed: Graphics;
  tool: Graphics;
  tick: Graphics;
  wishLabel: Text;
  panelLabel: Text;
};

const byPart = <T>(make: (part: LampPart) => T): Record<LampPart, T> => ({
  roof: make("roof"),
  light: make("light"),
});

function createPanel(scene: Phaser.Scene, panel: Rect): Text {
  const { x, y, width, height } = panel;
  drawPanel(scene.add.graphics({ x, y }), width, height, palette.lit, 0.85);
  const style = { ...textStyle, fontSize: `${panelLabel.size}px` };
  return scene.add.text(x, panelLabel.y, "", style).setOrigin(0.5);
}

/** A part's tap target: an invisible zone the size of its row. A press on it is the part's, not the floor's. */
function createTarget(scene: Phaser.Scene, part: LampPart, onTap: (part: LampPart) => void): void {
  const { x, y, width, height } = lampRow(part);
  scene.add
    .zone(x, y, width, height)
    .setInteractive()
    .on("pointerdown", () => onTap(part));
}

export function createCrownStage(scene: Phaser.Scene, onTap: (part: LampPart) => void): CrownStage {
  const wishLabel = createPanel(scene, wishPanel);
  const label = createPanel(scene, lampPanel);
  const wish = byPart((part) => scene.add.graphics(wishRow(part)));
  const rows = byPart((part) => scene.add.graphics({ x: lampRow(part).x, y: lampRow(part).y }));
  const frame = scene.add.graphics();
  const { x, y, scale } = shedPicture;
  const shed = scene.add.graphics({ x, y }).setScale(scale);
  const tool = scene.add.graphics({ x: heldTool.x, y: heldTool.y });
  const tick = scene.add.graphics({ x: lampPanel.x, y: lampPanel.y }).setVisible(false);
  drawPickedMark(tick, lampPanel.width, lampPanel.height);
  for (const part of lampParts) createTarget(scene, part, onTap);
  return { wish, rows, frame, shed, tool, tick, wishLabel, panelLabel: label };
}

/** A part not told yet: a ring of dots where its picture will be. */
function drawUntold(g: Graphics): void {
  g.fillStyle(palette.white, 0.6);
  for (let i = 0; i < 10; i += 1) {
    const a = (i * Math.PI) / 5;
    g.fillCircle(22 * Math.cos(a), 22 * Math.sin(a), 2.5);
  }
}

function paintTold(widget: CrownStage, told: Extract<PanelView, { kind: "told" }>["told"]): void {
  for (const part of lampParts) {
    const look = told[part];
    if (look) drawPart(widget.rows[part], look, false);
    else drawUntold(widget.rows[part]);
  }
}

function paintPointed(g: Graphics, part: LampPart | null): void {
  if (part === null) return;
  const r = lampRow(part);
  const { inset, line } = pointFrame;
  g.lineStyle(line, palette.gold, 1);
  g.strokeRect(
    r.x - r.width / 2 + inset,
    r.y - r.height / 2 + inset,
    r.width - 2 * inset,
    r.height - 2 * inset,
  );
}

function paintPanel(widget: CrownStage, panel: PanelView): void {
  if (panel.kind === "told") return paintTold(widget, panel.told);
  if (panel.kind === "shed") {
    drawShed(widget.shed, { puzzle: panel.job, solved: false, tool: null, star: false });
    if (panel.tool) drawTool(widget.tool, panel.tool, heldTool.size);
    return;
  }
  for (const part of lampParts) drawPart(widget.rows[part], panel.lamp[part], panel.lit);
  paintPointed(widget.frame, panel.pointed);
}

/** Draws the view: the labels, the wish, and what the wisp's panel holds now. */
export function paintCrownStage(widget: CrownStage, view: CrownView): void {
  widget.wishLabel.setText(view.wishLabel);
  widget.panelLabel.setText(view.panelLabel);
  for (const part of lampParts) drawPart(widget.wish[part], view.wish[part], true);
  for (const g of [...Object.values(widget.rows), widget.frame, widget.shed, widget.tool])
    g.clear();
  paintPanel(widget, view.panel);
  widget.tick.setVisible(view.panel.kind === "lamp" && view.panel.lit);
}
