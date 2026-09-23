import { z } from "zod";
import { CandidateIdSchema } from "./candidate";

// Answer envelope (PLAN, Data model). Flat, because Gemini structured output does
// not accept `z.union`; per-kind rules live in `superRefine`.

export const ANSWER_KINDS = [
  "filter",
  "rank",
  "compare",
  "fact",
  "profile",
  "count",
  "empty",
  "insufficient",
  "out_of_scope",
] as const;
export const AnswerKindSchema = z.enum(ANSWER_KINDS);
export type AnswerKind = z.infer<typeof AnswerKindSchema>;

const PageSchema = z.number().int().min(1).describe("1-based page of the CV that supports this");

export const AnswerCandidateSchema = z.object({
  candidateId: CandidateIdSchema,
  name: z.string().min(1),
  reason: z.string().min(1),
  page: PageSchema,
});
export type AnswerCandidate = z.infer<typeof AnswerCandidateSchema>;

export const ComparisonSchema = z.object({
  // An array, not z.tuple: tuples become `prefixItems`, outside Gemini's schema subset.
  candidateIds: z.array(CandidateIdSchema).length(2),
  rows: z
    .array(
      z.object({
        criterion: z.string().min(1),
        a: z.string(),
        b: z.string(),
      }),
    )
    .min(1),
});
export type Comparison = z.infer<typeof ComparisonSchema>;

export const FactSchema = z.object({
  text: z.string().min(1),
  candidateId: CandidateIdSchema,
  page: PageSchema,
});
export type Fact = z.infer<typeof FactSchema>;

export const ProfileSummarySchema = z.object({
  candidateId: CandidateIdSchema,
  headline: z.string().min(1),
  sections: z
    .array(
      z.object({
        title: z.string().min(1),
        items: z.array(z.string().min(1)),
      }),
    )
    .min(1),
});
export type ProfileSummary = z.infer<typeof ProfileSummarySchema>;

type PayloadField = "candidates" | "comparison" | "fact" | "profile" | "count";

const PAYLOAD_FIELDS: readonly PayloadField[] = [
  "candidates",
  "comparison",
  "fact",
  "profile",
  "count",
];

const RULES: Record<AnswerKind, { required: readonly PayloadField[]; allowed: readonly PayloadField[] }> = {
  filter: { required: ["candidates"], allowed: ["candidates"] },
  rank: { required: ["candidates"], allowed: ["candidates"] },
  compare: { required: ["comparison"], allowed: ["comparison"] },
  fact: { required: ["fact"], allowed: ["fact"] },
  profile: { required: ["profile"], allowed: ["profile"] },
  count: { required: ["count"], allowed: ["count", "candidates"] },
  empty: { required: [], allowed: [] },
  insufficient: { required: [], allowed: [] },
  out_of_scope: { required: [], allowed: [] },
};

const quoted = (kinds: readonly AnswerKind[]) => kinds.map((k) => `"${k}"`).join(" or ");

/**
 * The per-kind rule for one payload field, in words. `superRefine` enforces
 * RULES; this puts the same rules into the JSON Schema the model sees, where
 * `superRefine` does not appear.
 */
function fieldRule(field: PayloadField, note?: string): string {
  const required = ANSWER_KINDS.filter((k) => RULES[k].required.includes(field));
  const optional = ANSWER_KINDS.filter((k) => RULES[k].allowed.includes(field) && !RULES[k].required.includes(field));
  return [
    `Required when kind is ${quoted(required)}.`,
    optional.length ? `Optional when kind is ${quoted(optional)}.` : "",
    "Omit for every other kind.",
    note ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

function kindRule(kind: AnswerKind): string {
  const { required, allowed } = RULES[kind];
  if (allowed.length === 0) return `${kind}: summary only; no candidates, comparison, fact, profile or count.`;
  const optional = allowed.filter((f) => !required.includes(f));
  return `${kind}: requires ${required.join(", ")}${optional.length ? `; may include ${optional.join(", ")}` : ""}; nothing else.`;
}

/** The per-kind rules as prompt text, for every call that asks a model for an Answer. */
export const ANSWER_KIND_RULES = [
  "Every answer has kind and summary. Payload fields by kind:",
  ...ANSWER_KINDS.map((k) => `- ${kindRule(k)}`),
  "filter and rank list at least one candidate; rank lists them best first.",
].join("\n");

export const AnswerSchema = z
  .object({
    kind: AnswerKindSchema.describe(`Answer shape. ${ANSWER_KINDS.map(kindRule).join(" ")}`),
    summary: z.string().min(1).describe("One-line answer to the question"),
    candidates: z
      .array(AnswerCandidateSchema)
      .optional()
      .describe(fieldRule("candidates", "At least one entry for filter and rank; rank lists best first.")),
    comparison: ComparisonSchema.optional().describe(fieldRule("comparison")),
    fact: FactSchema.optional().describe(fieldRule("fact")),
    profile: ProfileSummarySchema.optional().describe(fieldRule("profile")),
    count: z.number().int().min(0).optional().describe(fieldRule("count")),
  })
  .superRefine((answer, ctx) => {
    const rule = RULES[answer.kind];
    for (const field of PAYLOAD_FIELDS) {
      const present = answer[field] !== undefined;
      if (rule.required.includes(field) && !present) {
        ctx.addIssue({ code: "custom", path: [field], message: `Required for kind "${answer.kind}"` });
      } else if (!rule.allowed.includes(field) && present) {
        ctx.addIssue({ code: "custom", path: [field], message: `Not allowed for kind "${answer.kind}"` });
      }
    }
    if ((answer.kind === "filter" || answer.kind === "rank") && answer.candidates?.length === 0) {
      ctx.addIssue({ code: "custom", path: ["candidates"], message: "Must list at least one candidate" });
    }
    const ids = answer.comparison?.candidateIds;
    if (ids && ids[0] === ids[1]) {
      ctx.addIssue({ code: "custom", path: ["comparison", "candidateIds"], message: "Must be two different candidates" });
    }
  });
export type Answer = z.infer<typeof AnswerSchema>;
