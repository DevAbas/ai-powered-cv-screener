import { describe, expect, it } from "vitest";
import { getCandidatesInput, searchCvTextInput } from "@/contracts";
import { vocabularyOf } from "@/lib/candidates";
import { LENA, TEST_INDEX } from "@/mocks/sampleIndex";
import { modelSchema, withoutConstraints } from "../modelSchema";

const vocabulary = vocabularyOf(TEST_INDEX);

describe("modelSchema", () => {
  it("sends the model the contract without length, range and pattern keywords, with closed objects", async () => {
    const json = JSON.stringify(await modelSchema(searchCvTextInput(vocabulary)).jsonSchema);
    for (const keyword of ["minLength", "maxLength", "minimum", "maximum", "minItems", "maxItems", "pattern"]) expect(json).not.toContain(`"${keyword}"`);
    expect(json).toContain('"query"');
    expect(json).toContain('"additionalProperties":false');
  });

  it("still validates every call against the contract", () => {
    const schema = modelSchema(getCandidatesInput(vocabulary));
    expect(schema.validate!({ ids: [] })).toMatchObject({ success: false });
    expect(schema.validate!({ ids: ["nobody"] })).toMatchObject({ success: false });
    expect(schema.validate!({ ids: [LENA.id] })).toMatchObject({ success: true, value: { ids: [LENA.id] } });
  });

  it("keeps property names that look like keywords", () => {
    expect(withoutConstraints({ type: "object", properties: { pattern: { type: "string", minLength: 1 } }, required: ["pattern"] })).toEqual({
      type: "object",
      properties: { pattern: { type: "string" } },
      required: ["pattern"],
      additionalProperties: false,
    });
  });
});
