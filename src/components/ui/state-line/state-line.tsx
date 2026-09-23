import { CircleAlert, Info, SearchX, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import type { RecipeVariantProps } from "@/theme/define-recipe";
import { stateLineSlotRecipe } from "@/theme/recipes/state-line";

type StateLineStatus = NonNullable<RecipeVariantProps<typeof stateLineSlotRecipe>["status"]>;

const INDICATORS: Record<StateLineStatus, { icon: LucideIcon; label: string }> = {
  empty: { icon: SearchX, label: "No match" },
  insufficient: { icon: TriangleAlert, label: "Not enough information" },
  "out-of-scope": { icon: Info, label: "Outside the pool" },
  error: { icon: CircleAlert, label: "Error" },
};

export interface StateLineProps extends Omit<ComponentProps<"div">, "children"> {
  /**
   * Which uncertainty state this line reports (PRD, UX principles: uncertainty is visible).
   * @default "empty"
   */
  status?: StateLineStatus | undefined;
  children: ReactNode;
  /** An action after the text, such as Retry. */
  action?: ReactNode;
}

/** Empty, insufficient, out-of-scope or error: one line of text with a small leading icon. */
export function StateLine({ status = "empty", children, action, className, ...rest }: StateLineProps) {
  const styles = stateLineSlotRecipe({ status });
  const { icon: Icon, label } = INDICATORS[status];
  return (
    <div role={status === "error" ? "alert" : undefined} {...rest} className={styles.root({ className })}>
      <Icon aria-hidden className={styles.indicator()} />
      <p className={styles.text()}>
        <span className="sr-only">{label}: </span>
        {children}
      </p>
      {action}
    </div>
  );
}
