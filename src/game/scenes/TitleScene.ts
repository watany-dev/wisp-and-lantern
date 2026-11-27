// The title screen: the game's name, trial 1's card (a tap anywhere starts it, and it has the 60 seconds),
// the wisp and the hero, and four buttons that open trial 2 (the shed), trial 3 (the field), trial 4 (the shadows)
// and trial 5 (the lantern), which are 60-second runs too. Each button says so in its own caption. A fifth button,
// between trial 1's card and the art, opens trial 6 (the crown), which has no clock. Specs:
// .kiro/specs/04-score-attack/design.md, .kiro/specs/05-trial-grant-tools/design.md,
// .kiro/specs/06-trial-verify-stars/design.md, .kiro/specs/07-trial-keep-secrets/design.md,
// .kiro/specs/08-trial-tell-whats-wrong/design.md, .kiro/specs/09-trial-hollow-crown/design.md

import Phaser from "phaser";
import type { GameState } from "../../domain/state";
import { titleCrownButton } from "../crown-layout";
import type { Game } from "../judge";
import { titleArt, titleFieldButton } from "../field-layout";
import type { Rect } from "../lane-layout";
import { titleLanternButton } from "../lantern-layout";
import { sceneFor } from "../route";
import { newSeed } from "../seed";
import { titleShedButton } from "../shed-layout";
import { titleShadowsButton } from "../shadows-layout";
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
import { drawCrownIcon } from "../ui/crown-art";
import { drawLantern } from "../ui/items";
import { drawPadlock } from "../ui/shadow-art";
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
const drawLock = (g: Phaser.GameObjects.Graphics) => drawPadlock(g, 46);
/** An orange glass, so the lantern reads on the gold button. */
const drawLanternIcon = (g: Phaser.GameObjects.Graphics) => drawLantern(g, 44, 0xff9d5c);

type Entrance = { label: Phaser.GameObjects.Text; caption: Phaser.GameObjects.Text };

export class TitleScene extends Phaser.Scene {
  private title!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private intro!: Phaser.GameObjects.Text;
  private shed!: Entrance;
  private field!: Entrance;
  private shadows!: Entrance;
  private lantern!: Entrance;
  private crown!: Entrance;
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
    this.createEntrances();

    // A press that hit an object (a button) is that object's, not the start of trial 1.
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (_p: unknown, over: unknown[]) => {
      if (over.length === 0 && this.game.getTime() >= this.lockUntil) this.start();
    });
    this.guardTouch();
    const unsubscribe = this.game_.subscribe((s) => this.render(s));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
    this.render(this.game_.state());
  }

  /** Trial 6's button above the art, then the four buttons under it, from the top: trial 5, 4, 3 and 2. */
  private createEntrances(): void {
    this.crown = this.createEntrance(titleCrownButton, drawCrownIcon, () =>
      this.enter({ type: "StartCrown", seed: newSeed() }),
    );
    this.lantern = this.createEntrance(titleLanternButton, drawLanternIcon, () =>
      this.enter({ type: "StartLantern", seed: newSeed() }),
    );
    this.shadows = this.createEntrance(titleShadowsButton, drawLock, () =>
      this.enter({ type: "StartShadows", seed: newSeed() }),
    );
    this.field = this.createEntrance(titleFieldButton, drawGoldStar, () =>
      this.enter({ type: "StartField", seed: newSeed() }),
    );
    this.shed = this.createEntrance(titleShedButton, drawKey, () =>
      this.enter({ type: "StartShed", seed: newSeed() }),
    );
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

  private enter(event: {
    type: "StartShed" | "StartField" | "StartShadows" | "StartLantern" | "StartCrown";
    seed: number;
  }): void {
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
    this.shadows.label.setText(view.shadows);
    this.shadows.caption.setText(view.shadowsCaption);
    this.lantern.label.setText(view.lantern);
    this.lantern.caption.setText(view.lanternCaption);
    this.crown.label.setText(view.crown);
    this.crown.caption.setText(view.crownCaption);
  }
}
