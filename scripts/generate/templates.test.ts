import { inflateSync } from "node:zlib";
import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import type { CandidateSeed } from "@/contracts/candidate";
import { countPdfPages, MAX_PAGES } from "./pdf";
import { TEMPLATE_COUNT, renderTemplate } from "./templates";

const seed: CandidateSeed = {
  name: "Lena Novak",
  headline: "Senior Frontend Engineer",
  role: "frontend",
  seniority: "senior",
  location: "Berlin, Germany",
  remote: ["hybrid", "remote"],
  workAuthorization: "EU citizen",
  availability: 30,
  yearsTotal: 7,
  skills: [
    { name: "React", years: 6 },
    { name: "TypeScript", years: 5 },
    { name: "Next.js", years: 3 },
    { name: "Node.js", years: 4 },
    { name: "GraphQL" },
    { name: "Jest", years: 4 },
    { name: "CSS", years: 7 },
  ],
  languages: [
    { language: "German", level: "native" },
    { language: "English", level: "C1" },
  ],
  education: [{ degree: "bachelor", field: "Computer Science", institution: "Technical University of Berlin", year: 2019 }],
  employment: [
    {
      company: "Nordwind Labs",
      title: "Senior Frontend Engineer",
      industry: "E-commerce",
      from: "2022-03",
      to: null,
      description: "Online marketplace for outdoor equipment.",
      stack: ["React", "TypeScript", "Next.js", "Jest"],
      highlights: ["Led the migration to Next.js", "Built the design system in React and TypeScript", "Mentored two engineers"],
    },
    {
      company: "Brightline Software",
      title: "Frontend Engineer",
      industry: "SaaS",
      from: "2019-07",
      to: "2022-02",
      description: "Customer portal for a B2B invoicing product.",
      stack: ["ReactJS", "Node.js", "GraphQL"],
      highlights: ["Shipped the React customer portal", "Introduced Jest test coverage"],
    },
  ],
  skillGroups: [
    { label: "Languages", skills: ["TypeScript", "CSS"] },
    { label: "Frameworks and Libraries", skills: ["React", "Next.js", "Node.js", "GraphQL"] },
    { label: "Testing", skills: ["Jest"] },
  ],
  leadership: { has: false, note: "" },
  certifications: ["AWS Certified Cloud Practitioner"],
  summary:
    "Senior frontend engineer with 7 years of experience in React and TypeScript, most recently leading a migration to Next.js at an e-commerce company.",
  contact: { email: "lena.novak@example.com", phone: "+1-555-001-0101" },
  photoPrompt: "A woman in her early thirties with shoulder-length brown hair and a calm smile.",
  template: 0,
};

/** Every content stream, inflated: where the page text lives. */
function contentStreams(pdf: Buffer): string {
  const text = pdf.toString("latin1");
  const parts: string[] = [];
  const pattern = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    const raw = Buffer.from(match[1], "latin1");
    try {
      parts.push(inflateSync(raw).toString("latin1"));
    } catch {
      parts.push(match[1]);
    }
  }
  // Kerning splits a string into hex runs: `<4c65> 15 <6e61>`; join them.
  return parts.join("\n").replace(/>\s*-?\d+(?:\.\d+)?\s*</g, "");
}

/** How pdfkit writes a string with a standard font: hex-encoded WinAnsi bytes. */
const hex = (s: string) => Buffer.from(s, "latin1").toString("hex");

describe("templates", () => {
  it.each(Array.from({ length: TEMPLATE_COUNT }, (_, i) => i))("template %i renders real text within the page limit", async (template) => {
    const pdf = await renderToBuffer(renderTemplate({ ...seed, template }, undefined));
    const pages = countPdfPages(pdf);
    expect(pages).toBeGreaterThanOrEqual(1);
    expect(pages).toBeLessThanOrEqual(MAX_PAGES);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.toString("latin1")).toContain("(Lena Novak - CV)");
    // Real text, not outlines: the headline and an employer are drawn as text.
    const streams = contentStreams(pdf).toLowerCase();
    expect(streams).toContain(hex("Senior Frontend Engineer").toLowerCase());
    expect(streams).toContain(hex("Nordwind Labs").toLowerCase());
    expect(streams).toContain(hex("Page 1 | 1").toLowerCase());
  });

  it("renders the same bytes for the same input", async () => {
    const a = await renderToBuffer(renderTemplate(seed, undefined));
    const b = await renderToBuffer(renderTemplate(seed, undefined));
    expect(a.equals(b)).toBe(true);
  });
});
