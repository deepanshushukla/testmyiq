import path from "node:path";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Next's own .mdx support (@next/mdx, next.config.ts) only covers its
  // webpack/Turbopack build — Vitest runs on Vite, so content/blog/*.mdx
  // needs this separate Vite-side plugin to be importable from tests too
  // (e.g. tests/unit/seo-metadata.test.ts dynamically importing real posts).
  plugins: [mdx(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    exclude: ["node_modules", "tests/e2e/**"],
    // Integration tests share one real Postgres/Redis instance; running
    // test files in parallel lets one file's cleanup wipe rows another
    // file's test just created. Keep this sequential rather than add
    // per-test namespacing complexity for a suite this size.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
