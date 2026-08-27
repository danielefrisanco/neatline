import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // SVG snapshots are read by humans; keep them unescaped and unwrapped.
    snapshotFormat: {
      escapeString: false,
      printBasicPrototype: false,
    },
  },
});
