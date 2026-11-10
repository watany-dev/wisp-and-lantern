// The title screen: the game's name, what to do, the 60-second goal, and the wisp and the hero.
// A tap anywhere starts trial 1; the two buttons at the bottom open trial 2 (the shed) and trial 3 (the
// field), and only that. Specs: .kiro/specs/04-score-attack/design.md,
// .kiro/specs/05-trial-grant-tools/design.md, .kiro/specs/06-trial-verify-stars/design.md

import Phaser from "phaser";
import en from "../../content/strings.en.json";
import ja from "../../content/strings.ja.json";
import type { GameState } from "../../domain/state";
import type { Game } from "../judge";
import { titleArt, titleFieldButton } from "../field-layout";
import { fieldEnterLabel } from "../field-view";
import { canvas, type Rect } from "../lane-layout";
import { sceneFor } from "../route";
import { titleShedButton } from "../shed-layout";
import { shedEnterLabel } from "../shed-view";
import { drawButton, drawStar } from "../ui/art";
import { drawBackground } from "../ui/background";
import { fitCamera } from "../ui/camera";
import { inkStyle, textStyle } from "../ui/text";
import { drawTool } from "../ui/tools";
import { createHero, createWispArt } from "../ui/wisp-actor";

const strings = { ja, en };
const centerX = canvas.width / 2;

const drawKey = (g: Phaser.GameObjects.Graphics) => drawTool(g, "key", 46);
const drawGoldStar = (g: Phaser.GameObjects.Graphics) => drawStar(g, 20);

export class TitleScene extends Phaser.Scene {
  private title!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private intro!: Phaser.GameObjects.Text;
  private shedLabel!: Phaser.GameObjects.Text;
  private fieldLabel!: Phaser.GameObjects.Text;

  constructor(private readonly game_: Game) {
    super("title");
  }

  create(): void {
    fitCamera(this);
    drawBackground(this);
    this.createTexts();
    const { wisp, hero } = titleArt;
    this.add.container(wisp.x, wisp.y, [createWispArt(this)]).setScale(wisp.scale);
    this.add.container(hero.x, hero.y, [createHero(this)]).setScale(hero.scale);
    this.createShedButton();
    this.createFieldButton();

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

  /** A button with a picture on the left and its label, as the way into a trial. Returns the label. */
  private createEntrance(
    rect: Rect,
    draw: (g: Phaser.GameObjects.Graphics) => void,
    open: () => void,
  ) {
    const { x, y, width, height } = rect;
    const panel = this.add.graphics();
    drawButton(panel, width, height);
    const picture = this.add.graphics({ x: -width / 2 + 44, y: 0 });
    draw(picture);
    const label = this.add.text(22, 0, "", { ...inkStyle, fontSize: "24px" }).setOrigin(0.5);
    const button = this.add.container(x, y, [panel, picture, label]).setSize(width, height);
    button.setInteractive().on("pointerdown", open);
    return label;
  }

  /** The way into trial 2: a button with a key on it, and its own tap handler. */
  private createShedButton(): void {
    this.shedLabel = this.createEntrance(titleShedButton, drawKey, () => this.enter("StartShed"));
  }

  /** The way into trial 3: a button with a star on it, and its own tap handler. */
  private createFieldButton(): void {
    this.fieldLabel = this.createEntrance(titleFieldButton, drawGoldStar, () =>
      this.enter("StartField"),
    );
  }

  private enter(type: "StartShed" | "StartField"): void {
    if (this.game_.state().phase === "title") this.game_.dispatch({ type });
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
    this.fieldLabel.setText(fieldEnterLabel(state.lang));
  }
}
