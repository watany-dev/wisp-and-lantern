// Trial 3, The Wisp Field: a 60-second time attack. Draws `fieldView(state)` and turns taps into events; it
// keeps no rules. Like the lane and the shed, it dispatches `Tick` from `update`, which is how time reaches
// the reducer. Spec: .kiro/specs/06-trial-verify-stars/design.md

import Phaser from "phaser";
import { balance } from "../../domain/balance";
import { starCount } from "../../domain/field";
import type { GameState, Lang } from "../../domain/state";
import { tickMs } from "../clock";
import { fieldMessage, fieldWisp, starCenter } from "../field-layout";
import { fieldView, justFinished, justSorted, type FieldView } from "../field-view";
import type { Game } from "../judge";
import { fontSize } from "../lane-layout";
import { hudView } from "../lane-view";
import { sceneFor } from "../route";
import { guideText, leaveButton } from "../shed-layout";
import { stepToward } from "../steer";
import { burst, ripple } from "../fx/sparks";
import { drawBackground } from "../ui/background";
import { fitCamera } from "../ui/camera";
import { createButtons, paintButtons, type ButtonsWidget } from "../ui/field-buttons";
import { createLens, paintLens, type LensWidget } from "../ui/field-lens";
import { createHud, paintHud, type HudWidget } from "../ui/hud";
import { createLeaveButton, type LeaveWidget } from "../ui/leave-button";
import { createStarCard, paintStar, type StarWidget } from "../ui/star-card";
import { goldStyle, textStyle } from "../ui/text";
import { createHero, createWispArt } from "../ui/wisp-actor";

type Text = Phaser.GameObjects.Text;

export class FieldScene extends Phaser.Scene {
  private view: FieldView | undefined;
  private shown: { field?: GameState["field"]; lang?: Lang } = {};
  private walks = true;
  private hero!: Phaser.GameObjects.Container;
  private wispBox!: Phaser.GameObjects.Container;
  private guide!: Text;
  private message!: Text;
  private lens!: LensWidget;
  private buttons!: ButtonsWidget;
  private stars: StarWidget[] = [];
  private hud!: HudWidget;
  private leave!: LeaveWidget;
  private lastScore = 0;

  constructor(private readonly game_: Game) {
    super("field");
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
    this.lens = createLens(this);
    this.wispBox = this.add.container(fieldWisp.x, fieldWisp.y, [createWispArt(this)]);
    this.buttons = createButtons(this, (event) => this.game_.dispatch(event));
    this.stars = Array.from({ length: starCount }, (_, i) => this.addStar(i));
    this.leave = createLeaveButton(this, leaveButton, 16, () =>
      this.game_.dispatch({ type: "LeaveField" }),
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
      .text(fieldMessage.x, fieldMessage.y, "", { ...textStyle, fontSize: size, ...wrap })
      .setOrigin(0.5);
  }

  private addStar(index: number): StarWidget {
    return createStarCard(this, index, () => this.game_.dispatch({ type: "InspectStar", index }));
  }

  private render(state: GameState): void {
    // The clock ran out (the end screen), or the child went back to the title: that scene takes over.
    if (sceneFor(state) !== "field") {
      this.scene.start(sceneFor(state), { fromTrial: true });
      return;
    }
    this.hero.setPosition(state.hero.x, state.hero.y);
    this.renderRun(state);
    if (state.field === this.shown.field && state.lang === this.shown.lang) return;
    const before = this.view;
    this.shown = { field: state.field, lang: state.lang };
    const view = fieldView(state);
    this.view = view;
    this.show(view);
    this.flourish(before, view);
  }

  /** The clock, the bar and the score change every frame; a right verdict also pops its points. */
  private renderRun(state: GameState): void {
    paintHud(this.hud, hudView(state));
    const gained = state.run.score - this.lastScore;
    this.lastScore = state.run.score;
    const note = state.field.stage === "sorting" ? state.field.note : null;
    if (gained > 0 && note) this.popPoints(gained, note.star);
  }

  /** "+150" rises from the star that was sorted, then fades. */
  private popPoints(points: number, star: number): void {
    const at = starCenter(star);
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

  private show(view: FieldView): void {
    this.leave.label.setText(view.leave);
    this.guide.setText(view.guide);
    this.message.setText(view.message);
    paintLens(this.lens, view);
    paintButtons(this.buttons, view.buttons, this.game.getTime());
    view.stars.forEach((star, i) => paintStar(this.stars[i]!, star));
  }

  /** A verdict or the keep plays a short flourish. The state and the picture already say everything. */
  private flourish(before: FieldView | undefined, view: FieldView): void {
    const verdict = justSorted(before, view);
    if (verdict !== null)
      this.sorted(verdict.star, verdict.right, view.stars[verdict.star]!.ticked);
    if (justFinished(before, view)) this.celebrate(view);
  }

  /**
   * A right verdict: a ripple, and sparks for a real star; the wisp tilts once for a fake one, as it mixed
   * it up. A wrong verdict: the star wobbles once. No red, no shake of the screen, no sound.
   */
  private sorted(index: number, right: boolean, real: boolean): void {
    const { x, y } = starCenter(index);
    const art = this.stars[index]!.art;
    this.tweens.add({ targets: art, scale: right ? 1.3 : 1.2, duration: 180, yoyo: true });
    if (!right) return;
    ripple(this, x, y);
    if (real) burst(this, x, y);
    else
      this.tweens.add({ targets: this.wispBox, angle: 12, duration: 160, yoyo: true, repeat: 1 });
  }

  /** Sparks fly from every star that was kept, and the wisp hops once. */
  private celebrate(view: FieldView): void {
    for (const star of view.stars) {
      if (star.ticked) burst(this, starCenter(star.index).x, starCenter(star.index).y);
    }
    this.tweens.add({ targets: this.wispBox, y: fieldWisp.y - 16, duration: 200, yoyo: true });
  }
}
