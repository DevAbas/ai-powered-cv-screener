import { describe, expect, it } from "vitest";
import { TEST_INDEX } from "@/mocks/sampleIndex";
import { splitLocation, vocabularyOf } from "../poolVocabulary";

describe("splitLocation", () => {
  it("takes the last part as the country", () => {
    expect(splitLocation("Berlin, Germany")).toEqual({ city: "Berlin", country: "Germany" });
    expect(splitLocation("Luxembourg, Luxembourg")).toEqual({ city: "Luxembourg", country: "Luxembourg" });
    expect(splitLocation("Remote")).toEqual({ city: "Remote", country: "Remote" });
  });
});

describe("vocabularyOf", () => {
  const vocab = vocabularyOf(TEST_INDEX);

  it("collects the pool's values once each, sorted", () => {
    expect(vocab.candidateIds).toEqual(["andrei-popescu", "elena-georgiou", "lena-novak"]);
    expect(vocab.skills).toEqual(["Go", "HTML/CSS", "Java", "PostgreSQL", "Python", "React", "TypeScript"]);
    expect(vocab.countries).toEqual(["Germany", "Greece", "Romania"]);
    expect(vocab.cities).toEqual(["Athens", "Berlin", "Bucharest"]);
    expect(vocab.roles).toEqual(["backend", "frontend"]);
    expect(vocab.degrees).toEqual(["bachelor", "master"]);
    expect(vocab.workModes).toEqual(["hybrid", "onsite", "remote"]);
    expect(vocab.certifications).toEqual(["AWS Certified Developer - Associate"]);
  });

  it("lists every step of the ordered scales", () => {
    expect(vocab.seniorities).toEqual(["junior", "mid", "senior", "lead", "principal"]);
    expect(vocab.levels).toEqual(["A1", "A2", "B1", "B2", "C1", "C2", "native"]);
  });
});
