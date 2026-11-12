// The button back to the title: a gold panel with one word. Tapping it calls `onTap`. It is 80 x 80 on
// the shed's screen (`leaveButton`) and wide on the end screen (`overLeave`). Painting only (ADR 0003).

import type Phaser from "phaser";
import type { Rect } from "../lane-layout";
import { drawButton } from "./art";
import { inkStyle } from "./text";

export type LeaveWidget = { box: Phaser.GameObjects.Container; label: Phaser.GameObjects.Text };

export function createLeaveButton(
  scene: Phaser.Scene,
  { x, y, width, height }: Rect,
  size: number,
  onTap: () => void,
): LeaveWidget {
  const panel = scene.add.graphics();
  drawButton(panel, width, height);
  const label = scene.add.text(0, 0, "", { ...inkStyle, fontSize: `${size}px` }).setOrigin(0.5);
  const box = scene.add.container(x, y, [panel, label]).setSize(width, height);
  box.setInteractive().on("pointerdown", onTap);
  return { box, label };
}
