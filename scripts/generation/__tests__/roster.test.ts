import { describe, expect, it } from "vitest";
import { ROLES } from "@/contracts";
import { MOCK_POOL } from "@/mocks/pool";
import { EU_COUNTRIES, ROLE_MIX, ROSTER } from "../roster";
import { isWinAnsi, slugOf } from "../seedRules";

describe("roster", () => {
  it("has 30 candidates with unique ids and names", () => {
    expect(ROSTER).toHaveLength(30);
    expect(new Set(ROSTER.map((c) => c.id)).size).toBe(30);
    expect(new Set(ROSTER.map((c) => c.name)).size).toBe(30);
  });

  it("derives every id from the name", () => {
    for (const c of ROSTER) expect(c.id).toBe(slugOf(c.name));
  });

  it("matches ROLE_MIX, role by role, and totals 30", () => {
    for (const role of ROLES) {
      expect(ROSTER.filter((c) => c.role === role).length, role).toBe(ROLE_MIX[role]);
    }
    expect(Object.values(ROLE_MIX).reduce((a, b) => a + b, 0)).toBe(30);
  });

  it("places everyone in an EU country", () => {
    for (const c of ROSTER) {
      const country = c.location.split(", ").at(-1);
      expect(EU_COUNTRIES, c.location).toContain(country);
    }
  });

  it("uses only characters the PDF fonts can print", () => {
    for (const c of ROSTER) {
      for (const text of [c.name, c.headline, c.location]) expect(isWinAnsi(text), text).toBe(true);
    }
  });

  it("is mirrored by the mock pool", () => {
    expect(MOCK_POOL.map((c) => ({ id: c.id, ...c.profile }))).toEqual(
      ROSTER.map((c) => ({ id: c.id, name: c.name, headline: c.headline, role: c.role, seniority: c.seniority, location: c.location })),
    );
  });
});
