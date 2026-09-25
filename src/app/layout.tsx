import type { Metadata } from "next";
import { googleSans, googleSansFlex } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "CV Screener",
  description: "Ask questions about the candidate pool and verify every answer in the source CV.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${googleSans.variable} ${googleSansFlex.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
