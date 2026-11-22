// Trial 4, The Listening Shadows: a 60-second time attack. Draws `shadowsView(state)` and turns taps into
// events; it keeps no rules. Like the lane, the shed and the field, it dispatches `Tick` from `update`, which
// is how time reaches the reducer. Spec: .kiro/specs/07-trial-keep-secrets/design.md

import Phaser from "phaser";
import { balance } from "../../domain/balance";
import type { GameState, Lang } from "../../domain/state";
import { tickMs } from "../clock";
import { fieldWisp } from "../field-layout";
import type { Game } from "../judge";
import { fontSize } from "../lane-layout";
import { hudView } from "../lane-view";
import { sceneFor } from "../route";
import { guideText, leaveButton } from "../shed-layout";
import { itemTile, shadowsMessage, whyBox, whyWrap } from "../shadows-layout";
import { justDecided, shadowsView, type ShadowsView } from "../shadows-view";
import { stepToward } from "../steer";
import { burst, ripple } from "../fx/sparks";
import { drawPanel, palette } from "../ui/art";
import { drawBackground } from "../ui/background";
import { fitCamera } from "../ui/camera";
import { createButtons, paintButtons, type ButtonsWidget } from "../ui/field-buttons";
import { createHud, paintHud, type HudWidget } from "../ui/hud";
import { createTile, paintTile, type TileWidget } from "../ui/item-tile";
import { createLeaveButton, type LeaveWidget } from "../ui/leave-button";
import { createStage, paintStage, type StageWidget } from "../ui/shadow-stage";
import { goldStyle, textStyle } from "../ui/text";
import { createHero, createWispArt } from "../ui/wisp-actor";

type Text = Phaser.GameObjects.Text;

export class ShadowsScene extends Phaser.Scene {
  private view: ShadowsView | undefined;
  private shown: { shadows?: GameState["shadows"]; lang?: Lang } = {};
  private walks = true;
  private hero!: Phaser.GameObjects.Container;
  private wispBox!: Phaser.GameObjects.Container;
  private guide!: Text;
  private message!: Text;
  private whyPanel!: Phaser.GameObjects.Graphics;
  private why!: Text;
  private tile!: TileWidget;
  private stage!: StageWidget;
  private buttons!: ButtonsWidget;
  private hud!: HudWidget;
  private leave!: LeaveWidget;
  private lastScore = 0;

  constructor(private readonly game_: Game) {
    super("shadows");
  }

  create(): void {
    // The scene object is reused: forget what the last visit drew.
    this.shown = {};
    this.view = undefined;
    this.walks = true;
    this.lastScore = 0;
    fitCamera(this);
    drawBackground(this, false);
    this.hero = createHero(this);
    this.hud = createHud(this);
    this.createTexts();
    this.tile = createTile(this);
    this.stage = createStage(this);
    this.wispBox = this.add.container(fieldWisp.x, fieldWisp.y, [createWispArt(this)]);
    this.buttons = createButtons(this, (event) => this.game_.dispatch(event));
    this.leave = createLeaveButton(this, leaveButton, 16, () =>
      this.game_.dispatch({ type: "LeaveShadows" }),
    );
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (_p: unknown, over: unknown[]) => {
      this.walks = over.length === 0;
    });
    const unsubscribe = this.game_.subscribe((s) => this.render(s));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
    this.render(this.game_.state());
  }

  override update(_time: number, deltaMs: number): void {
    this.game_.dispatch({ type: "Tick", ms: tickMs(deltaMs) });
    const pointer = this.input.activePointer;
    if (!this.walks || !pointer.isDown) return;
    const target = { x: pointer.worldX, y: pointer.worldY };
    const next = stepToward(this.game_.state().hero, target, balance.heroSpeed, deltaMs);
    if (next) this.game_.dispatch({ type: "MoveHeroTo", ...next });
  }

  private createTexts(): void {
    const size = `${fontSize.message}px`;
    const wrap = { wordWrap: { width: guideText.wrap } };
    this.guide = this.add
      .text(guideText.x, guideText.y, "", { ...textStyle, fontSize: size, ...wrap })
      .setOrigin(0.5);
    this.message = this.add
      .text(shadowsMessage.x, shadowsMessage.y, "", { ...textStyle, fontSize: size, ...wrap })
      .setOrigin(0.5);
    this.createWhy();
  }

  /** The closing line: its own panel with a gold edge and its own text, shown after a decision. */
  private createWhy(): void {
    const { x, y, width, height } = whyBox;
    this.whyPanel = this.add.graphics({ x, y });
    drawPanel(this.whyPanel, width, height, palette.lit);
    this.whyPanel
      .lineStyle(3, palette.gold, 1)
      .strokeRoundedRect(-width / 2, -height / 2, width, height, 14);
    const style = { ...textStyle, fontSize: `${fontSize.lesson}px`, wordWrap: { width: whyWrap } };
    this.why = this.add.text(x, y, "", style).setOrigin(0.5);
    this.whyPanel.setVisible(false);
  }

  private render(state: GameState): void {
    // The clock ran out (the end screen), or the child went back to the title: that scene takes over.
    if (sceneFor(state) !== "shadows") {
      this.scene.start(sceneFor(state), { fromTrial: true });
      return;
    }
    this.hero.setPosition(state.hero.x, state.hero.y);
    this.renderRun(state);
    if (state.shadows === this.shown.shadows && state.lang === this.shown.lang) return;
    const before = this.view;
    this.shown = { shadows: state.shadows, lang: state.lang };
    const view = shadowsView(state);
    this.view = view;
    this.show(view);
    if (justDecided(before, view)) this.flourish(view);
  }

  /** The clock, the bar and the score change every frame; a right decision also pops its points. */
  private renderRun(state: GameState): void {
    paintHud(this.hud, hudView(state));
    const gained = state.run.score - this.lastScore;
    this.lastScore = state.run.score;
    if (gained > 0) this.popPoints(gained);
  }

  /** "+150" rises from the tile, then fades. */
  private popPoints(points: number): void {
    const { x, y } = itemTile;
    const text = this.add
      .text(x, y, `+${points}`, { ...goldStyle, fontSize: "34px" })
      .setOrigin(0.5)
      .setDepth(10);
    this.tweens.add({
      targets: text,
      y: y - 70,
      alpha: 0,
      duration: 1100,
      onComplete: () => text.destroy(),
    });
  }

  private show(view: ShadowsView): void {
    this.leave.label.setText(view.leave);
    this.guide.setText(view.guide);
    this.message.setText(view.message);
    this.whyPanel.setVisible(view.why !== null);
    this.why.setText(view.why ?? "");
    paintTile(this.tile, view.item);
    paintStage(this.stage, view);
    paintButtons(this.buttons, view.buttons, this.game.getTime());
  }

  /**
   * A decision plays a short flourish. A right one: a ripple and sparks from the tile. Either way the
   * shadow leans in once, as it listens. No red, no shake of the screen, no sound.
   */
  private flourish(view: ShadowsView): void {
    this.tweens.add({ targets: this.stage.shadow, scale: 1.06, duration: 180, yoyo: true });
    if (view.result !== "right") return;
    burst(this, itemTile.x, itemTile.y);
    ripple(this, itemTile.x, itemTile.y);
  }
}
