import { describe, expect, it } from "vite-plus/test";
import en from "../../content/strings.en.json";
import ja from "../../content/strings.ja.json";
import { titleView } from "../title-view";

describe("titleView (REQ-6.1.6)", () => {
  it("gives the title's words in each language", () => {
    expect(titleView("ja")).toEqual({
      title: ja.title,
      prompt: ja.start,
      intro: ja.run.intro,
      noClock: ja.noClock,
      shed: ja.shed.enter,
      shedCaption: ja.shed.timeAttack,
      field: ja.field.enter,
    });
    expect(titleView("en")).toEqual({
      title: en.title,
      prompt: en.start,
      intro: en.run.intro,
      noClock: en.noClock,
      shed: en.shed.enter,
      shedCaption: en.shed.timeAttack,
      field: en.field.enter,
    });
  });

  it("keeps the 60 seconds out of every text that belongs to a trial without a clock", () => {
    for (const lang of ["ja", "en"] as const) {
      const view = titleView(lang);
      for (const text of [view.field, view.noClock]) expect(text).not.toMatch(/60/);
      expect(view.intro).toMatch(/60/);
    }
  });

  it("says in the shed button's caption that the shed has the 60 seconds too, and not that it has no timer (REQ-5.1.1)", () => {
    for (const lang of ["ja", "en"] as const) {
      const view = titleView(lang);
      expect(view.shedCaption).toMatch(/60/);
      expect(view.shedCaption).not.toBe(view.noClock);
      expect(view.shed).not.toMatch(/60/);
    }
  });
});
