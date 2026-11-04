import { chmodSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { fixture, run, SCRIPTS } from "./run";

/** Runs pages-enabled.sh with a fake `gh` that prints `stderr` and exits with `exit`. */
function pagesEnabled(
  fake: { exit: number; stdout?: string; stderr?: string },
  repo: string | null = "owner/repo",
) {
  const dir = fixture({
    "bin/gh": [
      "#!/usr/bin/env bash",
      'echo "$*" >> "$GH_CALLS"',
      `printf '%s' ${JSON.stringify(fake.stdout ?? "")}`,
      `printf '%s' ${JSON.stringify(fake.stderr ?? "")} >&2`,
      `exit ${fake.exit}`,
      "",
    ].join("\n"),
    "output.txt": "",
    "calls.txt": "",
  });
  chmodSync(join(dir, "bin/gh"), 0o755);
  // `env -u` must come before the assignments; the repo variable is set or removed explicitly.
  const r = run(dir, "env", [
    ...(repo === null ? ["-u", "GH_REPO"] : [`GH_REPO=${repo}`]),
    `PATH=${join(dir, "bin")}:${process.env.PATH}`,
    `GITHUB_OUTPUT=${join(dir, "output.txt")}`,
    `GH_CALLS=${join(dir, "calls.txt")}`,
    "bash",
    join(SCRIPTS, "pages-enabled.sh"),
  ]);
  return {
    ...r,
    output: readFileSync(join(dir, "output.txt"), "utf8"),
    calls: readFileSync(join(dir, "calls.txt"), "utf8"),
  };
}

describe("pages-enabled.sh", () => {
  it("reports enabled when the Pages API knows the site", () => {
    const r = pagesEnabled({ exit: 0, stdout: "https://owner.github.io/repo/" });
    expect(r.status).toBe(0);
    expect(r.output).toBe("enabled=true\n");
    expect(r.calls).toContain("api repos/owner/repo/pages");
    expect(r.out).not.toContain("::warning");
  });

  it("reports disabled with a warning when there is no Pages site (404)", () => {
    const r = pagesEnabled({ exit: 1, stderr: "gh: Not Found (HTTP 404)\n" });
    expect(r.status).toBe(0);
    expect(r.output).toBe("enabled=false\n");
    expect(r.out).toContain("::warning");
    expect(r.out).toContain("Pages");
    expect(r.out).toContain("docs/maintainer-setup.md");
  });

  it("keeps waiting, with a warning, when the API answers with anything but 404", () => {
    const r = pagesEnabled({ exit: 1, stderr: "gh: Resource not accessible (HTTP 403)\n" });
    expect(r.status).toBe(0);
    expect(r.output).toBe("enabled=true\n");
    expect(r.out).toContain("::warning");
    expect(r.out).toContain("HTTP 403");
  });

  it("keeps waiting when gh itself fails without an HTTP status", () => {
    const r = pagesEnabled({ exit: 4, stderr: "error connecting to api.github.com\n" });
    expect(r.output).toBe("enabled=true\n");
    expect(r.out).toContain("::warning");
  });

  it("requires GH_REPO", () => {
    const r = pagesEnabled({ exit: 0 }, null);
    expect(r.status).not.toBe(0);
    expect(r.out).toContain("GH_REPO");
  });
});
