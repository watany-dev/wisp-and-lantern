import { defineConfig } from "vite";

const buildSha = process.env.VITE_BUILD_SHA ?? "dev";

export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  build: {
    target: "es2020",
    assetsInlineLimit: 0,
    // Phaser alone is over 1 MB; scripts/check-size.mjs enforces the real budget.
    chunkSizeWarningLimit: 1600,
  },
  plugins: [
    {
      name: "build-sha-meta",
      transformIndexHtml: () => [
        { tag: "meta", attrs: { name: "build", content: buildSha }, injectTo: "head" },
      ],
    },
  ],
});
