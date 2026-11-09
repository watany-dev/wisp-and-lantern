// Scaffold stub: replaced by .kiro/specs/01-core-loop

import Phaser from "phaser";
import type { Game } from "./judge";
import { LaneScene } from "./scenes/LaneScene";
import { OverScene } from "./scenes/OverScene";
import { TitleScene } from "./scenes/TitleScene";
import { canvas } from "./lane-layout";
import { pixelRatio } from "./ui/pixel-ratio";

export function boot(parent: HTMLElement, game: Game): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    transparent: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      // The canvas has one device pixel per screen pixel; each scene zooms its camera to match.
      width: canvas.width * pixelRatio,
      height: canvas.height * pixelRatio,
    },
    input: { activePointers: 2 },
    scene: [new TitleScene(game), new LaneScene(game), new OverScene(game)],
  });
}
