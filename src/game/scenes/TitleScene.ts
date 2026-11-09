// The title screen: the game's name, what to do, the 60-second goal, and the wisp and the hero.
// Spec: .kiro/specs/04-score-attack/design.md

import Phaser from "phaser";
import en from "../../content/strings.en.json";
import ja from "../../content/strings.ja.json";
import type { GameState } from "../../domain/state";
import type { Game } from "../judge";
import { canvas } from "../lane-layout";
import { drawBackground } from "../ui/background";
import { fitCamera } from "../ui/camera";
import { textStyle } from "../ui/text";
import { createHero, createWispArt } from "../ui/wisp-actor";

const strings = { ja, en };
const centerX = canvas.width / 2;

export class TitleScene extends Phaser.Scene {
  private title!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private intro!: Phaser.GameObjects.Text;

  constructor(private readonly game_: Game) {
    super("title");
  }

  create(): void {
    fitCamera(this);
    drawBackground(this);
    this.createTexts();
    this.add.container(285, 590, [createWispArt(this)]).setScale(2);
    this.createHero();

    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (this.game_.state().phase === "title") this.game_.dispatch({ type: "Start" });
    });
    this.game.canvas.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

    const unsubscribe = this.game_.subscribe((s) => this.render(s));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
    this.render(this.game_.state());
  }

  private createTexts(): void {
    const text = (y: number, size: number) =>
      this.add.text(centerX, y, "", { ...textStyle, fontSize: `${size}px` }).setOrigin(0.5);
    this.title = text(230, 32);
    this.prompt = text(340, 26);
    this.intro = text(430, 22);
    this.tweens.add({ targets: this.prompt, alpha: 0.45, duration: 900, yoyo: true, repeat: -1 });
  }

  private createHero(): void {
    this.add.container(110, 600, [createHero(this)]).setScale(1.6);
  }

  /** The title is only the first screen: once the trial starts, the lane scene takes over. */
  private render(state: GameState): void {
    if (state.phase === "trial") {
      this.scene.start("lane");
      return;
    }
    const s = strings[state.lang];
    this.title.setText(s.title);
    this.prompt.setText(s.start);
    this.intro.setText(s.run.intro);
  }
}
