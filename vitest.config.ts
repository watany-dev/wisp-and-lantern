import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      // Enabled by `npm test` (`vitest run --coverage`), so filtered runs such as
      // `npx vitest run pbt` are not held to the thresholds.
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
});
