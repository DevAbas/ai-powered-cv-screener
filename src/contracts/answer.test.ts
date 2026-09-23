import { describe, expect, it } from "vitest";
import type { Answer, AnswerKind } from "./answer";
import { ANSWER_KINDS, AnswerSchema } from "./answer";

const candidate = { candidateId: "lena-novak", name: "Lena Novak", reason: "5 years of React", page: 1 };
const comparison = {
  candidateIds: ["ali-hasanov", "nigar-aliyeva"],
  rows: [{ criterion: "Backend years", a: "6", b: "4" }],
};
const fact = { text: "Lena last worked at Acme.", candidateId: "lena-novak", page: 1 };
const profile = {
  candidateId: "lena-novak",
  headline: "Senior Frontend Engineer",
  sections: [{ title: "Skills", items: ["React", "TypeScript"] }],
};

const VALID: Record<AnswerKind, Answer> = {
  filter: { kind: "filter", summary: "1 candidate has React.", candidates: [candidate] },
  rank: { kind: "rank", summary: "Top 1.", candidates: [candidate] },
  compare: { kind: "compare", summary: "Ali has more backend years.", comparison },
  fact: { kind: "fact", summary: "Acme.", fact },
  profile: { kind: "profile", summary: "Senior frontend engineer.", profile },
  count: { kind: "count", summary: "7 candidates know Python.", count: 7 },
  empty: { kind: "empty", summary: "No candidate knows Rust." },
  insufficient: { kind: "insufficient", summary: "The CVs do not say." },
  out_of_scope: { kind: "out_of_scope", summary: "I can only answer questions about the CVs." },
};

// One invalid sample per kind: its required payload is missing or broken.
const INVALID: Record<AnswerKind, unknown> = {
  filter: { kind: "filter", summary: "None.", candidates: [] },
  rank: { kind: "rank", summary: "Top 3." },
  compare: {
    kind: "compare",
    summary: "Same person.",
    comparison: { ...comparison, candidateIds: ["ali-hasanov", "ali-hasanov"] },
  },
  fact: { kind: "fact", summary: "Acme.", candidates: [candidate] },
  profile: { kind: "profile", summary: "Profile.", profile: { ...profile, sections: [] } },
  count: { kind: "count", summary: "Some." },
  empty: { kind: "empty", summary: "No match.", candidates: [candidate] },
  insufficient: { kind: "insufficient", summary: "Unknown.", fact },
  out_of_scope: { kind: "out_of_scope", summary: "Weather.", count: 0 },
};

describe("AnswerSchema", () => {
  it.each(ANSWER_KINDS)("accepts a valid %s answer", (kind) => {
    expect(AnswerSchema.safeParse(VALID[kind]).success).toBe(true);
  });

  it.each(ANSWER_KINDS)("rejects an invalid %s answer", (kind) => {
    expect(AnswerSchema.safeParse(INVALID[kind]).success).toBe(false);
  });

  it("accepts a count answer that also lists the candidates", () => {
    const answer = { ...VALID.count, count: 1, candidates: [candidate] };
    expect(AnswerSchema.safeParse(answer).success).toBe(true);
  });

  it("rejects fields that belong to another kind", () => {
    const result = AnswerSchema.safeParse({ ...VALID.filter, fact });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["fact"]);
  });

  it("rejects a comparison of more than two candidates", () => {
    const answer = { ...VALID.compare, comparison: { ...comparison, candidateIds: ["a", "b", "c"] } };
    expect(AnswerSchema.safeParse(answer).success).toBe(false);
  });

  it("rejects page 0 and unknown kinds", () => {
    expect(AnswerSchema.safeParse({ ...VALID.filter, candidates: [{ ...candidate, page: 0 }] }).success).toBe(false);
    expect(AnswerSchema.safeParse({ kind: "guess", summary: "x" }).success).toBe(false);
  });
});
