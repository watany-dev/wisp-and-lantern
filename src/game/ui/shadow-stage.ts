// The shadow and the speech bubble over its head: the bubble shows nothing while the child decides, the item
// the shadow heard after a give, and three quiet dots after a keep. Painting only (ADR 0003).

import type Phaser from "phaser";
import type { ShadowsView } from "../shadows-view";
import { bubbleBox, bubbleItem, shadowBox } from "../shadows-layout";
import { drawItemArt } from "./item-art";
import { drawBubble, drawQuiet, drawShadow } from "./shadow-art";

export type StageWidget = {
  shadow: Phaser.GameObjects.Graphics;
  bubble: Phaser.GameObjects.Container;
  content: Phaser.GameObjects.Graphics;
};

export function createStage(scene: Phaser.Scene): StageWidget {
  const shadow = scene.add.graphics({ x: shadowBox.x, y: shadowBox.y });
  drawShadow(shadow);
  const face = scene.add.graphics();
  drawBubble(face);
  const content = scene.add.graphics();
  const bubble = scene.add.container(bubbleBox.x, bubbleBox.y, [face, content]).setVisible(false);
  return { shadow, bubble, content };
}

/** The bubble follows the view: hidden while deciding, then the item or the quiet dots. */
export function paintStage(widget: StageWidget, view: ShadowsView): void {
  widget.bubble.setVisible(view.bubble !== "none");
  widget.content.clear();
  if (view.bubble === "item") drawItemArt(widget.content, view.item.id, bubbleItem.size);
  if (view.bubble === "quiet") drawQuiet(widget.content);
}
