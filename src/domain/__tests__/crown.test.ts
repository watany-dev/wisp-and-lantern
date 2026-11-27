import { describe, expect, it } from "vite-plus/test";
import {
  cardsFor,
  cardsOf,
  chainOf,
  initialCrown,
  jobAt,
  jobs,
  lampCount,
  lampParts,
  litCount,
  madeAt,
  newCrown,
  partOfLook,
  reduceCrown,
  sameLamp,
  slipAt,
  thingsAt,
  toolFor,
  wishAt,
  wishOf,
  type Crown,
  type Lamp,
  type Thing,
} from "../crown";
import type { CrownEvent } from "../events";
import { looksOf, type LookId } from "../lantern";
import { answerOf } from "../shed";

// Trial 6 (spec 09-trial-hollow-crown): the rules of `crown.ts` on their own, without the reducer.

const play = (crown: Crown, ...events: CrownEvent[]) => events.reduce(reduceCrown, crown);
const say = (look: LookId): CrownEvent => ({ type: "SayLook", look });
const tell: CrownEvent = { type: "Tell" };
const giveIt = (thing: Thing): CrownEvent => ({ type: "GiveItem", thing });
const secretThings: readonly Thing[] = ["houseKey", "address", "password"];
const go: CrownEvent = { type: "Go" };
const same: CrownEvent = { type: "CheckLamp", same: true };
const notSame: CrownEvent = { type: "CheckLamp", same: false };
const point = (part: "roof" | "light"): CrownEvent => ({ type: "PointLamp", part });
const fix = (look: LookId): CrownEvent => ({ type: "FixLamp", look });
const next: CrownEvent = { type: "NextLamp" };

/** Seed 0, chain 0: the wish is a pointy roof and a candle; leaves block the door; the wisp slips in the roof. */
const toldWish = (c: Crown) => play(c, say(wishOf(c).roof), say(wishOf(c).light), tell);
const atGo = (c: Crown) => play(toldWish(c), giveIt(toolFor(c.seed, chainOf(c))));
const atCheck = (c: Crown) => play(atGo(c), go);

/** A whole chain played right: tell the wish, give the tool, go, not the same, fix the slip part, same. */
function playChain(c: Crown): Crown {
  const checking = atCheck(c);
  const part = slipAt(c.seed, chainOf(c));
  return play(checking, notSame, point(part), fix(wishOf(c)[part]), same);
}

describe("the lamps, the jobs and the things", () => {
  it("has a roof and a light, with trial 5's looks, and three lamps", () => {
    expect(lampParts).toEqual(["roof", "light"]);
    expect(lampCount).toBe(3);
    expect(jobs).toEqual(["leaves", "boards", "rope"]);
    expect(partOfLook("round")).toBe("roof");
    expect(partOfLook("moon")).toBe("light");
    expect(partOfLook("bell")).toBeNull();
  });

  it("starts with nothing told, at the tell step of chain 0 of seed 0", () => {
    expect(initialCrown).toEqual({
      stage: "telling",
      seed: 0,
      chain: 0,
      told: { roof: null, light: null },
      note: null,
    });
    expect(newCrown(7)).toEqual({ ...initialCrown, seed: 7 });
    expect(newCrown(-1).seed).toBe(2 ** 32 - 1);
    expect(newCrown(2.5).seed).toBe(2);
  });
});

