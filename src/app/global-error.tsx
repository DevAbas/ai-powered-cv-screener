"use client";

import { CircleAlert } from "lucide-react";
import { useEffect } from "react";
import { StatusScreen } from "@/components/StatusScreen";
import { Button } from "@/components/ui/Button";
import { googleSans } from "./fonts";
import "./globals.css";

/** Errors in the root layout itself: this replaces the whole document, so it brings its own html, font and styles. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className={`${googleSans.variable} h-full`}>
      <body className="min-h-full">
        <title>Something went wrong – CV Screener</title>
        <StatusScreen icon={CircleAlert} tone="error" title="Something went wrong" action={<Button variant="primary" onClick={() => retry()}>Try again</Button>}>
          The screener hit an error it could not recover from. Trying again usually helps.
        </StatusScreen>
      </body>
    </html>
  );
}
