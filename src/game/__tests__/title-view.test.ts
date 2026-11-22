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
      shed: ja.shed.enter,
      shedCaption: ja.shed.timeAttack,
      field: ja.field.enter,
      fieldCaption: ja.field.timeAttack,
      shadows: ja.shadows.enter,
      shadowsCaption: ja.shadows.timeAttack,
      lantern: ja.lantern.enter,
      lanternCaption: ja.lantern.timeAttack,
    });
    expect(titleView("en")).toEqual({
      title: en.title,
      prompt: en.start,
      intro: en.run.intro,
      shed: en.shed.enter,
      shedCaption: en.shed.timeAttack,
      field: en.field.enter,
      fieldCaption: en.field.timeAttack,
      shadows: en.shadows.enter,
      shadowsCaption: en.shadows.timeAttack,
      lantern: en.lantern.enter,
      lanternCaption: en.lantern.timeAttack,
    });
  });

  it("puts the 60 seconds in trial 1's rule and in the four buttons' captions, and in no button's label", () => {
    for (const lang of ["ja", "en"] as const) {
      const view = titleView(lang);
      for (const text of [
        view.intro,
        view.shedCaption,
        view.fieldCaption,
        view.shadowsCaption,
        view.lanternCaption,
      ]) {
        expect(text).toMatch(/60/);
      }
      for (const text of [view.shed, view.field, view.shadows, view.lantern]) {
        expect(text).not.toMatch(/\d/);
      }
    }
  });

  it("says in each button's caption that its trial has the 60 seconds too, and not that it has no timer (REQ-5.1.1, REQ-6.1.6)", () => {
    expect(titleView("en").fieldCaption).toMatch(/60 seconds/);
    expect(titleView("en").shedCaption).toMatch(/60 seconds/);
    expect(titleView("en").shadowsCaption).toMatch(/60 seconds/);
    expect(titleView("en").lanternCaption).toMatch(/60 seconds/);
    for (const lang of ["ja", "en"] as const) {
      expect(titleView(lang).fieldCaption).not.toMatch(/timer|\u306a\u3044\u3088/i);
      expect(titleView(lang).shadowsCaption).not.toMatch(/timer|\u306a\u3044\u3088/i);
      expect(titleView(lang).lanternCaption).not.toMatch(/timer|\u306a\u3044\u3088/i);
    }
  });
});
