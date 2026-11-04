// Scaffold stub: replaced by .kiro/specs/01-core-loop

import Phaser from "phaser";
import en from "../../content/strings.en.json";
import ja from "../../content/strings.ja.json";
import { balance } from "../../domain/balance";
import type { GameState } from "../../domain/state";
import type { Game } from "../judge";
import { stepToward } from "../steer";

const strings = { ja, en };
const textStyle = { fontFamily: "ZenMaru", color: "#f4efe1", align: "center" } as const;

export class TitleScene extends Phaser.Scene {
  private title!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private hero!: Phaser.GameObjects.Image;

  constructor(private readonly game_: Game) {
    super("title");
  }

  preload(): void {
    // Relative URLs resolve under any base path (production root or PR preview).
    this.load.image("hero", "assets/placeholder/hero.png");
    this.load.image("wisp", "assets/placeholder/wisp.png");
  }

  create(): void {
    const { width } = this.scale;
    this.title = this.add
      .text(width / 2, 240, "", { ...textStyle, fontSize: "40px" })
      .setOrigin(0.5);
    this.prompt = this.add
      .text(width / 2, 340, "", { ...textStyle, fontSize: "24px" })
      .setOrigin(0.5);
    this.add.image(width / 2 + 60, 520, "wisp");
    const { x, y } = this.game_.state().hero;
    this.hero = this.add.image(x, y, "hero");

    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (this.game_.state().phase === "title") this.game_.dispatch({ type: "Start" });
    });
    this.game.canvas.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

    const unsubscribe = this.game_.subscribe((s) => this.render(s));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
    this.render(this.game_.state());
  }

  update(_time: number, deltaMs: number): void {
    const pointer = this.input.activePointer;
    if (this.game_.state().phase !== "trial" || !pointer.isDown) return;
    const target = { x: pointer.worldX, y: pointer.worldY };
    const next = stepToward(this.game_.state().hero, target, balance.heroSpeed, deltaMs);
    if (next) this.game_.dispatch({ type: "MoveHeroTo", ...next });
  }

  private render(state: GameState): void {
    const s = strings[state.lang];
    this.title.setText(state.phase === "title" ? s.title : "trial");
    this.prompt.setText(state.phase === "title" ? s.start : "");
    this.hero.setPosition(state.hero.x, state.hero.y);
  }
}
