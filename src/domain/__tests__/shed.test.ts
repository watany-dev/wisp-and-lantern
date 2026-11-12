import { describe, expect, it } from "vite-plus/test";
import type { ShedEvent } from "../events";
import {
  answerOf,
  canGive,
  initialShed,
  newShed,
  puzzleAt,
  puzzleOf,
  puzzles,
  reduceShed,
  shedOutcome,
  solves,
  tools,
  triedTool,
  type PuzzleId,
  type Shed,
  type ToolId,
} from "../shed";

const picked = (pick: ToolId | null, round = 0, seed = 0): Shed => ({
  stage: "choosing",
  seed,
  round,
  pick,
});
const tried = (tool: ToolId, round = 0, seed = 0): Shed => ({ stage: "tried", seed, round, tool });
const pick = (tool: ToolId): ShedEvent => ({ type: "PickTool", tool });
const give: ShedEvent = { type: "GiveTool" };
const retry: ShedEvent = { type: "RetryShed" };
const play = (events: ShedEvent[], from: Shed = initialShed) => events.reduce(reduceShed, from);
const orderOf = (seed: number, rounds = 5) =>
  Array.from({ length: rounds }, (_, round) => puzzleAt(seed, round));

describe("the tools and the puzzles (REQ-5.3, REQ-5.5)", () => {
  it("has five tools: key, broom, hammer, scissors and ladder", () => {
    expect([...tools]).toEqual(["key", "broom", "hammer", "scissors", "ladder"]);
  });

  it("has five puzzles: lock, leaves, boards, rope and roof", () => {
    expect([...puzzles]).toEqual(["lock", "leaves", "boards", "rope", "roof"]);
  });

  it("gives every puzzle its own answer, and every tool is the answer to one puzzle", () => {
    expect(puzzles.map(answerOf)).toEqual(["key", "broom", "hammer", "scissors", "ladder"]);
    expect(new Set(puzzles.map(answerOf))).toEqual(new Set(tools));
  });

  it("solves a puzzle with its answer and with no other tool", () => {
    for (const puzzle of puzzles) {
      for (const tool of tools)
        expect(solves(puzzle, tool), `${puzzle} / ${tool}`).toBe(tool === answerOf(puzzle));
    }
  });

  it("starts with nothing picked, in round 0 of seed 0", () => {
    expect(initialShed).toEqual({ stage: "choosing", seed: 0, round: 0, pick: null });
  });
});

describe("puzzleAt, the order of the puzzles (REQ-5.2.3)", () => {
  it("seed 0 goes through the puzzles in their list order, then around again", () => {
    expect(orderOf(0, 7)).toEqual([...puzzles, "lock", "leaves"]);
  });

  it("starts at seed modulo 5 and steps by 1 plus (seed div 5) modulo 4", () => {
    expect(orderOf(1)).toEqual(["leaves", "boards", "rope", "roof", "lock"]);
    expect(orderOf(7)).toEqual(["boards", "roof", "leaves", "rope", "lock"]);
    expect(orderOf(5)).toEqual(["lock", "boards", "roof", "leaves", "rope"]);
    expect(orderOf(10)).toEqual(["lock", "rope", "leaves", "roof", "boards"]);
    expect(orderOf(15)).toEqual(["lock", "roof", "rope", "boards", "leaves"]);
    expect(orderOf(20)).toEqual(orderOf(0));
  });

  it("shows all five puzzles in every five rounds and never the same one twice in a row", () => {
    for (let seed = 0; seed < 200; seed += 1) {
      for (let from = 0; from < 7; from += 1) {
        const five = Array.from({ length: 5 }, (_, i) => puzzleAt(seed, from + i));
        expect(new Set(five).size, `seed ${seed} from ${from}`).toBe(5);
      }
      for (let round = 0; round < 12; round += 1) {
        expect(puzzleAt(seed, round + 1), `seed ${seed}`).not.toBe(puzzleAt(seed, round));
      }
    }
  });

  it("gives the same puzzle for the same seed and round, and a different order for a different step", () => {
    expect(puzzleAt(123_456, 9)).toBe(puzzleAt(123_456, 9));
    const orders = new Set([0, 5, 10, 15].map((seed) => orderOf(seed).join()));
    expect(orders.size).toBe(4);
  });

  it("is the puzzle of a shed from its seed and round", () => {
    expect(puzzleOf(picked(null, 3, 7))).toBe(puzzleAt(7, 3));
    expect(puzzleOf(tried("key", 4, 10))).toBe(puzzleAt(10, 4));
  });
});

