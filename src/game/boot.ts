// Scaffold stub: replaced by .kiro/specs/01-core-loop

import Phaser from "phaser";
import type { Game } from "./judge";
import { LaneScene } from "./scenes/LaneScene";
import { OverScene } from "./scenes/OverScene";
import { TitleScene } from "./scenes/TitleScene";

export function boot(parent: HTMLElement, game: Game): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#0b0b14",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 390,
      height: 844,
    },
    input: { activePointers: 2 },
    scene: [new TitleScene(game), new LaneScene(game), new OverScene(game)],
  });
}
