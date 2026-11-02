// Scaffold stub: replaced by .kiro/specs/01-core-loop

import { describe, expect, it } from "vite-plus/test";
import { initialState } from "../../domain/state";
import { createGame, exposeGame, pickLang, readJudgeParams } from "../judge";

describe("readJudgeParams", () => {
  it("reads judge, trial and lang", () => {
    expect(readJudgeParams("?judge=1&trial=3&lang=ja")).toEqual({
      judge: true,
      trial: 3,
      lang: "ja",
    });
  });

  it("ignores missing and invalid values", () => {
    expect(readJudgeParams("")).toEqual({ judge: false, trial: null, lang: null });
    expect(readJudgeParams("?judge=yes&trial=7&lang=fr")).toEqual({
      judge: false,
      trial: null,
      lang: null,
    });
    expect(readJudgeParams("?trial=1.5").trial).toBeNull();
  });
});

describe("pickLang", () => {
  const none = { judge: false, trial: null, lang: null };
  it("prefers the URL, then the browser, then English", () => {
    expect(pickLang({ ...none, lang: "en" }, "ja-JP")).toBe("en");
    expect(pickLang(none, "ja-JP")).toBe("ja");
    expect(pickLang(none, "de")).toBe("en");
    expect(pickLang(none, undefined)).toBe("en");
  });
});

describe("createGame", () => {
  it("applies events and notifies subscribers until they unsubscribe", () => {
    const game = createGame(initialState);
    const seen: string[] = [];
    const unsubscribe = game.subscribe((s) => seen.push(s.phase));
    game.dispatch({ type: "Start" });
    unsubscribe();
    game.dispatch({ type: "SetLang", lang: "ja" });
    expect(seen).toEqual(["trial"]);
    expect(game.state().lang).toBe("ja");
  });

  it("exposes state and dispatch on the target", () => {
    const game = createGame(initialState);
    const target: Parameters<typeof exposeGame>[0] = {};
    exposeGame(target, game);
    target.__game?.dispatch({ type: "Start" });
    expect(target.__game?.state().phase).toBe("trial");
  });
});
