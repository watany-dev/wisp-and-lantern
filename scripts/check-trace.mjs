// Traceability: every domain invariant has a property test, and requirements are tracked.
// - INV-n in .kiro/steering/domain-invariants.md must appear in src/domain/__tests__/*.pbt.test.ts.
//   Warning before 2026-11-07T00:00+09:00, failure from then on. Skips if the steering file is absent.
// - REQ-x.y in .kiro/specs/*/requirements.md that appear in neither tests nor tasks.md: warning only.
import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ENFORCE_FROM = Date.parse("2026-11-07T00:00:00+09:00");
const STEERING = ".kiro/steering/domain-invariants.md";
const PBT_DIR = "src/domain/__tests__";
const SPECS = ".kiro/specs";

const read = (f) => (existsSync(f) ? readFileSync(f, "utf8") : "");
const ls = (d) => (existsSync(d) ? readdirSync(d) : []);
// Fixed patterns only: an id never matches a longer one (INV-1 vs INV-10, REQ-1.1 vs REQ-1.10).
const INV = /INV-\d+/g;
const REQ = /REQ-\d+\.\d+(?![\d.])/g;
const ids = (text, re) => new Set(text.match(re) ?? []);

if (!existsSync(STEERING)) {
  console.log(`check-trace: skip (${STEERING} not found)`);
  process.exit(0);
}

const enforce = Date.now() >= ENFORCE_FROM;
const invariants = [...ids(read(STEERING), INV)];
const pbt = ls(PBT_DIR)
  .filter((f) => f.endsWith(".pbt.test.ts"))
  .map((f) => read(join(PBT_DIR, f)))
  .join("\n");
const testedInv = ids(pbt, INV);
const untestedInv = invariants.filter((id) => !testedInv.has(id));

const tests = ids(
  [PBT_DIR, "e2e"].flatMap((d) => ls(d).map((f) => read(join(d, f)))).join("\n"),
  REQ,
);
const rows = [];
const untrackedReq = [];
for (const spec of ls(SPECS)) {
  const reqs = ids(read(join(SPECS, spec, "requirements.md")), REQ);
  const tasks = ids(read(join(SPECS, spec, "tasks.md")), REQ);
  for (const id of reqs) {
    const inTests = tests.has(id);
    const inTasks = tasks.has(id);
    rows.push(`| ${spec} | ${id} | ${inTests ? "yes" : "no"} | ${inTasks ? "yes" : "no"} |`);
    if (!inTests && !inTasks) untrackedReq.push(`${spec}: ${id}`);
  }
}

for (const id of untestedInv) {
  console.log(
    `${enforce ? "::error::" : "::warning::"}${id} has no property test in ${PBT_DIR}/*.pbt.test.ts`,
  );
}
for (const r of untrackedReq) console.log(`::warning::${r} is in neither tests nor tasks.md`);

if (process.env.GITHUB_STEP_SUMMARY) {
  const inv = invariants.map(
    (id) => `| ${id} | ${untestedInv.includes(id) ? "missing" : "tested"} |`,
  );
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    [
      "### Traceability",
      "",
      "| invariant | property test |",
      "|---|---|",
      ...inv,
      "",
      "| spec | requirement | in tests | in tasks.md |",
      "|---|---|---|---|",
      ...rows,
      "",
    ].join("\n"),
  );
}

if (enforce && untestedInv.length) process.exit(1);
console.log(
  `check-trace: ${invariants.length} invariants, ${untestedInv.length} without tests${enforce ? "" : " (warning only before 2026-11-07 JST)"}`,
);
