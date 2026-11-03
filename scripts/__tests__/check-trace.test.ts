import { describe, expect, it } from "vite-plus/test";
import { fixture, runScript } from "./run";

const STEERING = ".kiro/steering/domain-invariants.md";
const PBT = "src/domain/__tests__/reducer.pbt.test.ts";
const check = (files: Record<string, string>) => runScript(fixture(files), "check-trace.mjs");

describe("check-trace", () => {
  it("skips when the invariants steering file is absent", () => {
    expect(check({ "README.md": "" })).toMatchObject({ status: 0 });
  });

  it("passes when every invariant has a property test", () => {
    const r = check({ [STEERING]: "INV-1 and INV-2", [PBT]: "// INV-1\n// INV-2\n" });
    expect(r).toMatchObject({ status: 0 });
    expect(r.out).toContain("2 invariants, 0 without tests");
  });

  it("reports an untested invariant without matching a longer id", () => {
    // Before 2026-11-07 JST this is a warning, after it an error; the report is the same.
    const r = check({ [STEERING]: "INV-1", [PBT]: "// INV-10\n" });
    expect(r.out).toMatch(/::(warning|error)::INV-1 has no property test/);
  });

  it("warns about requirements that are in neither tests nor tasks", () => {
    const r = check({
      [STEERING]: "INV-1",
      [PBT]: "// INV-1 REQ-1.1",
      ".kiro/specs/01-core/requirements.md": "REQ-1.1 REQ-1.2 REQ-1.3",
      ".kiro/specs/01-core/tasks.md": "- [ ] 1. REQ-1.2",
    });
    expect(r.status).toBe(0);
    expect(r.out).toContain("::warning::01-core: REQ-1.3 is in neither tests nor tasks.md");
    expect(r.out).not.toContain("REQ-1.1 is in neither");
    expect(r.out).not.toContain("REQ-1.2 is in neither");
  });
});
