import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Scene files import the engine as `continuity` (the ct launcher aliases it the same way).
    alias: { continuity: fileURLToPath(new URL("./src/index.ts", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 120_000,
  },
});
