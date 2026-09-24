import type { Answer, AnswerCandidate } from "@/contracts/answer";

// Plain-text form of an answer for "copy an answer" (PRD, Core flow: Exit).

const source = (name: string, page: number) => `(${name}, CV p. ${page})`;

function candidateLines(candidates: readonly AnswerCandidate[], ordered: boolean): string[] {
  return candidates.map((c, i) => `${ordered ? `${i + 1}.` : "-"} ${c.name}: ${c.reason} ${source(c.name, c.page)}`);
}

/** `nameOf` resolves a candidate id to a display name (compare, fact and profile carry ids only). */
export function answerToText(answer: Answer, nameOf: (id: string) => string): string {
  const lines = [answer.summary];
  switch (answer.kind) {
    case "filter":
    case "rank":
    case "count":
      if (answer.candidates?.length) lines.push("", ...candidateLines(answer.candidates, answer.kind === "rank"));
      break;
    case "compare": {
      const comparison = answer.comparison;
      if (!comparison) break;
      const [a, b] = comparison.candidateIds.map(nameOf);
      lines.push("", ...comparison.rows.map((r) => `${r.criterion}: ${a}: ${r.a}; ${b}: ${r.b}`));
      break;
    }
    case "fact":
      if (answer.fact) lines.push("", `${answer.fact.text} ${source(nameOf(answer.fact.candidateId), answer.fact.page)}`);
      break;
    case "profile":
      if (!answer.profile) break;
      lines.push("", answer.profile.headline);
      for (const section of answer.profile.sections) {
        lines.push("", `${section.title}:`, ...section.items.map((item) => `- ${item}`));
      }
      break;
    case "empty":
    case "insufficient":
    case "out_of_scope":
      break;
  }
  return lines.join("\n");
}
