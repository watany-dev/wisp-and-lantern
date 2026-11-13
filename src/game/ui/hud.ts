// The top row of a 60-second run: the whole seconds left, a bar that shrinks, and the score. The same
// row as trial 1's (`hudTime`, `hudBar`, `hudScore` in `lane-layout.ts`). Painting only; no logic (ADR 0003).

import type Phaser from "phaser";
import { hudBar, hudScore, hudTime } from "../lane-layout";
import type { Hud } from "../lane-view";
import { drawBar } from "./art";
import { goldStyle, textStyle } from "./text";

export type HudWidget = {
  clock: Phaser.GameObjects.Text;
  score: Phaser.GameObjects.Text;
  bar: Phaser.GameObjects.Graphics;
};

export function createHud(scene: Phaser.Scene): HudWidget {
  const clock = scene.add
    .text(hudTime.x, hudTime.y, "", { ...textStyle, fontSize: "26px" })
    .setOrigin(0.5);
  const score = scene.add
    .text(hudScore.x + hudScore.width / 2, hudScore.y, "", { ...goldStyle, fontSize: "22px" })
    .setOrigin(1, 0.5);
  const bar = scene.add.graphics({
    x: hudBar.x - hudBar.width / 2,
    y: hudBar.y - hudBar.height / 2,
  });
  return { clock, score, bar };
}

export function paintHud(widget: HudWidget, hud: Hud): void {
  widget.clock.setText(String(hud.seconds));
  widget.score.setText(hud.score);
  widget.bar.clear();
  drawBar(widget.bar, hudBar.width, hudBar.height, hud.fraction);
}