describe("newShed", () => {
  it("is round 0 of the seed with nothing picked", () => {
    expect(newShed(7)).toEqual({ stage: "choosing", seed: 7, round: 0, pick: null });
  });

  it("keeps the seed a whole number from 0 up to 2 to the 32nd, as the field does", () => {
    expect(newShed(2 ** 32 + 3).seed).toBe(3);
    expect(newShed(-1).seed).toBe(2 ** 32 - 1);
    expect(newShed(3.9).seed).toBe(3);
  });
});

describe("shedOutcome and triedTool", () => {
  it("choosing has no tried tool and no result, whatever is picked", () => {
    for (const shed of [picked(null), ...tools.map((t) => picked(t))]) {
      expect(triedTool(shed)).toBeNull();
      expect(shedOutcome(shed)).toBe("choosing");
    }
  });

  it("a tried tool is the answer's: freed; any other tool: stuck", () => {
    for (let round = 0; round < 5; round += 1) {
      const answer = answerOf(puzzleAt(0, round));
      for (const tool of tools) {
        const shed = tried(tool, round);
        expect(triedTool(shed)).toBe(tool);
        expect(shedOutcome(shed), `${round} / ${tool}`).toBe(tool === answer ? "freed" : "stuck");
      }
    }
  });

  it("follows the seed: the key frees the cat in round 0 of seed 0, and not in round 0 of seed 1", () => {
    expect(shedOutcome(tried("key", 0, 0))).toBe("freed");
    expect(shedOutcome(tried("key", 0, 1))).toBe("stuck");
    expect(shedOutcome(tried("broom", 0, 1))).toBe("freed");
  });
});

describe("canGive (REQ-5.4)", () => {
  it("is true only while choosing with a tool picked", () => {
    expect(canGive(picked(null))).toBe(false);
    for (const tool of tools) {
      expect(canGive(picked(tool))).toBe(true);
      expect(canGive(tried(tool))).toBe(false);
    }
  });
});

describe("PickTool (REQ-5.3)", () => {
  it.each(tools)("picks the %s from an empty hand", (tool) => {
    expect(reduceShed(initialShed, pick(tool))).toEqual(picked(tool));
  });

  it("replaces the pick: a later tool takes the place of the earlier one, never both", () => {
    expect(play([pick("key"), pick("broom")])).toEqual(picked("broom"));
    expect(play([pick("broom"), pick("hammer"), pick("ladder")])).toEqual(picked("ladder"));
  });

  it("keeps the seed and the round, and returns the same object for the same tool", () => {
    const here = picked("key", 3, 9);
    expect(reduceShed(here, pick("scissors"))).toEqual(picked("scissors", 3, 9));
    expect(reduceShed(here, pick("key"))).toBe(here);
  });

  it("does not hand the tool over or use it", () => {
    for (const tool of tools) {
      expect(reduceShed(initialShed, pick(tool)).stage).toBe("choosing");
      expect(shedOutcome(reduceShed(initialShed, pick(tool)))).toBe("choosing");
    }
  });

  it("is ignored once a tool was tried, until the retry", () => {
    for (const first of tools) {
      const done = tried(first);
      for (const other of tools) expect(reduceShed(done, pick(other))).toBe(done);
    }
  });
});

