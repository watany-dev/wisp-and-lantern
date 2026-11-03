import { describe, expect, it } from "vite-plus/test";
import { fixture, runScript } from "./run";

type Pkg = {
  license?: string | undefined;
  dev?: boolean;
  link?: boolean;
  resolved?: string;
  integrity?: string | undefined;
};
const pkg = (name: string, over: Pkg = {}): [string, Pkg] => [
  `node_modules/${name}`,
  {
    license: "MIT",
    resolved: `https://registry.npmjs.org/${name}/-/${name}-1.0.0.tgz`,
    integrity: "sha512-x",
    ...over,
  },
];

const check = (...pkgs: [string, Pkg][]) =>
  runScript(
    fixture({
      "package-lock.json": JSON.stringify({
        lockfileVersion: 3,
        packages: { "": { name: "root" }, ...Object.fromEntries(pkgs) },
      }),
    }),
    "check-licenses.mjs",
  );

describe("check-licenses", () => {
  it("passes permissive packages and SPDX expressions", () => {
    const r = check(
      pkg("a"),
      pkg("b", { license: "(MIT AND Zlib)" }),
      pkg("c", { license: "(GPL-3.0 OR Apache-2.0)" }),
      pkg("d", { license: "MPL-2.0", dev: true }),
      ["node_modules/e/node_modules/f", { link: true }],
    );
    expect(r).toMatchObject({ status: 0 });
    expect(r.out).toContain("ok (4 packages)");
  });

  it("rejects copyleft and missing licenses, and dev-only licenses in shipped code", () => {
    const r = check(
      pkg("gpl", { license: "GPL-3.0" }),
      pkg("both", { license: "MIT AND GPL-3.0" }),
      pkg("none", { license: undefined }),
      pkg("mpl", { license: "MPL-2.0" }),
    );
    expect(r.status).toBe(1);
    expect(r.out).toContain("gpl: license GPL-3.0 is not allowed in shipped code");
    expect(r.out).toContain("both: license MIT AND GPL-3.0 is not allowed");
    expect(r.out).toContain("none: no license");
    expect(r.out).toContain("mpl: license MPL-2.0 is not allowed in shipped code");
  });

  it("rejects packages from other registries or without an integrity hash", () => {
    const r = check(
      pkg("git", { resolved: "git+https://example.com/x.git" }),
      pkg("noint", { integrity: undefined }),
    );
    expect(r.out).toContain("git: resolved from example.com, not registry.npmjs.org");
    expect(r.out).toContain("noint: no integrity hash");
  });
});
