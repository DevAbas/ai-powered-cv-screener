import { tool } from "ai";
import { ReportStatusInputSchema, ShowCandidatesInputSchema, ShowComparisonInputSchema, ShowProfileInputSchema } from "@/contracts/view";

// The view tools the answer model may call, at most one per answer (DESIGN.md,
// Answer views). None has an `execute`: the call ends the model's turn, and
// the server builds the view from it (views.ts), so no second model call.

export const VIEW_TOOLS = {
  show_candidates: tool({
    description:
      "Show candidates as rows: for who has something, how many do, a ranking, or one fact about one candidate (one row). The app adds each name, title and the skills' years from the CV.",
    inputSchema: ShowCandidatesInputSchema,
  }),
  show_comparison: tool({
    description: "Show two candidates side by side. The app adds their facts from the CVs.",
    inputSchema: ShowComparisonInputSchema,
  }),
  show_profile: tool({
    description: "Show one candidate's profile. The app adds the facts from the CV.",
    inputSchema: ShowProfileInputSchema,
  }),
  report_status: tool({
    description: "Mark an answer that finds nobody, that the CVs can't give, or that isn't about the candidates.",
    inputSchema: ReportStatusInputSchema,
  }),
};
