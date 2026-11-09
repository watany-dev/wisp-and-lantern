// Trial 1, The Dark Lane. Draws `laneView(state)` and turns taps into events; it keeps no rules.
// Spec: .kiro/specs/02-trial-tell/design.md

import Phaser from "phaser";
import { balance } from "../../domain/balance";
import { tickMs } from "../clock";
import { colors, things, type CardId } from "../../domain/lane";
import type { GameState, Lang } from "../../domain/state";
import type { Game } from "../judge";
import {
  buttonRect,
  fontSize,
  lessonBox,
  lessonWrap,
  messageText,
  hudBar,
  hudScore,
  hudTime,
  slotCenter,
  slotSize,
  wisp,
  wishPicture,
  wishPictureSize,
  wishText,
  wispRect,
} from "../lane-layout";
import { hudView, itemArt, laneView, type LaneView } from "../lane-view";
import { stepToward } from "../steer";
import { drawBar, drawItem, drawPanel, drawStar, palette } from "../ui/art";
import { createCard, type CardWidget } from "../ui/cards";
import { goldStyle, inkStyle, textStyle } from "../ui/text";

type Graphics = Phaser.GameObjects.Graphics;
type Text = Phaser.GameObjects.Text;

export class LaneScene extends Phaser.Scene {
  private view!: LaneView;
  private shown: { lane?: GameState["lane"]; lang?: Lang } = {};
  private walks = true;
  private hero!: Phaser.GameObjects.Image;
  private wispBox!: Phaser.GameObjects.Container;
  private ring!: Graphics;
  private wishArt!: Graphics;
  private wishLabel!: Text;
  private message!: Text;
  private lessonPanel!: Graphics;
  private lesson!: Text;
  private slotLight!: Graphics;
  private star!: Graphics;
  private button!: Phaser.GameObjects.Container;
  private buttonLabel!: Text;
  private cards = new Map<CardId, CardWidget>();
  private clock!: Text;
  private score!: Text;
  private bar!: Graphics;
  private lastScore = 0;

  constructor(private readonly game_: Game) {
    super("lane");
  }

