import { generateText } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { withThinkingLevel } from "./providers";

describe("withThinkingLevel", () => {
  it("sends the thinking level with every call", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: {
        content: [{ type: "text", text: "ok" }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
          outputTokens: { total: 1, text: 1, reasoning: undefined },
        },
        warnings: [],
      },
    });
    await generateText({ model: withThinkingLevel(model, "minimal"), prompt: "Hi" });
    expect(model.doGenerateCalls[0].providerOptions).toEqual({ google: { thinkingConfig: { thinkingLevel: "minimal" } } });
  });
});
