// The title screen: the game's name, what to do, the 60-second goal, and the wisp and the hero.
// A tap anywhere starts trial 1; the button at the bottom opens trial 2 (the shed) and only that.
// Specs: .kiro/specs/04-score-attack/design.md, .kiro/specs/05-trial-grant-tools/design.md

import Phaser from "phaser";
import en from "../../content/strings.en.json";
import ja from "../../content/strings.ja.json";
import type { GameState } from "../../domain/state";
import type { Game } from "../judge";
import { canvas } from "../lane-layout";
import { sceneFor } from "../route";
import { titleShedButton } from "../shed-layout";
import { shedEnterLabel } from "../shed-view";
import { drawButton } from "../ui/art";
import { drawBackground } from "../ui/background";
import { fitCamera } from "../ui/camera";
import { inkStyle, textStyle } from "../ui/text";
import { drawTool } from "../ui/tools";
import { createHero, createWispArt } from "../ui/wisp-actor";

const strings = { ja, en };
const centerX = canvas.width / 2;

export class TitleScene extends Phaser.Scene {
  private title!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private intro!: Phaser.GameObjects.Text;
  private shedLabel!: Phaser.GameObjects.Text;

  constructor(private readonly game_: Game) {
    super("title");
  }

  create(): void {
    fitCamera(this);
    drawBackground(this);
    this.createTexts();
    this.add.container(285, 590, [createWispArt(this)]).setScale(2);
    this.createHero();
    this.createShedButton();

    // A press that hit an object (the shed button) is that object's, not the start of trial 1.
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (_p: unknown, over: unknown[]) => {
      if (over.length === 0 && this.game_.state().phase === "title") {
        this.game_.dispatch({ type: "Start" });
      }
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

  /** The way into trial 2: a button with a key on it, and its own tap handler. */
  private createShedButton(): void {
    const { x, y, width, height } = titleShedButton;
    const panel = this.add.graphics();
    drawButton(panel, width, height);
    const key = this.add.graphics({ x: -width / 2 + 44, y: 0 });
    drawTool(key, "key", 46);
    this.shedLabel = this.add.text(22, 0, "", { ...inkStyle, fontSize: "24px" }).setOrigin(0.5);
    const button = this.add.container(x, y, [panel, key, this.shedLabel]).setSize(width, height);
    button.setInteractive().on("pointerdown", () => this.openShed());
  }

  private openShed(): void {
    if (this.game_.state().phase === "title") this.game_.dispatch({ type: "StartShed" });
  }

  /** The title is only the first screen: once a trial starts, its scene takes over. */
  private render(state: GameState): void {
    if (state.phase === "trial") {
      this.scene.start(sceneFor(state));
      return;
    }
    const s = strings[state.lang];
    this.title.setText(s.title);
    this.prompt.setText(s.start);
    this.intro.setText(s.run.intro);
    this.shedLabel.setText(shedEnterLabel(state.lang));
  }
}
