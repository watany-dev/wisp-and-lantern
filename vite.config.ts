import { defineConfig, lazyPlugins } from "vite-plus";

const buildSha = process.env.VITE_BUILD_SHA ?? "dev";

// Generated, vendored and record files that tools must not rewrite or lint.
const generated = [
  "dist/**",
  "coverage/**",
  "playwright-report/**",
  "test-results/**",
  "e2e/screenshots/**",
  "assets-src/**",
  ".cache/**",
];

export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  build: {
    target: "es2020",
    assetsInlineLimit: 0,
    // Phaser alone is over 1 MB; scripts/check-size.mjs enforces the real budget.
    chunkSizeWarningLimit: 1600,
  },
  plugins: lazyPlugins(() => [
    {
      name: "build-sha-meta",
      transformIndexHtml: () => [
        { tag: "meta", attrs: { name: "build", content: buildSha }, injectTo: "head" },
      ],
    },
  ]),

  // `vp test` (Vitest). Benchmarks use vitest.perf.config.ts instead.
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      // Enabled by `npm test` (`vp test run --coverage`), so filtered runs such as
      // `npx vp test run pbt` are not held to the thresholds.
      provider: "v8",
      include: ["src/**/*.ts"],
      // Phaser rendering code runs only in a browser; the Playwright smoke covers it.
      // Keep logic out of these paths so that it stays unit-tested.
      exclude: [
        "src/**/__tests__/**",
        "src/**/__perf__/**",
        "src/main.ts",
        "src/game/boot.ts",
        "src/game/scenes/**",
        "src/game/fx/**",
        "src/game/ui/**",
      ],
      thresholds: { lines: 95, functions: 95, branches: 95, statements: 95 },
      reporter: ["text", "text-summary", "json-summary", "html"],
    },
  },

  // `vp lint` and `vp check` (Oxlint, type-aware through TypeScript 7).
  lint: {
    plugins: ["eslint", "typescript", "unicorn", "oxc"],
    categories: { correctness: "error" },
    env: { builtin: true },
    ignorePatterns: generated,
    options: { typeAware: true, typeCheck: true },
    rules: {
      "no-var": "error",
      "prefer-const": "error",
      "typescript/ban-ts-comment": "error",
      "typescript/no-explicit-any": "error",
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    overrides: [
      { files: ["src/**/*.ts"], env: { browser: true } },
      {
        files: ["scripts/**/*.mjs", "*.ts", "e2e/**/*.ts", "perf/**/*.ts"],
        env: { node: true },
      },
      {
        files: ["src/domain/**/*.ts"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              paths: [{ name: "phaser", message: "src/domain must stay pure: no Phaser." }],
              patterns: [{ group: ["phaser/*"], message: "src/domain must stay pure: no Phaser." }],
            },
          ],
        },
      },
    ],
  },

  // `vp fmt` and `vp check` (Oxfmt). Code only: prose, records and workflows are left as written.
  fmt: {
    ignorePatterns: [
      ...generated,
      "**/*.md",
      "docs/**",
      ".kiro/**",
      ".github/**",
      "public/**",
      "package-lock.json",
    ],
  },
});
