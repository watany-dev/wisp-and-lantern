import { describe, expect, it } from "vite-plus/test";
import { fixture, gitInit, runScript } from "./run";

const LOG = "docs/evidence/kiro-log";
const record = (over: object = {}) =>
  JSON.stringify({
    ts: "2026-11-03T01:02:03.000Z",
    session: "s1",
    kind: "AgentStop",
    surface: "cli",
    ...over,
  });

const check = (files: Record<string, string>) => runScript(fixture(files), "check-evidence.mjs");

describe("check-evidence", () => {
  it("passes well-formed logs and playtest records", () => {
    const r = check({
      [`${LOG}/s1.jsonl`]: `${record()}\n\n${record({ ts: "2026-11-03T10:00:00+09:00" })}\n`,
      "docs/evidence/playtest-1.md": "# Playtest 1\n- consent: given by the parent\n",
    });
    expect(r).toMatchObject({ status: 0 });
    expect(r.out).toContain("ok (2 files)");
  });

  it("rejects broken log lines", () => {
    const r = check({
      [`${LOG}/s1.jsonl`]: [
        "not json",
        record({ ts: "yesterday" }),
        record({ surface: "" }),
        record({ session: "s2" }),
      ].join("\n"),
    });
    expect(r.status).toBe(1);
    expect(r.out).toContain("s1.jsonl:1: not valid JSON");
    expect(r.out).toContain(":2: ts must be an ISO 8601 timestamp");
    expect(r.out).toContain(":3: missing surface");
    expect(r.out).toContain(":4: session s2 does not match the file name");
  });

  it("requires consent in playtest records", () => {
    const r = check({ "docs/evidence/playtest-2.md": "# Playtest 2\n" });
    expect(r.out).toContain("needs a `consent:` line");
  });

  it("rejects e-mail addresses and phone numbers anywhere in the evidence", () => {
    const r = check({
      "docs/evidence/notes.md": "mail someone@example.com\ncall 090-1234-5678\nversion 1.2.3\n",
    });
    expect(r.status).toBe(1);
    expect(r.out).toContain("notes.md:1: looks like an e-mail address");
    expect(r.out).toContain("notes.md:2: looks like a phone number");
    expect(r.out).not.toContain("notes.md:3");
  });
});

describe("evidence-log.sh", () => {
  it("appends records that check-evidence accepts, one file per session", () => {
    const dir = fixture({ "README.md": "x\n" });
    gitInit(dir);
    const payload = JSON.stringify({ hook_event_name: "AgentStop", surface: "web" });
    expect(runScript(dir, "evidence-log.sh", payload).status).toBe(0);
    expect(runScript(dir, "evidence-log.sh", "not json").status).toBe(0);
    const r = runScript(dir, "check-evidence.mjs");
    expect(r).toMatchObject({ status: 0 });
    expect(r.out).toContain("ok (1 files)");
  });
});
