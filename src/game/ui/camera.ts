import type Phaser from "phaser";
import { canvas } from "../lane-layout";
import { pixelRatio } from "./pixel-ratio";

/**
 * The canvas has `pixelRatio` device pixels per game pixel. Zooming the main camera by the same
 * amount keeps every position, size and tap point in game pixels (390 x 844), as the layout has them.
 */
export function fitCamera(scene: Phaser.Scene): void {
  scene.cameras.main.setZoom(pixelRatio).centerOn(canvas.width / 2, canvas.height / 2);
}
