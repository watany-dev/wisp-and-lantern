import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vite-plus/test";
import { fixture, runScript } from "./run";

const KB = 1024;
const check = (files: Record<string, string | Buffer>) =>
  runScript(fixture(files), "check-size.mjs");

describe("check-size", () => {
  it("passes a small build with .nojekyll", () => {
    const r = check({ "dist/.nojekyll": "", "dist/index.js": "console.log(1)\n" });
    expect(r).toMatchObject({ status: 0 });
    expect(r.out).toContain("index.js");
  });

  it("fails without a build", () => {
    expect(check({ "README.md": "" }).out).toContain("dist/ not found");
  });

  it("enforces .nojekyll, no raw fonts and the WOFF2 budget", () => {
    const r = check({
      "dist/a.ttf": "",
      "dist/big.woff2": randomBytes(201 * KB),
      "dist/ok.woff2": randomBytes(200 * KB),
    });
    expect(r.status).toBe(1);
    expect(r.out).toContain(".nojekyll is missing");
    expect(r.out).toContain("a.ttf: raw font files must not be deployed");
    expect(r.out).toContain("big.woff2 is 201.0 KB");
    expect(r.out).not.toContain("ok.woff2 is");
  });

  it("enforces the 1 MB gzip budget for JS and CSS", () => {
    // Random bytes do not compress, so gzip size is about the file size.
    const r = check({ "dist/.nojekyll": "", "dist/app.js": randomBytes(1100 * KB) });
    expect(r.out).toMatch(/gzip\(JS \+ CSS\) is \d+\.\d KB \(max 1024 KB\)/);
  });
});
