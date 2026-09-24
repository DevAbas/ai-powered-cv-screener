"use client";

import { CircleAlert } from "lucide-react";
import { useEffect } from "react";
import { StatusScreen } from "@/components/StatusScreen";
import { Button } from "@/components/ui/Button";

/** Uncaught errors in the screener show a plain message and a way to retry (PRD, States), never a broken page. */
export default function ScreenerError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen icon={CircleAlert} tone="error" title="Something went wrong" action={<Button variant="primary" onClick={() => retry()}>Try again</Button>}>
      The screener hit an error it could not recover from. Trying again usually helps.
    </StatusScreen>
  );
}
