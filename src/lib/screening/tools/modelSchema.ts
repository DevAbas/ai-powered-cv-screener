import { jsonSchema } from "ai";
import type { JSONSchema7, Schema } from "ai";
import { z } from "zod";

// The schema a tool sends to the model (AI SDK docs: `jsonSchema` with a
// custom `validate`). The Zod contract still validates every call; what
// the model sees is the same contract as JSON Schema without the
// keywords some providers' grammar compilers reject when they constrain
// decoding: lengths, ranges and patterns (the provider
// serving Qwen on OpenRouter refused `minLength`). What
// those keywords enforced is checked by the contract on the way in.

/** Keywords dropped from the schema the model sees; the contract still enforces them. */
const CONSTRAINTS = new Set(["minLength", "maxLength", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "minItems", "maxItems", "uniqueItems", "pattern", "format", "multipleOf"]);
/** Keywords whose value is a schema, or a list of schemas. */
const NESTED = new Set(["items", "prefixItems", "anyOf", "oneOf", "allOf", "not", "additionalProperties"]);
/** Keywords whose value maps names to schemas: the names are not keywords. */
const NAMED = new Set(["properties", "$defs", "definitions"]);

/** The schema without its constraint keywords, objects closed as the SDK closes them for a Zod schema. */
export function withoutConstraints(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(withoutConstraints);
  if (!schema || typeof schema !== "object") return schema;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (CONSTRAINTS.has(key)) continue;
    if (NAMED.has(key)) out[key] = Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([name, sub]) => [name, withoutConstraints(sub)]));
    else if (NESTED.has(key)) out[key] = withoutConstraints(value);
    else out[key] = value;
  }
  if (out.type === "object" && typeof out.additionalProperties !== "object") out.additionalProperties = false;
  return out;
}

/** A tool's input schema: the contract validates, the model sees it without constraints. */
export function modelSchema<T extends z.ZodType>(contract: T): Schema<z.output<T>> {
  return jsonSchema<z.output<T>>(() => withoutConstraints(z.toJSONSchema(contract, { target: "draft-7", io: "input" })) as JSONSchema7, {
    validate: (value) => {
      const parsed = contract.safeParse(value);
      return parsed.success ? { success: true, value: parsed.data } : { success: false, error: parsed.error };
    },
  });
}
