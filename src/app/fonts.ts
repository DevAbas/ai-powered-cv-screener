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

// DESIGN.md, Typography: the headline's leading words in Google Sans Flex,
// the family's variable cut, for its light weight; Google Sans itself is
// served from 400 up. Same latin subset and licence (./fonts/OFL.txt).
export const googleSansFlex = localFont({
  src: "./fonts/google-sans-flex-latin.woff2",
  weight: "100 1000",
  style: "normal",
  variable: "--font-google-sans-flex",
});
