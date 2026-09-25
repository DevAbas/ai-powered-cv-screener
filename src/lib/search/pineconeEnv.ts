import { z } from "zod";

// Server environment, validated where it is read: a missing or malformed
// variable fails with a message that says what to set, not deep inside an SDK.

const MISSING_KEY = "PINECONE_API_KEY is not set. Add it to .env.local (see .env.example).";

const PineconeEnvSchema = z.object({
  PINECONE_API_KEY: z.string({ error: MISSING_KEY }).min(1, MISSING_KEY),
  PINECONE_INDEX: z.string().regex(/^[a-z0-9-]+$/, "PINECONE_INDEX must be lowercase letters, digits and hyphens.").default("cv-screener"),
});
export type PineconeEnv = z.infer<typeof PineconeEnvSchema>;

/** The Pinecone settings; throws with every problem listed. */
export function pineconeEnv(env: Readonly<Record<string, string | undefined>> = process.env): PineconeEnv {
  const parsed = PineconeEnvSchema.safeParse({ PINECONE_API_KEY: env.PINECONE_API_KEY || undefined, PINECONE_INDEX: env.PINECONE_INDEX || undefined });
  if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
  return parsed.data;
}
