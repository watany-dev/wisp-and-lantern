// Trial 5, The Flickering Lantern: a 60-second time attack. Draws `lanternView(state)` and turns taps into events;
// it keeps no rules. Like the other trials, it dispatches `Tick` from `update`, which is how time reaches the
// reducer. Spec: .kiro/specs/08-trial-tell-whats-wrong/design.md

import Phaser from "phaser";
import { balance } from "../../domain/balance";
import type { PartId } from "../../domain/lantern";
import type { GameState, Lang } from "../../domain/state";
import { tickMs } from "../clock";
import { fieldWisp } from "../field-layout";
import type { Game } from "../judge";
import { fontSize } from "../lane-layout";
import { hudView } from "../lane-view";
import { lanternMessage, lanternPanel, partRect } from "../lantern-layout";
import { justFixed, lanternView, type LanternView } from "../lantern-view";
import { sceneFor } from "../route";
import { guideText, leaveButton } from "../shed-layout";
import { stepToward } from "../steer";
import { burst, ripple } from "../fx/sparks";
import { drawBackground } from "../ui/background";
import { fitCamera } from "../ui/camera";
import { createButtons, paintButtons, type ButtonsWidget } from "../ui/field-buttons";
import { createHud, paintHud, type HudWidget } from "../ui/hud";
import { createLanternStage, paintLanternStage, type LanternStage } from "../ui/lantern-stage";
import { createLeaveButton, type LeaveWidget } from "../ui/leave-button";
import { goldStyle, textStyle } from "../ui/text";
import { createHero, createWispArt } from "../ui/wisp-actor";

type Text = Phaser.GameObjects.Text;

/** The flickering part fades to this and back: 0.8 s a cycle, slower than 3 times a second (REQ-8.3.2). */
const flicker = { alpha: 0.35, halfCycleMs: 400 } as const;

export class LanternScene extends Phaser.Scene {
  private view: LanternView | undefined;
  private shown: { lantern?: GameState["lantern"]; lang?: Lang } = {};
  private walks = true;
  private hero!: Phaser.GameObjects.Container;
  private guide!: Text;
  private message!: Text;
  private stage!: LanternStage;
  private buttons!: ButtonsWidget;
  private hud!: HudWidget;
  private leave!: LeaveWidget;
  private lastScore = 0;

  constructor(private readonly game_: Game) {
    super("lantern");
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
    this.stage = createLanternStage(this, (part) => this.point(part));
    this.add.container(fieldWisp.x, fieldWisp.y, [createWispArt(this)]);
    this.buttons = createButtons(this, (event) => this.game_.dispatch(event));
    this.leave = createLeaveButton(this, leaveButton, 16, () =>
      this.game_.dispatch({ type: "LeaveLantern" }),
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

  private point(part: PartId): void {
    this.game_.dispatch({ type: "TapPart", part });
  }

  private createTexts(): void {
    const size = `${fontSize.message}px`;
    const wrap = { wordWrap: { width: guideText.wrap } };
    this.guide = this.add
      .text(guideText.x, guideText.y, "", { ...textStyle, fontSize: size, ...wrap })
      .setOrigin(0.5);
    this.message = this.add
      .text(lanternMessage.x, lanternMessage.y, "", { ...textStyle, fontSize: size, ...wrap })
      .setOrigin(0.5);
  }

  private render(state: GameState): void {
    // The clock ran out (the end screen), or the child went back to the title: that scene takes over.
    if (sceneFor(state) !== "lantern") {
      this.scene.start(sceneFor(state), { fromTrial: true });
      return;
    }
    this.hero.setPosition(state.hero.x, state.hero.y);
    this.renderRun(state);
    if (state.lantern === this.shown.lantern && state.lang === this.shown.lang) return;
    const before = this.view;
    this.shown = { lantern: state.lantern, lang: state.lang };
    const view = lanternView(state);
    this.view = view;
    this.show(view);
    if (justFixed(before, view)) this.flourish(view);
  }

  /** The clock, the bar and the score change every frame; a right card also pops its points. */
  private renderRun(state: GameState): void {
    paintHud(this.hud, hudView(state));
    const gained = state.run.score - this.lastScore;
    this.lastScore = state.run.score;
    if (gained > 0) this.popPoints(gained);
  }

  /** "+150" rises from the lantern, then fades. */
  private popPoints(points: number): void {
    const { x, y } = lanternPanel;
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

  private show(view: LanternView): void {
    this.leave.label.setText(view.leave);
    this.guide.setText(view.guide);
    this.message.setText(view.message);
    paintLanternStage(this.stage, view);
    paintButtons(this.buttons, view.buttons, this.game.getTime());
    this.flickerParts(view);
  }

  /** Only the part with the frame of dots fades in and out; every other part holds still. */
  private flickerParts(view: LanternView): void {
    for (const { part, mark } of view.parts) {
      const picture = this.stage.parts[part];
      this.tweens.killTweensOf(picture);
      picture.setAlpha(1);
      if (mark !== "dots") continue;
      this.tweens.add({
        targets: picture,
        alpha: flicker.alpha,
        duration: flicker.halfCycleMs,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  /**
   * A card plays a short flourish. A lit lantern: a ripple and sparks from the light. A wrong card: the changed
   * part pops once. No red, no shake, no sound.
   */
  private flourish(view: LanternView): void {
    if (view.result === "lit") {
      const light = partRect("light");
      burst(this, light.x, light.y);
      ripple(this, light.x, light.y);
      return;
    }
    const changed = view.parts.find((p) => p.mark === "dots");
    if (!changed) return;
    const picture = this.stage.parts[changed.part];
    this.tweens.add({ targets: picture, scale: 1.12, duration: 160, yoyo: true });
  }
}