describe("the chains of a seed", () => {
  it("pins the chains of seed 0: the wishes, the jobs, the things in their places, the slips", () => {
    expect([0, 1, 2].map((c) => wishAt(0, c))).toEqual([
      { roof: "pointy", light: "candle" },
      { roof: "round", light: "moon" },
      { roof: "flat", light: "star" },
    ]);
    expect([0, 1, 2].map((c) => jobAt(0, c))).toEqual(["leaves", "boards", "rope"]);
    expect([0, 1, 2].map((c) => thingsAt(0, c))).toEqual([
      ["broom", "hammer", "houseKey"],
      ["scissors", "address", "hammer"],
      ["password", "scissors", "broom"],
    ]);
    expect([0, 1, 2].map((c) => slipAt(0, c))).toEqual(["roof", "light", "roof"]);
  });

  it("pins other seeds, from the digits of the seed in base 3 and its block from 3^8", () => {
    expect(wishAt(1, 0)).toEqual({ roof: "round", light: "candle" });
    expect(wishAt(3, 0)).toEqual({ roof: "pointy", light: "star" });
    expect(wishAt(2, 2)).toEqual({ roof: "round", light: "star" });
    expect(thingsAt(1234, 0)).toEqual(["broom", "hammer", "password"]);
    expect(thingsAt(1234, 1)).toEqual(["scissors", "houseKey", "hammer"]);
    const top = 2 ** 32 - 1;
    expect([0, 1, 2].map((c) => jobAt(top, c))).toEqual(["boards", "leaves", "rope"]);
    expect([0, 1, 2].map((c) => thingsAt(top, c))).toEqual([
      ["broom", "password", "hammer"],
      ["houseKey", "broom", "scissors"],
      ["scissors", "hammer", "address"],
    ]);
    expect([0, 1, 2].map((c) => slipAt(top, c))).toEqual(["light", "roof", "light"]);
    expect(jobAt(3 ** 8, 0)).toBe("leaves");
    expect([0, 1, 2].map((c) => jobAt(3 ** 8, c))).toEqual(["leaves", "rope", "boards"]);
    expect([0, 1, 2].map((c) => jobAt(5 * 3 ** 8, c))).toEqual(["rope", "boards", "leaves"]);
    expect(thingsAt(27, 0)).toEqual(["hammer", "houseKey", "broom"]);
    expect(thingsAt(9, 0)).toEqual(["broom", "hammer", "address"]);
    expect(slipAt(81, 0)).toBe("light");
  });

  it("for 100 seeds: no wish repeats the one before it, the jobs differ, the slip alternates, the job's tool moves", () => {
    for (let seed = 0; seed < 100 * 7919; seed += 7919) {
      const wishes = [0, 1, 2].map((c) => wishAt(seed, c));
      for (const part of lampParts) {
        expect(new Set(wishes.map((w) => w[part])).size).toBe(3);
      }
      expect(new Set([0, 1, 2].map((c) => jobAt(seed, c))).size).toBe(3);
      expect(slipAt(seed, 1)).not.toBe(slipAt(seed, 0));
      expect(slipAt(seed, 2)).toBe(slipAt(seed, 0));
      const places = [0, 1, 2].map((c) => thingsAt(seed, c).indexOf(toolFor(seed, c)));
      expect(new Set(places).size).toBe(3);
      for (let c = 0; c < 3; c += 1) {
        const things = thingsAt(seed, c);
        expect(things).toHaveLength(3);
        expect(things).toContain(answerOf(jobAt(seed, c)));
        expect(things.filter((t) => secretThings.includes(t))).toHaveLength(1);
        const other = things.filter((t) => !secretThings.includes(t) && t !== toolFor(seed, c));
        expect(other).toEqual([toolFor(seed, c + 1)]);
      }
    }
  });
});

describe("the made lamp and the cards", () => {
  it("the made lamp keeps the told look of the other part, and the slip part is neither the told look nor the wish's", () => {
    for (let seed = 0; seed < 100 * 104729; seed += 104729) {
      for (let c = 0; c < 3; c += 1) {
        const wish = wishAt(seed, c);
        const slip = slipAt(seed, c);
        const keep = lampParts.find((p) => p !== slip)!;
        for (const roof of looksOf.roof) {
          for (const light of looksOf.light) {
            const told: Lamp = { roof, light };
            const made = madeAt(seed, c, told);
            expect(made[keep]).toBe(told[keep]);
            expect(made[slip]).not.toBe(told[slip]);
            expect(made[slip]).not.toBe(wish[slip]);
            expect(looksOf[slip]).toContain(made[slip]);
            expect(sameLamp(made, wish)).toBe(false);
          }
        }
      }
    }
  });

  it("picks the slip look from the two others when the told look is the wish's, by the seed and the chain", () => {
    expect(madeAt(0, 0, wishAt(0, 0))).toEqual({ roof: "round", light: "candle" });
    expect(madeAt(0, 2, wishAt(0, 2))).toEqual({ roof: "pointy", light: "star" });
    expect(madeAt(243, 0, wishAt(243, 0))).toEqual({ roof: "flat", light: "candle" });
    expect(madeAt(0, 1, wishAt(0, 1))).toEqual({ roof: "round", light: "star" });
    expect(madeAt(0, 0, { roof: "round", light: "candle" })).toEqual({
      roof: "flat",
      light: "candle",
    });
  });

  it("gives two fix cards: the looks of the part it does not have, round the three", () => {
    expect(cardsFor({ roof: "round", light: "candle" }, "roof")).toEqual(["flat", "pointy"]);
    expect(cardsFor({ roof: "flat", light: "moon" }, "light")).toEqual(["candle", "star"]);
    expect(cardsOf(initialCrown)).toEqual([]);
  });

  it("compares lamps part by part", () => {
    expect(sameLamp({ roof: "flat", light: "moon" }, { roof: "flat", light: "moon" })).toBe(true);
    expect(sameLamp({ roof: "flat", light: "moon" }, { roof: "flat", light: "star" })).toBe(false);
    expect(sameLamp({ roof: "round", light: "moon" }, { roof: "flat", light: "moon" })).toBe(false);
  });
});

