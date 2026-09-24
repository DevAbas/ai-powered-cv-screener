import { Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatAvailability, formatDegree, formatMonth, formatMonthNumeric, formatWorkModes } from "../pdf";
import { CvDocument, Photo } from "./shared";
import type { TemplateProps } from "./shared";

// One ATS-friendly layout: single column, real headings, no tables or
// text boxes. Three variants differ in font, heading colour, date style
// and bullet glyph, so the pool's CVs do not all look identical.

export interface AtsVariant {
  body: string;
  bold: string;
  italic: string;
  heading: string;
  accent: string;
  bullet: string;
  date: (yearMonth: string | null) => string;
  summaryTitle: string;
  skillsTitle: string;
  experienceTitle: string;
}

export const VARIANTS: readonly AtsVariant[] = [
  {
    body: "Helvetica",
    bold: "Helvetica-Bold",
    italic: "Helvetica-Oblique",
    heading: "Helvetica-Bold",
    accent: "#2E5C8A",
    bullet: "-",
    date: formatMonthNumeric,
    summaryTitle: "Profile Summary",
    skillsTitle: "Technical Skills",
    experienceTitle: "Work Experience",
  },
  {
    body: "Times-Roman",
    bold: "Times-Bold",
    italic: "Times-Italic",
    heading: "Times-Bold",
    accent: "#1F1F1F",
    bullet: "•",
    date: formatMonth,
    summaryTitle: "Summary",
    skillsTitle: "Skills",
    experienceTitle: "Experience",
  },
  {
    body: "Helvetica",
    bold: "Helvetica-Bold",
    italic: "Helvetica-Oblique",
    heading: "Helvetica-Bold",
    accent: "#2A6B5A",
    bullet: "•",
    date: formatMonth,
    summaryTitle: "Professional Summary",
    skillsTitle: "Core Skills",
    experienceTitle: "Professional Experience",
  },
];

function stylesFor(v: AtsVariant) {
  return StyleSheet.create({
    page: { fontFamily: v.body, fontSize: 10, lineHeight: 1.4, color: "#1F1F1F", paddingTop: 44, paddingBottom: 48, paddingHorizontal: 48 },
    header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
    name: { fontFamily: v.bold, fontSize: 18, lineHeight: 1.2, marginBottom: 3 },
    headline: { fontSize: 11, marginBottom: 2 },
    contact: { fontSize: 9.5, color: "#333333" },
    h2: { fontFamily: v.heading, fontSize: 13, color: v.accent, marginTop: 14, marginBottom: 6 },
    skillLine: { marginBottom: 1 },
    job: { marginBottom: 8 },
    jobHead: { flexDirection: "row", justifyContent: "space-between" },
    company: { fontFamily: v.bold, color: v.accent },
    dates: { fontFamily: v.bold, color: v.accent },
    title: { fontFamily: v.bold },
    location: { fontFamily: v.italic, color: v.accent, fontSize: 9.5 },
    description: { fontFamily: v.italic, marginBottom: 2 },
    stack: { fontFamily: v.bold, marginBottom: 2 },
    bullet: { flexDirection: "row", paddingLeft: 4 },
    bulletGlyph: { width: 10 },
    bulletText: { flex: 1 },
    item: { marginBottom: 2 },
    footer: { position: "absolute", bottom: 24, right: 48, fontSize: 8, color: "#777777" },
  });
}

export function Ats({ seed, photo, variant }: TemplateProps & { variant: AtsVariant }) {
  const s = stylesFor(variant);
  const period = (from: string, to: string | null) => `${variant.date(from)} - ${variant.date(to)}`;
  const label = (text: string, rest: string) => (
    <Text style={s.skillLine}>
      <Text style={{ fontFamily: variant.bold }}>{text}: </Text>
      {rest}
    </Text>
  );
  const city = seed.location.split(",")[0];
  return (
    <CvDocument seed={seed}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{seed.name}</Text>
            <Text style={s.headline}>{seed.headline}</Text>
            <Text style={s.contact}>
              {seed.location} | {seed.contact.phone} | {seed.contact.email}
            </Text>
            <Text style={s.contact}>
              {formatWorkModes(seed.remote)} | {seed.workAuthorization} | {formatAvailability(seed.availability)}
            </Text>
          </View>
          <Photo photo={photo} size={64} />
        </View>

        <Text style={s.h2}>{variant.summaryTitle}</Text>
        <Text>{seed.summary}</Text>

        <Text style={s.h2}>{variant.skillsTitle}</Text>
        {seed.skillGroups.map((group) => (
          <View key={group.label}>{label(group.label, group.skills.join(", "))}</View>
        ))}

        <Text style={s.h2}>{variant.experienceTitle}</Text>
        {seed.employment.map((job) => (
          <View key={`${job.company}-${job.from}`} style={s.job} minPresenceAhead={60}>
            <View style={s.jobHead}>
              <Text style={s.company}>{job.company}</Text>
              <Text style={s.dates}>{period(job.from, job.to)}</Text>
            </View>
            <Text style={s.title}>{job.title}</Text>
            <Text style={s.location}>
              {city} ({job.industry})
            </Text>
            <Text style={s.description}>{job.description}</Text>
            <Text style={s.stack}>Tech Stack: {job.stack.join(", ")}</Text>
            {job.highlights.map((line) => (
              <View key={line} style={s.bullet}>
                <Text style={s.bulletGlyph}>{variant.bullet}</Text>
                <Text style={s.bulletText}>{line}</Text>
              </View>
            ))}
          </View>
        ))}

        <Text style={s.h2}>Education</Text>
        {seed.education.map((e) => (
          <Text key={`${e.institution}-${e.year}`} style={s.item}>
            {e.institution} - {formatDegree(e.degree, e.field)}, {e.year}
          </Text>
        ))}

        <Text style={s.h2}>Languages</Text>
        <Text>{seed.languages.map((l) => `${l.language} (${l.level})`).join(", ")}</Text>

        {seed.certifications.length > 0 && (
          <>
            <Text style={s.h2}>Certifications</Text>
            {seed.certifications.map((c) => (
              <Text key={c} style={s.item}>
                {c}
              </Text>
            ))}
          </>
        )}

        <Text style={s.footer} fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} | ${totalPages}`} />
      </Page>
    </CvDocument>
  );
}
