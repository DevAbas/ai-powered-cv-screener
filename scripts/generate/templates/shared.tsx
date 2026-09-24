import { Document, Font, Image } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { CandidateSeed } from "@/contracts/candidate";

// Parts every template variant shares.

// No automatic hyphenation: a word split across lines ("ex- pertise",
// "Lin- ux") reaches the indexer as two fragments.
Font.registerHyphenationCallback((word) => [word]);

/** Fixed metadata so the same seed and photo render the same bytes. */
export const FIXED_DATE = new Date("2026-01-01T00:00:00Z");

export interface TemplateProps {
  seed: CandidateSeed;
  /** JPEG bytes, or undefined when the photo step produced none. */
  photo: Buffer | undefined;
}

export function CvDocument({ seed, children }: { seed: CandidateSeed; children: ReactNode }) {
  return (
    <Document
      title={`${seed.name} - CV`}
      author={seed.name}
      subject={seed.headline}
      creator="cv-screener generate"
      producer="react-pdf"
      creationDate={FIXED_DATE}
      modificationDate={FIXED_DATE}
    >
      {children}
    </Document>
  );
}

/** The candidate's photo in the header, a rounded square; nothing when there is none. */
export function Photo({ photo, size }: { photo: Buffer | undefined; size: number }) {
  if (!photo) return null;
  // A react-pdf Image is not a DOM <img>: it has no alt prop.
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image src={{ data: photo, format: "jpg" }} style={{ width: size, height: size, borderRadius: 8 }} />;
}
