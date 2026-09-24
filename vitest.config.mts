import { defineConfig } from "vitest/config";

// `server-only` marks modules Next keeps out of client bundles; Next resolves
// it itself (Next docs, Data security). Here it is an empty module, as
// Next's own Jest preset maps it.
const serverOnly = {
  name: "server-only",
  resolveId: (id: string) => (id === "server-only" ? "\0server-only" : null),
  load: (id: string) => (id === "\0server-only" ? "export {}" : null),
};

export default defineConfig({
  plugins: [serverOnly],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
