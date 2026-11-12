import { describe, expect, it } from "vite-plus/test";
import type { GameEvent } from "../../domain/events";
import { reduce } from "../../domain/reducer";
import { initialState, type Lang } from "../../domain/state";
import en from "../../content/strings.en.json";
import ja from "../../content/strings.ja.json";
import { overView } from "../over-view";

const strings = { ja, en };
const pick = (...cards: Extract<GameEvent, { type: "PickCard" }>["card"][]): GameEvent[] =>
  cards.map((card) => ({ type: "PickCard", card }));
// The first wish is the yellow lantern, the second the red pumpkin.
const find0: GameEvent[] = [...pick("yellow", "lantern"), { type: "Ask" }, { type: "Retry" }];
const find1: GameEvent[] = [...pick("red", "pumpkin"), { type: "Ask" }];
const end: GameEvent = { type: "Tick", ms: 60_000 };
const over = (lang: Lang, ...events: GameEvent[]) =>
  overView(
    [{ type: "Start" } as GameEvent, ...events, end].reduce(reduce, { ...initialState, lang }),
  );

describe.each(["ja", "en"] as const)("overView in %s (REQ-4.5)", (lang) => {
  const s = strings[lang].run;

  it("says the time is up and shows the score and the best, which are equal on a first run", () => {
    const view = over(lang, ...find0, ...find1);
    expect(view.title).toBe(s.over);
    expect(view.score).toBe(s.score.replace("{0}", "250"));
    expect(view.best).toBe(s.best.replace("{0}", "250"));
  });

  it("calls a run that beat the best a new best, and any other run not", () => {
    expect(over(lang, ...find0).record).toBe(s.newBest);
    expect(over(lang).record).toBeNull();
  });

  it("offers one button that starts a new run", () => {
    expect(over(lang).buttons).toEqual([{ text: s.again, action: "play" }]);
  });

  it("leaves no placeholder in any line", () => {
    const view = over(lang, ...find0);
    for (const text of [view.score, view.best]) expect(text).not.toContain("{0}");
  });
});

// The end screen of the shed's run (spec 05-trial-grant-tools, REQ-5.7.5, REQ-5.16): the same lines, and two
// buttons, play again and back to the title.
const shedOver = (lang: Lang, ...events: GameEvent[]) =>
  overView(
    [{ type: "StartShed" } as GameEvent, ...events, end].reduce(reduce, { ...initialState, lang }),
  );

describe.each(["ja", "en"] as const)("overView after a run of the shed in %s", (lang) => {
  const s = strings[lang].run;

  it("says the time is up and shows the score and the best", () => {
    const view = shedOver(lang, { type: "PickTool", tool: "key" }, { type: "GiveTool" });
    expect(view.title).toBe(s.over);
    expect(view.score).toBe(s.score.replace("{0}", "100"));
    expect(view.best).toBe(s.best.replace("{0}", "100"));
    expect(view.record).toBe(s.newBest);
  });

  it("offers play again for the shed, and the way back to the title", () => {
    expect(shedOver(lang).buttons).toEqual([
      { text: s.again, action: "playShed" },
      { text: strings[lang].shed.leave, action: "leave" },
    ]);
  });

  it("does not call a run that scored nothing a record", () => {
    expect(shedOver(lang).record).toBeNull();
  });
});