describe("GiveTool (REQ-5.4, REQ-5.5)", () => {
  it.each(tools)("tries exactly the %s that was picked, and nothing else", (tool) => {
    expect(play([pick(tool), give])).toEqual(tried(tool));
  });

  it("tries the tool that is picked at that moment, after a pick was replaced", () => {
    expect(play([pick("key"), pick("hammer"), give])).toEqual(tried("hammer"));
    expect(play([pick("hammer"), pick("key"), give])).toEqual(tried("key"));
  });

  it("keeps the seed and the round", () => {
    expect(reduceShed(picked("broom", 6, 11), give)).toEqual(tried("broom", 6, 11));
  });

  it("with no tool picked changes nothing and returns the same object", () => {
    expect(reduceShed(initialShed, give)).toBe(initialShed);
  });

  it("is locked while a result shows: a second hand-over changes nothing", () => {
    for (const tool of tools) {
      const done = tried(tool);
      expect(reduceShed(done, give)).toBe(done);
    }
  });

  it("frees the cat only with the tool that answers this round's puzzle (REQ-5.5.2)", () => {
    for (const puzzle of puzzles) {
      const round = puzzles.indexOf(puzzle);
      for (const tool of tools) {
        const shed = play([pick(tool), give], picked(null, round));
        expect(puzzleOf(shed)).toBe(puzzle);
        expect(shedOutcome(shed), `${puzzle} / ${tool}`).toBe(
          solves(puzzle, tool) ? "freed" : "stuck",
        );
      }
    }
  });
});

/** A tool that does not solve the puzzle of this round, and the one that does. */
const stuckTool = (round: number, seed = 0): ToolId =>
  tools.find((t) => !solves(puzzleAt(seed, round), t))!;
const rightTool = (round: number, seed = 0): ToolId => answerOf(puzzleAt(seed, round));

describe("RetryShed (REQ-5.6, REQ-5.7)", () => {
  it("after a stuck result stays on the same puzzle with nothing picked", () => {
    for (const round of [0, 1, 4, 9]) {
      const stuck = tried(stuckTool(round, 3), round, 3);
      expect(shedOutcome(stuck)).toBe("stuck");
      expect(reduceShed(stuck, retry)).toEqual(picked(null, round, 3));
    }
  });

  it("after a freed result goes to the next round and the next puzzle, with nothing picked", () => {
    for (const round of [0, 1, 4, 9]) {
      const freed = tried(rightTool(round, 3), round, 3);
      expect(shedOutcome(freed)).toBe("freed");
      const next = reduceShed(freed, retry);
      expect(next).toEqual(picked(null, round + 1, 3));
      expect(puzzleOf(next)).not.toBe(puzzleOf(freed));
    }
  });

  it("while choosing changes nothing and returns the same object", () => {
    expect(reduceShed(initialShed, retry)).toBe(initialShed);
    const keyPicked = picked("key", 2, 5);
    expect(reduceShed(keyPicked, retry)).toBe(keyPicked);
  });

  it("has no limit and no cost: the answer frees the cat after any number of other tools", () => {
    let shed = initialShed;
    for (let i = 0; i < 20; i += 1) {
      shed = play([pick(stuckTool(0)), give, retry], shed);
      expect(shed).toEqual(initialShed);
    }
    expect(shedOutcome(play([pick(rightTool(0)), give], shed))).toBe("freed");
  });

  it("plays five puzzles in a row, each with its own answer", () => {
    let shed = initialShed;
    const seen: PuzzleId[] = [];
    for (let round = 0; round < 5; round += 1) {
      seen.push(puzzleOf(shed));
      shed = play([pick(rightTool(round)), give], shed);
      expect(shedOutcome(shed)).toBe("freed");
      shed = reduceShed(shed, retry);
    }
    expect(seen).toEqual([...puzzles]);
    expect(shed.round).toBe(5);
  });
});
