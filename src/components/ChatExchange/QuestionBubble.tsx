import type { ReactNode } from "react";

export interface QuestionBubbleProps {
  children: ReactNode;
}

/**
 * The recruiter's question, right-aligned on a mint tint. DESIGN.md
 * `question`: `rounded.xl` is half the one-line height, so one line has fully
 * round ends and a single character is a circle.
 */
export function QuestionBubble({ children }: QuestionBubbleProps) {
  return (
    <h2 className="flex max-w-question min-w-10 justify-center self-end rounded-xl bg-primary-container px-4 py-2 text-body-md text-on-primary-container">
      {children}
    </h2>
  );
}
