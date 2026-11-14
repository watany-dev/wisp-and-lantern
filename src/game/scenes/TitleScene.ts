// The title screen: the game's name, trial 1's card (a tap anywhere starts it, and it has the 60 seconds),
// the wisp and the hero, and two buttons that open trial 2 (the shed) and trial 3 (the field), which are
// 60-second runs too. Each button says so in its own caption. Specs:
// .kiro/specs/04-score-attack/design.md, .kiro/specs/05-trial-grant-tools/design.md,
// .kiro/specs/06-trial-verify-stars/design.md

import Phaser from "phaser";
import type { GameState } from "../../domain/state";
import type { Game } from "../judge";
import { titleArt, titleFieldButton } from "../field-layout";
import type { Rect } from "../lane-layout";
import { sceneFor } from "../route";
import { newSeed } from "../seed";
import { titleShedButton } from "../shed-layout";
import {
  buttonCaption,
  buttonLabel,
  buttonPicture,
  titleCard,
  titleIntro,
  titlePrompt,
  titleText,
} from "../title-layout";
import { titleView, type TitleView } from "../title-view";
import { drawButton, drawPanel, drawStar, palette } from "../ui/art";
import { drawBackground } from "../ui/background";
import { fitCamera } from "../ui/camera";
import { inkStyle, textStyle } from "../ui/text";
import { drawTool } from "../ui/tools";
import { createHero, createWispArt } from "../ui/wisp-actor";

/** After a trial sends the child back here, a quick second tap must not start trial 1. */
const returnLockMs = 700;

/** The canvas does not scroll or zoom the page while the child plays. */
const stop = (e: TouchEvent) => e.preventDefault();

const drawKey = (g: Phaser.GameObjects.Graphics) => drawTool(g, "key", 46);
const drawGoldStar = (g: Phaser.GameObjects.Graphics) => drawStar(g, 20);

type Entrance = { label: Phaser.GameObjects.Text; caption: Phaser.GameObjects.Text };

export class TitleScene extends Phaser.Scene {
  private title!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private intro!: Phaser.GameObjects.Text;
  private shed!: Entrance;
  private field!: Entrance;
  private lockUntil = 0;
  private fromTrial = false;
  private touchGuarded = false;

  constructor(private readonly game_: Game) {
    super("title");
  }

  init(data?: { fromTrial?: boolean }): void {
    this.fromTrial = data?.fromTrial === true;
  }

  create(): void {
    this.lockUntil = this.fromTrial ? this.game.getTime() + returnLockMs : 0;
    fitCamera(this);
    drawBackground(this);
    this.createTexts();
    const { wisp, hero } = titleArt;
    this.add.container(wisp.x, wisp.y, [createWispArt(this)]).setScale(wisp.scale);
    this.add.container(hero.x, hero.y, [createHero(this)]).setScale(hero.scale);
    this.shed = this.createEntrance(titleShedButton, drawKey, () =>
      this.enter({ type: "StartShed", seed: newSeed() }),
    );
    this.field = this.createEntrance(titleFieldButton, drawGoldStar, () =>
      this.enter({ type: "StartField", seed: newSeed() }),
    );

    // A press that hit an object (a button) is that object's, not the start of trial 1.
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (_p: unknown, over: unknown[]) => {
      if (over.length === 0 && this.game.getTime() >= this.lockUntil) this.start();
    });
    this.guardTouch();
    const unsubscribe = this.game_.subscribe((s) => this.render(s));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
    this.render(this.game_.state());
  }

  /** The canvas never scrolls or zooms the page, in every scene. Added once: the title can be entered again. */
  private guardTouch(): void {
    if (this.touchGuarded) return;
    this.touchGuarded = true;
    this.game.canvas.addEventListener("touchmove", stop, { passive: false });
  }

  private start(): void {
    if (this.game_.state().phase === "title") this.game_.dispatch({ type: "Start" });
  }

  /** The name, and trial 1's card with its way in and its rule. */
  private createTexts(): void {
    const text = (at: { x: number; y: number }, size: number) =>
      this.add.text(at.x, at.y, "", { ...textStyle, fontSize: `${size}px` }).setOrigin(0.5);
    this.title = text(titleText, 32);
    const { x, y, width, height } = titleCard;
    const card = this.add.graphics({ x, y });
    drawPanel(card, width, height, palette.lit, 0.7);
    card
      .lineStyle(2, palette.gold, 0.8)
      .strokeRoundedRect(-width / 2, -height / 2, width, height, 14);
    this.prompt = text(titlePrompt, titlePrompt.size);
    this.intro = text(titleIntro, titleIntro.size);
    this.tweens.add({ targets: this.prompt, alpha: 0.45, duration: 900, yoyo: true, repeat: -1 });
  }

  /** A button with a picture on the left, its label, and a small caption under the label. */
  private createEntrance(
    rect: Rect,
    draw: (g: Phaser.GameObjects.Graphics) => void,
    open: () => void,
  ): Entrance {
    const { x, y, width, height } = rect;
    const panel = this.add.graphics();
    drawButton(panel, width, height);
    const picture = this.add.graphics({ x: buttonPicture.x, y: 0 });
    draw(picture);
    const label = this.add
      .text(buttonLabel.x, buttonLabel.y, "", { ...inkStyle, fontSize: `${buttonLabel.size}px` })
      .setOrigin(0.5);
    const style = { ...inkStyle, fontSize: `${buttonCaption.size}px` };
    const caption = this.add.text(buttonCaption.x, buttonCaption.y, "", style).setOrigin(0.5);
    const button = this.add
      .container(x, y, [panel, picture, label, caption])
      .setSize(width, height);
    button.setInteractive().on("pointerdown", open);
    return { label, caption };
  }

  private enter(event: { type: "StartShed" | "StartField"; seed: number }): void {
    if (this.game_.state().phase === "title") this.game_.dispatch(event);
  }

  /** The title is only the first screen: once a trial starts, its scene takes over. */
  private render(state: GameState): void {
    if (state.phase === "trial") {
      this.scene.start(sceneFor(state));
      return;
    }
    this.show(titleView(state.lang));
  }

  private show(view: TitleView): void {
    this.title.setText(view.title);
    this.prompt.setText(view.prompt);
    this.intro.setText(view.intro);
    this.shed.label.setText(view.shed);
    this.shed.caption.setText(view.shedCaption);
    this.field.label.setText(view.field);
    this.field.caption.setText(view.fieldCaption);
  }
}
