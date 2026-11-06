import { defineConfig } from "vitest/config";

// .mjs because apps/web/package.json is not "type": "module" (a .ts config would load as CommonJS).
// The default environment stays "node" for the lib tests; component tests opt in to jsdom with a
// `// @vitest-environment jsdom` comment on line 1, as they already do.
export default defineConfig({
  resolve: { tsconfigPaths: true }, // "@/…" imports, same as tsconfig.json
  test: {
    setupFiles: ["./vitest.setup.ts"],
  },
});
