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
    // The model names come from the environment (lib/models/modelEnv.ts); the tests get fixed ones.
    env: { ANSWER_MODEL: "test-answer-model", EMBEDDING_MODEL: "test-embedding-model", IMAGE_MODEL: "test-image-model" },
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