describe("tell (REQ-9.4)", () => {
  it("a card picks its part's look, a later one replaces it, and a handle's look does nothing", () => {
    const one = play(initialCrown, say("flat"));
    expect(one).toMatchObject({ stage: "telling", told: { roof: "flat", light: null } });
    expect(play(one, say("round"))).toMatchObject({ told: { roof: "round", light: null } });
    expect(play(one, say("star"))).toMatchObject({ told: { roof: "flat", light: "star" } });
    expect(reduceCrown(one, say("bell"))).toBe(one);
    expect(reduceCrown(one, say("flat"))).toBe(one);
  });

  it("Tell with both parts tells the wisp exactly what was picked, the wish or not", () => {
    const told = play(initialCrown, say("flat"), say("moon"), tell);
    expect(told).toEqual({
      stage: "giving",
      seed: 0,
      chain: 0,
      told: { roof: "flat", light: "moon" },
      note: null,
    });
  });

  it("Tell with a part missing moves nothing on and notes the first missing part; the wisp never guesses", () => {
    const none = reduceCrown(initialCrown, tell);
    expect(none).toEqual({ ...initialCrown, note: { kind: "missing", part: "roof" } });
    expect(reduceCrown(none, tell)).toBe(none);
    const roofOnly = play(initialCrown, say("pointy"), tell);
    expect(roofOnly).toMatchObject({ stage: "telling", note: { kind: "missing", part: "light" } });
    expect(reduceCrown(roofOnly, tell)).toBe(roofOnly);
    const lightOnly = play(initialCrown, say("moon"), tell);
    expect(lightOnly).toMatchObject({ stage: "telling", note: { kind: "missing", part: "roof" } });
    expect(play(lightOnly, say("flat"), tell)).toMatchObject({ stage: "giving" });
  });

  it("a card after the wisp asked clears the question, even the same card again", () => {
    const asked = play(initialCrown, say("pointy"), tell);
    expect(reduceCrown(asked, say("pointy"))).toMatchObject({
      told: { roof: "pointy" },
      note: null,
    });
  });

  it("the tell events do nothing in any other step", () => {
    const giving = toldWish(initialCrown);
    expect(reduceCrown(giving, say("flat"))).toBe(giving);
    expect(reduceCrown(giving, tell)).toBe(giving);
    const checking = atCheck(initialCrown);
    expect(reduceCrown(checking, say("flat"))).toBe(checking);
    expect(reduceCrown(checking, tell)).toBe(checking);
  });
});

