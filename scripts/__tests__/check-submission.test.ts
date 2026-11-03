import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { fixture, gitInit, runScript, SCRIPTS, type Files } from "./run";

const README = ["## Play", "## For judges", "## Prior work", "## Kiro usage", "## License"];
const FONT = "public/assets/fonts/zen-maru-gothic-subset.woff2";

function repo(over: Files = {}, remove: string[] = []): string {
  const files: Files = {
    LICENSE: "MIT License\n",
    ".kiro/.gitkeep": "",
    "README.md": `${README.join("\n\n")}\n`,
    "public/assets/CREDITS.md": "# Credits\n",
    "public/assets/fonts/OFL.txt": "SIL OPEN FONT LICENSE (OFL)\n",
    [FONT]: Buffer.alloc(1024),
    "package.json": JSON.stringify({ dependencies: { a: "1.2.3" }, devDependencies: {} }),
    "scripts/check-cjk-allowlist.txt": readFileSync(
      join(SCRIPTS, "check-cjk-allowlist.txt"),
      "utf8",
    ),
    ...over,
  };
  for (const path of remove) delete files[path];
  const dir = fixture(files);
  gitInit(dir);
  return dir;
}

const check = (over?: Files, remove?: string[]) =>
  runScript(repo(over, remove), "check-submission.sh");

describe("check-submission.sh", () => {
  it("passes a compliant repository", () => {
    const r = check();
    expect(r.out).toBe("");
    expect(r.status).toBe(0);
  });

  it("requires the MIT license, a tracked .kiro and the README sections", () => {
    const r = check({ LICENSE: "Apache\n", "README.md": "## Play\n" }, [".kiro/.gitkeep"]);
    expect(r.status).toBe(1);
    expect(r.out).toContain("LICENSE is missing or not MIT");
    expect(r.out).toContain(".kiro/ is missing");
    expect(r.out).toContain("README.md lacks '## For judges'");
  });

  it("rejects a font over 200 KB and raw fonts under public/", () => {
    const r = check({ [FONT]: Buffer.alloc(205 * 1024), "public/x.ttf": "" });
    expect(r.out).toContain("larger than 200 KB");
    expect(r.out).toContain("raw font files under public/");
  });

  it("rejects unpinned dependencies and unpinned MCP servers", () => {
    const r = check({
      "package.json": JSON.stringify({ dependencies: { a: "^1.0.0" }, devDependencies: {} }),
      ".kiro/settings/mcp.json": '{ "args": ["some-server@latest"] }',
    });
    expect(r.out).toContain("a@^1.0.0");
    expect(r.out).toContain("pin MCP server versions");
  });

  it("allows Japanese only in allowlisted files", () => {
    const kana = String.fromCodePoint(0x3042); // built so this file stays English
    expect(check({ "src/content/strings.ja.json": `"${kana}"` }).status).toBe(0);
    const r = check({ "docs/notes.md": kana });
    expect(r.out).toContain("docs/notes.md");
    expect(r.out).toContain("Japanese text outside");
  });

  it("rejects the scaffold tool's vendor names", () => {
    const name = ["Clau", "de"].join("");
    expect(check({ "docs/notes.md": `made with ${name}\n` }).out).toContain("vendor names found");
  });
});
