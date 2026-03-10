import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "forks",
    testTimeout: 30_000,
    hookTimeout: 30_000,
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/index.ts"],
    },
  },
});
