import { z } from "zod";

// How a question is retrieved for (the reference repo's query plan): a new
// search, a narrowing of the previous answer's candidates, or one named
// person. Planned by rules when they are clear, otherwise by the model.

export const QUERY_INTENTS = ["search", "refine", "lookup"] as const;
export const QueryIntentSchema = z.enum(QUERY_INTENTS);
export type QueryIntent = z.infer<typeof QueryIntentSchema>;

/**
 * The model's plan. Every field is required and `candidateName` is empty
 * rather than null: strict providers reject optional fields, and plain
 * strings are the one shape every provider accepts.
 */
export const QueryPlanSchema = z.object({
  intent: QueryIntentSchema,
  searchQuery: z
    .string()
    .describe("Standalone English retrieval query that includes all active skill/criteria constraints from the conversation"),
  candidateName: z.string().describe("Person name mentioned for a profile lookup (partial OK), or an empty string"),
});
export type QueryPlan = z.infer<typeof QueryPlanSchema>;
