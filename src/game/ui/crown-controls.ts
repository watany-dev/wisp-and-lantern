// The controls of trial 6's step: a gold button for each control in the view, at the control's own rectangle, with
// its picture (a look, a tool, a secret, a tick or a ring of dots) above its word, and a frame and tick when a tell
// card is picked. The buttons are made again when the set of ids changes, and a new set ignores presses for 450 ms
// (`button-lock.ts`), so a quick double tap never presses the next step's button. Painting only (ADR 0003).

import type Phaser from "phaser";
import { items, type ItemId } from "../../domain/shadows";
import { tools, type ToolId } from "../../domain/shed";
import { pressable, setChanged } from "../button-lock";
import type { ControlIcon, ControlView } from "../crown-view";
import { drawButton, drawPickedMark } from "./art";
import { drawIcon } from "./field-buttons";
import { drawItemArt } from "./item-art";
import { inkStyle } from "./text";
import { drawTool } from "./tools";

type Graphics = Phaser.GameObjects.Graphics;
type Container = Phaser.GameObjects.Container;

export type ControlsWidget = {
  boxes: Container[];
  shown: { at: number; ids: readonly string[] };
};

const toolIcons: readonly ControlIcon[] = tools;
const itemIcons: readonly ControlIcon[] = items;
const isTool = (icon: ControlIcon): icon is ToolId => toolIcons.includes(icon);
const isItem = (icon: ControlIcon): icon is ItemId => itemIcons.includes(icon);

function drawPicture(g: Graphics, icon: ControlIcon, size: number): void {
  if (isTool(icon)) drawTool(g, icon, size);
  else if (isItem(icon)) drawItemArt(g, icon, size);
  else drawIcon(g, icon);
}

function createControl(
  scene: Phaser.Scene,
  view: ControlView,
  press: (view: ControlView) => void,
): Container {
  const { x, y, width, height } = view.rect;
  const panel = scene.add.graphics();
  drawButton(panel, width, height);
  const size = width < 100 ? 18 : 22;
  const label = scene.add
    .text(0, 0, view.text, { ...inkStyle, fontSize: `${size}px` })
    .setOrigin(0.5);
  const parts: Phaser.GameObjects.GameObject[] = [panel, label];
  if (view.icon !== "none") {
    const picture = scene.add.graphics({ x: 0, y: -height * 0.17 });
    drawPicture(picture, view.icon, Math.min(46, height * 0.42));
    label.setY(height * 0.27);
    parts.push(picture);
  }
  if (view.picked) {
    const mark = scene.add.graphics();
    drawPickedMark(mark, width, height);
    parts.push(mark);
  }
  const box = scene.add.container(x, y, parts).setSize(width, height);
  box.setInteractive().on("pointerdown", () => press(view));
  return box;
}

export function createControls(): ControlsWidget {
  return { boxes: [], shown: { at: 0, ids: [] } };
}

/** Makes the buttons again for the view's controls. A new set of ids starts the 450 ms lock. */
export function paintControls(
  scene: Phaser.Scene,
  widget: ControlsWidget,
  controls: ControlView[],
  dispatch: (event: ControlView["event"]) => void,
): void {
  const ids = controls.map((c) => c.id);
  const now = scene.game.getTime();
  if (setChanged(widget.shown.ids, ids)) widget.shown = { at: now, ids };
  for (const box of widget.boxes) box.destroy();
  const press = (view: ControlView) => {
    if (pressable(scene.game.getTime(), widget.shown.at)) dispatch(view.event);
  };
  widget.boxes = controls.map((view) => createControl(scene, view, press));
}
