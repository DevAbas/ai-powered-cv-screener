import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import { StatusScreen } from "@/components/StatusScreen";
import { Link } from "@/components/ui/Link";

export const metadata: Metadata = { title: "Not found – CV Screener" };

/** Unmatched routes get the same quiet screen as the app, not the default 404. */
export default function NotFound() {
  return (
    <StatusScreen icon={SearchX} title="There is nothing at this address" action={<Link href="/">Back to the screener</Link>}>
      The page you asked for does not exist.
    </StatusScreen>
  );
}
