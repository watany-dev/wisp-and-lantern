// Scaffold stub: replaced by .kiro/specs/01-core-loop

import { describe, expect, it } from "vite-plus/test";
import { reduce } from "../reducer";
import { initialState } from "../state";

describe("reduce", () => {
  it("Start moves the game from the title to the trial", () => {
    const next = reduce(initialState, { type: "Start" });
    expect(next.phase).toBe("trial");
    expect(next.lang).toBe(initialState.lang);
  });

  it("Start can set the language", () => {
    expect(reduce(initialState, { type: "Start", lang: "ja" }).lang).toBe("ja");
  });

  it("SetLang changes the language only", () => {
    const next = reduce(initialState, { type: "SetLang", lang: "ja" });
    expect(next).toEqual({ ...initialState, lang: "ja" });
  });

  it("MoveHeroTo moves the hero and does not mutate the previous state", () => {
    const next = reduce(initialState, { type: "MoveHeroTo", x: 10, y: 20 });
    expect(next.hero).toEqual({ x: 10, y: 20 });
    expect(initialState.hero).toEqual({ x: 195, y: 600 });
  });
});
