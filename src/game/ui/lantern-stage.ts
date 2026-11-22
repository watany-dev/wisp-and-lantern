// The two panels of trial 5: the wish on the left, always lit, and the wisp's lantern on the right, whose three
// parts are tap targets. Each part of the wisp's lantern has its picture and a frame (dots for the part that
// flickers, a solid line for the part pointed at). A lit lantern has `drawPickedMark`'s gold frame and tick on its
// panel. The flicker is a slow fade of the part's picture (1.25 times a second); the frame does not move, so the
// still picture carries the meaning (REQ-8.3.3). Painting only (ADR 0003).

import type Phaser from "phaser";
import { parts, type PartId } from "../../domain/lantern";
import {
  frame,
  frameDots,
  lanternPanel,
  panelLabel,
  partRect,
  wishPanel,
  wishPartAt,
} from "../lantern-layout";
import type { Rect } from "../lane-layout";
import type { LanternView, PartMark } from "../lantern-view";
import { drawPanel, drawPickedMark, palette } from "./art";
import { drawPart } from "./lantern-art";
import { textStyle } from "./text";

type Graphics = Phaser.GameObjects.Graphics;
type Text = Phaser.GameObjects.Text;

export type LanternStage = {
  wish: Record<PartId, Graphics>;
  parts: Record<PartId, Graphics>;
  frames: Record<PartId, Graphics>;
  tick: Graphics;
  wishLabel: Text;
  lanternLabel: Text;
};

const byPart = <T>(make: (part: PartId) => T): Record<PartId, T> => ({
  handle: make("handle"),
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
function createTarget(scene: Phaser.Scene, part: PartId, onTap: (part: PartId) => void): void {
  const { x, y, width, height } = partRect(part);
  scene.add
    .zone(x, y, width, height)
    .setInteractive()
    .on("pointerdown", () => onTap(part));
}

export function createLanternStage(
  scene: Phaser.Scene,
  onTap: (part: PartId) => void,
): LanternStage {
  const wishLabel = createPanel(scene, wishPanel);
  const lanternLabel = createPanel(scene, lanternPanel);
  const wish = byPart((part) => scene.add.graphics(wishPartAt(part)));
  const shown = byPart((part) => scene.add.graphics({ x: partRect(part).x, y: partRect(part).y }));
  const frames = byPart(() => scene.add.graphics());
  const tick = scene.add.graphics({ x: lanternPanel.x, y: lanternPanel.y }).setVisible(false);
  drawPickedMark(tick, lanternPanel.width, lanternPanel.height);
  for (const part of parts) createTarget(scene, part, onTap);
  return { wish, parts: shown, frames, tick, wishLabel, lanternLabel };
}

/** A frame of dots, a solid line on the same path, or nothing. */
function drawFrame(g: Graphics, part: PartId, mark: PartMark): void {
  g.clear();
  const rect = partRect(part);
  if (mark === "dots") {
    g.fillStyle(palette.gold, 1);
    for (const dot of frameDots(rect)) g.fillCircle(dot.x, dot.y, frame.dot);
  } else if (mark === "solid") {
    const inset = frame.inset;
    g.lineStyle(frame.line, palette.gold, 1);
    g.strokeRect(
      rect.x - rect.width / 2 + inset,
      rect.y - rect.height / 2 + inset,
      rect.width - 2 * inset,
      rect.height - 2 * inset,
    );
  }
}

/** Draws the view: the wish, the wisp's lantern part by part with its frames, the badge, the labels. */
export function paintLanternStage(widget: LanternStage, view: LanternView): void {
  widget.wishLabel.setText(view.wishLabel);
  widget.lanternLabel.setText(view.lanternLabel);
  for (const part of parts) drawPart(widget.wish[part], view.wish[part], true);
  for (const { part, look, mark } of view.parts) {
    drawPart(widget.parts[part], look, view.lit);
    drawFrame(widget.frames[part], part, mark);
  }
  widget.tick.setVisible(view.lit);
}