describe("give and go (REQ-9.5)", () => {
  it("a tool goes to the wisp, untried; a secret only says it is a secret; a thing not on screen does nothing", () => {
    const giving = toldWish(initialCrown);
    expect(play(giving, giveIt("hammer"))).toEqual({
      stage: "going",
      seed: 0,
      chain: 0,
      told: { roof: "pointy", light: "candle" },
      tool: "hammer",
    });
    const secret = play(giving, giveIt("houseKey"));
    expect(secret).toEqual({ ...giving, note: { kind: "secret", thing: "houseKey" } });
    expect(reduceCrown(secret, giveIt("houseKey"))).toBe(secret);
    expect(reduceCrown(giving, giveIt("ladder"))).toBe(giving);
    expect(reduceCrown(giving, giveIt("password"))).toBe(giving);
    expect(reduceCrown(giving, giveIt("candy"))).toBe(giving);
  });

  it("a secret after a stuck tool replaces the note", () => {
    const stuck = play(toldWish(initialCrown), giveIt("hammer"), go);
    expect(play(stuck, giveIt("houseKey"))).toMatchObject({
      note: { kind: "secret", thing: "houseKey" },
    });
  });

  it("Go tries exactly the tool held: the job's tool makes the lamp, another goes back to give with the told lamp", () => {
    const told: Lamp = { roof: "flat", light: "moon" };
    const going = play(initialCrown, say("flat"), say("moon"), tell, giveIt("broom"));
    expect(reduceCrown(going, go)).toEqual({
      stage: "checking",
      seed: 0,
      chain: 0,
      lamp: madeAt(0, 0, told),
      note: null,
    });
    const wrong = play(initialCrown, say("flat"), say("moon"), tell, giveIt("hammer"), go);
    expect(wrong).toEqual({
      stage: "giving",
      seed: 0,
      chain: 0,
      told,
      note: { kind: "stuck", tool: "hammer" },
    });
  });

  it("the give and go events do nothing in any other step", () => {
    expect(reduceCrown(initialCrown, giveIt("broom"))).toBe(initialCrown);
    expect(reduceCrown(initialCrown, go)).toBe(initialCrown);
    const giving = toldWish(initialCrown);
    expect(reduceCrown(giving, go)).toBe(giving);
    const going = atGo(initialCrown);
    expect(reduceCrown(going, giveIt("broom"))).toBe(going);
    const checking = atCheck(initialCrown);
    expect(reduceCrown(checking, go)).toBe(checking);
    expect(reduceCrown(checking, giveIt("broom"))).toBe(checking);
  });
});

describe("check (REQ-9.6)", () => {
  it("the made lamp is never the wish: 'not the same' goes to the fix, 'same' says look again", () => {
    const checking = atCheck(initialCrown);
    expect(checking).toMatchObject({ lamp: { roof: "round", light: "candle" } });
    const fixing = reduceCrown(checking, notSame);
    expect(fixing).toEqual({
      stage: "fixing",
      seed: 0,
      chain: 0,
      lamp: { roof: "round", light: "candle" },
      part: null,
      note: null,
    });
    const again = reduceCrown(checking, same);
    expect(again).toEqual({ ...checking, note: { kind: "again" } });
    expect(reduceCrown(again, same)).toBe(again);
  });

  it("on a lamp that is the wish 'same' lights it and 'not the same' says look again", () => {
    const fixed = play(atCheck(initialCrown), notSame, point("roof"), fix("pointy"));
    expect(fixed).toMatchObject({ stage: "checking", note: { kind: "said", look: "pointy" } });
    expect(reduceCrown(fixed, same)).toEqual({ stage: "lit", seed: 0, chain: 0 });
    expect(reduceCrown(fixed, notSame)).toMatchObject({
      stage: "checking",
      note: { kind: "again" },
    });
  });

  it("the check does nothing in any other step", () => {
    expect(reduceCrown(initialCrown, same)).toBe(initialCrown);
    const fixing = play(atCheck(initialCrown), notSame);
    expect(reduceCrown(fixing, same)).toBe(fixing);
    expect(reduceCrown(fixing, notSame)).toBe(fixing);
  });
});

const fixing = () => play(atCheck(initialCrown), notSame);

