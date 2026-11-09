// Trial 2, The Locked Shed. Draws `shedView(state)` and turns taps into events; it keeps no rules.
// It never dispatches `Tick`: the shed has no clock. Spec: .kiro/specs/05-trial-grant-tools/design.md

import Phaser from "phaser";
import { balance } from "../../domain/balance";
import { tools, type ToolId } from "../../domain/shed";
import type { GameState, Lang } from "../../domain/state";
import type { Game } from "../judge";
import {
  buttonRect,
  fontSize,
  lessonBox,
  lessonWrap,
  messageText,
  wisp,
  wispRect,
} from "../lane-layout";
import { guideText, shedBox, shedParts, shedPoint } from "../shed-layout";
import { justTried, shedView, type ShedView } from "../shed-view";
import { stepToward } from "../steer";
import { burst, ripple } from "../fx/sparks";
import { drawButton, drawPanel, palette } from "../ui/art";
import { drawBackground } from "../ui/background";
import { fitCamera } from "../ui/camera";
import type { CardWidget } from "../ui/cards";
import { drawShed, drawShedStar } from "../ui/shed-art";
import { inkStyle, textStyle } from "../ui/text";
import { createToolCard } from "../ui/tool-card";
import { drawTool } from "../ui/tools";
import { createHero, createWispArt } from "../ui/wisp-actor";

type Graphics = Phaser.GameObjects.Graphics;
type Text = Phaser.GameObjects.Text;

export class ShedScene extends Phaser.Scene {
  private view!: ShedView;
  private shown: { shed?: GameState["shed"]; lang?: Lang } = {};
  private walks = true;
  private hero!: Phaser.GameObjects.Container;
  private wispBox!: Phaser.GameObjects.Container;
  private ring!: Graphics;
  private shedArt!: Graphics;
  private triedArt!: Graphics;
  private star!: Graphics;
  private guide!: Text;
  private message!: Text;
  private lessonPanel!: Graphics;
  private lesson!: Text;
  private button!: Phaser.GameObjects.Container;
  private buttonLabel!: Text;
  private cards = new Map<ToolId, CardWidget>();

  constructor(private readonly game_: Game) {
    super("shed");
  }