  create(): void {
    // The scene object is reused for every run: forget what the last run drew.
    this.shown = {};
    this.cards = new Map();
    this.walks = true;
    this.lastScore = 0;
    this.hero = this.add.image(0, 0, "hero");
    this.createHud();
    this.createSlots();
    this.createWish();
    this.createWisp();
    this.createMessage();
    this.createLesson();
    this.createButton();
    for (const id of [...colors, ...things]) this.addCard(id);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (_p: unknown, over: unknown[]) => {
      this.walks = over.length === 0;
    });
    const unsubscribe = this.game_.subscribe((s) => this.render(s));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
    this.render(this.game_.state());
  }

  update(_time: number, deltaMs: number): void {
    this.game_.dispatch({ type: "Tick", ms: tickMs(deltaMs) });
    this.moveWisp(deltaMs);
    this.walkHero(deltaMs);
  }

  private moveWisp(deltaMs: number): void {
    const next = stepToward(this.wispBox, this.view.wispTarget, balance.wispSpeed, deltaMs);
    if (next) this.wispBox.setPosition(next.x, next.y);
  }

  private walkHero(deltaMs: number): void {
    const pointer = this.input.activePointer;
    if (!this.walks || !pointer.isDown) return;
    const target = { x: pointer.worldX, y: pointer.worldY };
    const next = stepToward(this.game_.state().hero, target, balance.heroSpeed, deltaMs);
    if (next) this.game_.dispatch({ type: "MoveHeroTo", ...next });
  }

  private createHud(): void {
    const style = { ...textStyle, fontSize: "26px" };
    this.clock = this.add.text(hudTime.x, hudTime.y, "", style).setOrigin(0.5);
    this.score = this.add
      .text(hudScore.x + hudScore.width / 2, hudScore.y, "", { ...goldStyle, fontSize: "22px" })
      .setOrigin(1, 0.5);
    this.bar = this.add.graphics({
      x: hudBar.x - hudBar.width / 2,
      y: hudBar.y - hudBar.height / 2,
    });
  }

  private createSlots(): void {
    for (const color of colors) {
      for (const thing of things) {
        const { x, y } = slotCenter(color, thing);
        drawPanel(this.add.graphics({ x, y }), slotSize, slotSize, palette.dark);
      }
    }
    // Above the wisp, which flies to the slot: the asked item stays in view.
    this.slotLight = this.add.graphics().setDepth(5);
    this.star = this.add.graphics().setDepth(6);
  }

  private createWish(): void {
    this.wishLabel = this.add.text(wishText.x, wishText.y, "", { ...textStyle, fontSize: "22px" });
    this.wishLabel.setOrigin(0.5).setWordWrapWidth(wishText.width);
    this.wishArt = this.add.graphics({ x: wishPicture.x, y: wishPicture.y });
  }

  private createWisp(): void {
    this.ring = this.add.graphics();
    this.ring.lineStyle(5, palette.gold, 1).strokeCircle(0, 0, 44);
    const image = this.add.image(0, 0, "wisp");
    this.wispBox = this.add.container(wisp.x, wisp.y, [this.ring, image]);
    this.wispBox.setSize(wispRect.width, wispRect.height).setInteractive();
    this.wispBox.on("pointerdown", () => this.game_.dispatch({ type: "Ask" }));
  }

  private createMessage(): void {
    const style = {
      ...textStyle,
      fontSize: `${fontSize.message}px`,
      wordWrap: { width: messageText.wrap },
    };
    this.message = this.add.text(messageText.x, messageText.y, "", style).setOrigin(0.5);
  }

  /** The closing line: its own panel and text, shown on the right result until the button. */
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

  private createButton(): void {
    const { x, y, width, height } = buttonRect;
    const panel = this.add.graphics();
    drawPanel(panel, width, height, palette.gold);
    this.buttonLabel = this.add.text(0, 0, "", { ...inkStyle, fontSize: "24px" }).setOrigin(0.5);
    this.button = this.add.container(x, y, [panel, this.buttonLabel]).setSize(width, height);
    this.button.setInteractive().on("pointerdown", () => this.tapButton());
    this.button.setVisible(false);
  }

  private tapButton(): void {
    if (this.view.button) this.game_.dispatch(this.view.button.event);
  }

  private addCard(id: CardId): void {
    const tap = () => this.game_.dispatch({ type: "PickCard", card: id });
    this.cards.set(id, createCard(this, id, tap));
  }

  private render(state: GameState): void {
    this.hero.setPosition(state.hero.x, state.hero.y);
    this.renderRun(state);
    if (state.phase === "over") {
      this.scene.start("over");
      return;
    }
    if (state.lane === this.shown.lane && state.lang === this.shown.lang) return;
    this.shown = { lane: state.lane, lang: state.lang };
    this.view = laneView(state);
    this.message
      .setText(this.view.message)
      .setPosition(this.view.messageAt.x, this.view.messageAt.y);
    this.renderLesson();
    this.wishLabel.setText(this.view.wishText);
    this.renderWish();
    this.renderResult();
    this.renderControls();
  }

  /** The clock, the bar and the score change every frame; a find also pops its points. */
  private renderRun(state: GameState): void {
    const hud = hudView(state);
    this.clock.setText(String(hud.seconds));
    this.score.setText(hud.score);
    this.bar.clear();
    drawBar(this.bar, hudBar.width, hudBar.height, hud.fraction);
    const gained = state.run.score - this.lastScore;
    this.lastScore = state.run.score;
    if (gained > 0) this.popPoints(state, gained);
  }

  /** "+150" rises from the slot the wisp brought the wish to, then fades. */
  private popPoints(state: GameState, points: number): void {
    const { color, thing } = laneView(state).lit!;
    const at = slotCenter(color, thing);
    const text = this.add
      .text(at.x, at.y, `+${points}`, { ...goldStyle, fontSize: "34px" })
      .setOrigin(0.5)
      .setDepth(10);
    this.tweens.add({
      targets: text,
      y: at.y - 70,
      alpha: 0,
      duration: 1100,
      onComplete: () => text.destroy(),
    });
  }

  private renderLesson(): void {
    const { lesson } = this.view;
    this.lessonPanel.setVisible(lesson !== null);
    this.lesson.setVisible(lesson !== null).setText(lesson ?? "");
  }

  private renderWish(): void {
    this.wishArt.clear();
    drawItem(this.wishArt, itemArt(this.view.wish), wishPictureSize);
  }

  private renderResult(): void {
    this.slotLight.clear();
    this.star.clear();
    const { lit } = this.view;
    if (!lit) return;
    const { x, y } = slotCenter(lit.color, lit.thing);
    this.slotLight.setPosition(x, y);
    drawPanel(this.slotLight, slotSize, slotSize, palette.lit);
    drawItem(this.slotLight, itemArt(lit), slotSize - 20);
    this.star.setPosition(x + 32, y - 32);
    if (this.view.star) drawStar(this.star, 18);
  }

  private renderControls(): void {
    const { armed, button, cards, wispAlpha } = this.view;
    this.ring.setVisible(armed);
    this.wispBox.setAlpha(wispAlpha);
    this.button.setVisible(button !== null);
    this.buttonLabel.setText(button?.text ?? "");
    for (const card of cards) {
      const widget = this.cards.get(card.id)!;
      widget.label.setText(card.label);
      widget.mark.setVisible(card.picked);
      widget.box.setAlpha(card.alpha);
    }
  }
}