describe("fix (REQ-9.7)", () => {
  it("a part that differs is pointed at and opens its two cards; a part that is the same is fine", () => {
    const pointed = reduceCrown(fixing(), point("roof"));
    expect(pointed).toMatchObject({ stage: "fixing", part: "roof", note: null });
    expect(cardsOf(pointed)).toEqual(["flat", "pointy"]);
    expect(reduceCrown(pointed, point("roof"))).toBe(pointed);
    const fine = reduceCrown(pointed, point("light"));
    expect(fine).toMatchObject({ part: null, note: { kind: "fine", part: "light" } });
    expect(cardsOf(fine)).toEqual([]);
    expect(reduceCrown(fine, point("light"))).toBe(fine);
    expect(reduceCrown(fine, point("roof"))).toMatchObject({ part: "roof", note: null });
  });

  it("a point at a part that is the same right away notes it, with the lamp unchanged", () => {
    const fine = reduceCrown(fixing(), point("light"));
    expect(fine).toEqual({ ...fixing(), note: { kind: "fine", part: "light" } });
  });

  it("a card changes exactly the pointed part to exactly that look, and the child checks again", () => {
    const pointed = play(fixing(), point("roof"));
    expect(reduceCrown(pointed, fix("flat"))).toEqual({
      stage: "checking",
      seed: 0,
      chain: 0,
      lamp: { roof: "flat", light: "candle" },
      note: { kind: "said", look: "flat" },
    });
  });

  it("a look that is no card, or a card with nothing pointed at, does nothing", () => {
    const pointed = play(fixing(), point("roof"));
    expect(reduceCrown(pointed, fix("round"))).toBe(pointed);
    expect(reduceCrown(pointed, fix("moon"))).toBe(pointed);
    expect(reduceCrown(pointed, fix("bell"))).toBe(pointed);
    const open = fixing();
    expect(reduceCrown(open, fix("pointy"))).toBe(open);
    const checking = atCheck(initialCrown);
    expect(reduceCrown(checking, fix("pointy"))).toBe(checking);
    expect(reduceCrown(checking, point("roof"))).toBe(checking);
  });

  it("a wrong card leaves the part not the same, and the check finds it", () => {
    const wrong = play(fixing(), point("roof"), fix("flat"), same);
    expect(wrong).toMatchObject({ stage: "checking", note: { kind: "again" } });
    const again = play(wrong, notSame, point("roof"));
    expect(cardsOf(again)).toEqual(["pointy", "round"]);
    expect(play(again, fix("pointy"), same)).toMatchObject({ stage: "lit" });
  });

  it("a told look that is not the wish's is fixed like the slip: two fixes, then the lamp is lit", () => {
    const told = play(initialCrown, say("pointy"), say("moon"), tell, giveIt("broom"), go);
    expect(told).toMatchObject({ lamp: { roof: "round", light: "moon" } });
    const lit = play(
      told,
      notSame,
      point("roof"),
      fix("pointy"),
      notSame,
      point("light"),
      fix("candle"),
      same,
    );
    expect(lit).toEqual({ stage: "lit", seed: 0, chain: 0 });
  });
});

describe("the lit lamps and the clear (REQ-9.9, REQ-9.10)", () => {
  it("Next after a lit lamp brings the next chain with nothing told; before that it does nothing", () => {
    const lit = playChain(initialCrown);
    expect(lit).toEqual({ stage: "lit", seed: 0, chain: 0 });
    expect(reduceCrown(lit, next)).toEqual({ ...initialCrown, chain: 1 });
    expect(reduceCrown(initialCrown, next)).toBe(initialCrown);
    const checking = atCheck(initialCrown);
    expect(reduceCrown(checking, next)).toBe(checking);
  });

  it("a lit lamp takes no other event", () => {
    const lit = playChain(initialCrown);
    for (const e of [
      say("flat"),
      tell,
      giveIt("broom"),
      go,
      same,
      notSame,
      point("roof"),
      fix("flat"),
    ]) {
      expect(reduceCrown(lit, e)).toBe(lit);
    }
  });

  it("three chains clear the trial; the clear takes no step event", () => {
    let crown = newCrown(1234);
    for (let c = 0; c < 3; c += 1) {
      expect(crown).toMatchObject({ stage: "telling", chain: c });
      expect(litCount(crown)).toBe(c);
      crown = playChain(crown);
      expect(litCount(crown)).toBe(c + 1);
      crown = reduceCrown(crown, next);
    }
    expect(crown).toEqual({ stage: "clear", seed: 1234 });
    expect(litCount(crown)).toBe(3);
    expect(chainOf(crown)).toBe(2);
    expect(wishOf(crown)).toEqual(wishAt(1234, 2));
    for (const e of [
      say("flat"),
      tell,
      giveIt("broom"),
      go,
      same,
      point("roof"),
      fix("flat"),
      next,
    ]) {
      expect(reduceCrown(crown, e)).toBe(crown);
    }
  });

  it("counts the town's lamps in every stage of a chain", () => {
    const chain1 = { ...initialCrown, chain: 1 };
    expect(litCount(chain1)).toBe(1);
    expect(litCount(atCheck(chain1))).toBe(1);
    expect(litCount(playChain(chain1))).toBe(2);
    expect(chainOf(atCheck(chain1))).toBe(1);
  });
});