  create(): void {
    // The scene object is reused: forget what the last visit drew.
    this.shown = {};
    this.cards = new Map();
    this.walks = true;
    fitCamera(this);
    drawBackground(this, false);
    this.hero = createHero(this);
    this.createPicture();
    this.createTexts();
    this.createWisp();
    this.createButton();
    for (const id of tools) this.addCard(id);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (_p: unknown, over: unknown[]) => {
      this.walks = over.length === 0;
    });
    const unsubscribe = this.game_.subscribe((s) => this.render(s));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
    this.render(this.game_.state());
  }

  update(_time: number, deltaMs: number): void {
    const next = stepToward(this.wispBox, this.view.wispTarget, balance.wispSpeed, deltaMs);
    if (next) this.wispBox.setPosition(next.x, next.y);
    this.walkHero(deltaMs);
  }

  private walkHero(deltaMs: number): void {
    const pointer = this.input.activePointer;
    if (!this.walks || !pointer.isDown) return;
    const target = { x: pointer.worldX, y: pointer.worldY };
    const next = stepToward(this.game_.state().hero, target, balance.heroSpeed, deltaMs);
    if (next) this.game_.dispatch({ type: "MoveHeroTo", ...next });
  }

  private createPicture(): void {
    this.shedArt = this.add.graphics({ x: shedBox.x, y: shedBox.y });
    const lock = shedPoint(shedParts.tool);
    this.triedArt = this.add.graphics({ x: lock.x, y: lock.y }).setDepth(4);
    const star = shedPoint(shedParts.star);
    this.star = this.add.graphics({ x: star.x, y: star.y }).setDepth(6);
  }

  private createTexts(): void {
    const wrap = { wordWrap: { width: guideText.wrap } };
    this.guide = this.add
      .text(guideText.x, guideText.y, "", {
        ...textStyle,
        fontSize: `${fontSize.message}px`,
        ...wrap,
      })
      .setOrigin(0.5);
    const style = {
      ...textStyle,
      fontSize: `${fontSize.message}px`,
      wordWrap: { width: messageText.wrap },
    };
    this.message = this.add.text(messageText.x, messageText.y, "", style).setOrigin(0.5);
    this.createLesson();
  }

  /** The closing line: its own panel and text, shown on the open result until the button. */
  private createLesson(): void {
    const { x, y, width, height } = lessonBox;
    this.lessonPanel = this.add.graphics({ x, y });
    drawPanel(this.lessonPanel, width, height, palette.lit);
    this.lessonPanel
      .lineStyle(3, palette.gold, 1)
      .strokeRoundedRect(-width / 2, -height / 2, width, height, 14);
    const style = {
      ...textStyle,
      fontSize: `${fontSize.lesson}px`,
      wordWrap: { width: lessonWrap },
    };
    this.lesson = this.add.text(x, y, "", style).setOrigin(0.5);
    this.lessonPanel.setVisible(false);
    this.lesson.setVisible(false);
  }

  private createWisp(): void {
    this.ring = this.add.graphics();
    this.ring.lineStyle(5, palette.gold, 1).strokeCircle(0, 0, 48);
    this.tweens.add({ targets: this.ring, scale: 1.1, duration: 700, yoyo: true, repeat: -1 });
    this.wispBox = this.add.container(wisp.x, wisp.y, [this.ring, createWispArt(this)]);
    this.wispBox.setSize(wispRect.width, wispRect.height).setInteractive();
    this.wispBox.on("pointerdown", () => this.game_.dispatch({ type: "GiveTool" }));
  }

  private createButton(): void {
    const { x, y, width, height } = buttonRect;
    const panel = this.add.graphics();
    drawButton(panel, width, height);
    this.buttonLabel = this.add.text(0, 0, "", { ...inkStyle, fontSize: "24px" }).setOrigin(0.5);
    this.button = this.add.container(x, y, [panel, this.buttonLabel]).setSize(width, height);
    this.button.setInteractive().on("pointerdown", () => this.tapButton());
    this.button.setVisible(false);
  }

  private tapButton(): void {
    if (this.view.button) this.game_.dispatch(this.view.button.event);
  }

  private addCard(id: ToolId): void {
    const tap = () => this.game_.dispatch({ type: "PickTool", tool: id });
    this.cards.set(id, createToolCard(this, id, tap));
  }

  private render(state: GameState): void {
    this.hero.setPosition(state.hero.x, state.hero.y);
    if (state.shed === this.shown.shed && state.lang === this.shown.lang) return;
    const before = this.view;
    this.shown = { shed: state.shed, lang: state.lang };
    this.view = shedView(state);
    this.guide.setText(this.view.guide);
    this.message
      .setText(this.view.message)
      .setPosition(this.view.messageAt.x, this.view.messageAt.y);
    this.renderLesson();
    this.renderPicture(before);
    this.renderControls();
  }

  private renderLesson(): void {
    const { lesson } = this.view;
    this.lessonPanel.setVisible(lesson !== null);
    this.lesson.setVisible(lesson !== null).setText(lesson ?? "");
  }

  /** The shed and the tried tool follow the view; a new result also plays a short flourish. */
  private renderPicture(before: ShedView | undefined): void {
    const { picture } = this.view;
    this.shedArt.clear();
    drawShed(this.shedArt, picture);
    this.triedArt.clear().setAngle(0);
    if (picture.tool) drawTool(this.triedArt, picture.tool, shedParts.tool.size);
    this.star.clear();
    if (picture.star) drawShedStar(this.star);
    if (justTried(before, this.view)) this.tryTool(picture.star);
  }

  /** The tool turns once at the lock; on the open result the star pops and sparks fly. */
  private tryTool(open: boolean): void {
    this.tweens.add({ targets: this.triedArt, angle: 14, duration: 220, yoyo: true, repeat: 1 });
    if (!open) return;
    const at = shedPoint(shedParts.star);
    this.star.setScale(0.2);
    this.tweens.add({ targets: this.star, scale: 1, duration: 420, ease: "Back.easeOut" });
    burst(this, at.x, at.y);
    ripple(this, at.x, at.y);
  }

  private renderControls(): void {
    const { armed, button, tools: states, wispAlpha } = this.view;
    this.ring.setVisible(armed);
    this.wispBox.setAlpha(wispAlpha);
    this.button.setVisible(button !== null);
    this.buttonLabel.setText(button?.text ?? "");
    for (const tool of states) {
      const widget = this.cards.get(tool.id)!;
      widget.label.setText(tool.label);
      widget.mark.setVisible(tool.picked);
      widget.box.setAlpha(tool.alpha);
    }
  }
}
