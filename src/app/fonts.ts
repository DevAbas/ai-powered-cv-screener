import localFont from "next/font/local";

// DESIGN.md, Typography: Google Sans, self-hosted. The file is the latin
// subset Google Fonts serves (variable, wght 400–700; licence in ./fonts/OFL.txt).
// next/font/local rather than next/font/google: Next's precalculated fallback
// metrics do not include Google Sans, while the local loader measures the file
// itself and generates a size-adjusted fallback to avoid layout shift.
export const googleSans = localFont({
  src: "./fonts/google-sans-latin.woff2",
  weight: "400 700",
  style: "normal",
  variable: "--font-google-sans",
});
