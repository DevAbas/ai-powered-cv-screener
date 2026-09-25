import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "@/components/ui/recipe";

export interface StatusScreenProps {
  icon: LucideIcon;
  /**
   * Colour on the icon only, as for state lines (DESIGN.md, Components: States).
   * @default "neutral"
   */
  tone?: "neutral" | "error";
  title: string;
  /** One plain-language line. */
  children: ReactNode;
  /** A way out: retry, or a link home. */
  action?: ReactNode;
}

/** A whole screen that says what happened, when there is no page to show: an error, or nothing at this address. */
export function StatusScreen({ icon: Icon, tone = "neutral", title, children, action }: StatusScreenProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-gutter py-16 text-center">
      {/* DESIGN.md `icon`, `state-icon-error` */}
      <Icon aria-hidden className={cx("size-6", tone === "error" ? "text-error" : "text-on-surface-variant")} />
      <h1 className="text-headline-lg leading-headline-lg tracking-headline-lg font-(weight:--font-weight-headline-lg) text-on-surface">{title}</h1>
      <p className="max-w-reading text-body-md leading-body-md text-on-surface-variant">{children}</p>
      {action && <div className="mt-3">{action}</div>}
    </main>
  );
}
