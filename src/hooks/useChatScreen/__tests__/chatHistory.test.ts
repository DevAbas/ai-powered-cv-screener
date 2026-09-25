import { describe, expect, it } from "vitest";
import { AskRequestSchema, HISTORY_ANSWER_MAX } from "@/contracts";
import { answerAsText } from "@/lib/conversation";
import { ANSWERS } from "@/mocks/answers";
import { HISTORY_LIMIT, historyFrom } from "../chatHistory";
import type { ExchangeState } from "../chatState";

const exchange = (id: string, overrides: Partial<ExchangeState> = {}): ExchangeState => ({
  id,
  question: `Question ${id}`,
  status: "answered",
  steps: [],
  slow: false,
  text: ANSWERS.filter.text,
  view: ANSWERS.filter.view,
  sources: ANSWERS.filter.sources,
  matched: ANSWERS.filter.matched,
  answeredBy: ANSWERS.filter.answeredBy,
  ...overrides,
});

describe("historyFrom", () => {
  it("keeps answered exchanges, with their text, their view in words and the candidates it showed", () => {
    const history = historyFrom([
      exchange("a"),
      exchange("b", { status: "error", text: "", view: undefined }),
      exchange("c", { status: "stopped" }),
      exchange("d", { text: ANSWERS.empty.text, view: ANSWERS.empty.view, sources: [] }),
    ]);
    expect(history).toEqual([
      {
        question: "Question a",
        answer: answerAsText(ANSWERS.filter.text, ANSWERS.filter.view),
        candidateIds: ["jane-doe", "lena-novak", "sofia-almeida", "leon-fischer"],
      },
      { question: "Question d", answer: `${ANSWERS.empty.text}\n\n${ANSWERS.empty.view?.kind === "status" ? ANSWERS.empty.view.lead : ""}`, candidateIds: [] },
    ]);
    expect(history[0]?.answer).toContain("There are 4 candidates with React and TypeScript experience. Here are their details.\n- Jane Doe — Frontend Lead — React 8 yrs — TypeScript 8 yrs (CV p. 1)");
  });

  it("keeps an answer that is only a view, as its lines", () => {
    const [turn] = historyFrom([exchange("a", { text: "", view: ANSWERS.count.view, sources: ANSWERS.count.sources })]);
    expect(turn?.answer.startsWith("Out of 30 candidates, there are 6 with Python experience. Here are their details.\n- Jonas Weber")).toBe(true);
  });

  it("shortens a long answer to what the request allows", () => {
    const [turn] = historyFrom([exchange("a", { text: "x".repeat(HISTORY_ANSWER_MAX + 50) })]);
    expect(turn.answer).toHaveLength(HISTORY_ANSWER_MAX);
    expect(turn.answer.endsWith("…")).toBe(true);
  });

  it("keeps the last exchanges within the request's limit", () => {
    const many = Array.from({ length: HISTORY_LIMIT + 3 }, (_, i) => exchange(String(i)));
    const history = historyFrom(many);
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history[0].question).toBe("Question 3");
    expect(AskRequestSchema.safeParse({ question: "q", history }).success).toBe(true);
  });
});
