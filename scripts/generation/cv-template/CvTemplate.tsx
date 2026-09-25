import { Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatAvailability, formatDegree, formatMonth, formatMonthNumeric, formatSkill, formatWorkModes } from "../pdf";
import { CvDocument, Photo } from "./shared";
import type { TemplateProps } from "./shared";

// One layout, after the sample CV the pilot was given: photo and name at
// the top, the headline in the accent, a contact line, then sections with
// uppercase letter-spaced headings over a hairline. Skills carry their years,
// every job its industry and a leader a Leadership section, so the index can
// read all three from the PDF. The accent is the design
// system's `primary-text` (DESIGN.md, Colors): the accent as text on a light
// surface. Variants differ in font and date style only, so the pool's CVs
// are not byte-for-byte alike.

/** DESIGN.md `primary-text`: the one colour in the document. */
const ACCENT = "#007C5A";
const INK = "#1F1F1F";
const MUTED = "#666666";
const RULE = "#D9D9D9";

export interface CvVariant {
  body: string;
  bold: string;
  bullet: string;
  date: (yearMonth: string | null) => string;
}

export const VARIANTS: readonly CvVariant[] = [
  { body: "Helvetica", bold: "Helvetica-Bold", bullet: "•", date: formatMonth },
  { body: "Times-Roman", bold: "Times-Bold", bullet: "•", date: formatMonth },
  { body: "Helvetica", bold: "Helvetica-Bold", bullet: "–", date: formatMonthNumeric },
];

function stylesFor(v: CvVariant) {
  return StyleSheet.create({
    page: { fontFamily: v.body, fontSize: 10, lineHeight: 1.45, color: INK, paddingTop: 56, paddingBottom: 56, paddingHorizontal: 60 },
    header: { flexDirection: "row", alignItems: "flex-start", gap: 20, paddingBottom: 18, borderBottomWidth: 0.75, borderBottomColor: RULE },
    name: { fontSize: 24, lineHeight: 1.2, marginBottom: 6 },
    headline: { fontSize: 12, color: ACCENT, marginBottom: 8 },
    contact: { fontSize: 9, color: MUTED },
    section: { marginTop: 18 },
    h2: {
      fontSize: 11,
      color: ACCENT,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      paddingBottom: 6,
      marginBottom: 10,
      borderBottomWidth: 0.75,
      borderBottomColor: RULE,
    },
    inline: { fontSize: 10 },
    // One box per skill in a wrapping row: a skill and its years move to the next line together.
    skills: { flexDirection: "row", flexWrap: "wrap", fontSize: 10 },
    job: { marginBottom: 10 },
    jobHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 },
    jobTitle: { fontSize: 10.5 },
    dates: { fontSize: 9, color: MUTED },
    industry: { fontSize: 9, color: MUTED, marginBottom: 3 },
    bullet: { flexDirection: "row", paddingLeft: 2 },
    bulletGlyph: { width: 12 },
    bulletText: { flex: 1 },
    degree: { fontSize: 10.5, marginBottom: 2 },
    institution: { fontSize: 9, color: MUTED },
  });
}

const SEP = "  ·  ";

export function CvTemplate({ seed, photo, variant }: TemplateProps & { variant: CvVariant }) {
  const s = stylesFor(variant);
  const period = (from: string, to: string | null) => `${variant.date(from)} – ${variant.date(to)}`;
  return (
    <CvDocument seed={seed}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Photo photo={photo} size={116} />
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{seed.name}</Text>
            <Text style={s.headline}>{seed.headline}</Text>
            <Text style={s.contact}>{[seed.contact.email, seed.contact.phone, seed.location].join(SEP)}</Text>
            <Text style={s.contact}>
              {[formatWorkModes(seed.remote), seed.workAuthorization, formatAvailability(seed.availability)].join(SEP)}
            </Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.h2}>Summary</Text>
          <Text>{seed.summary}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.h2}>Skills</Text>
          <View style={s.skills}>
            {seed.skills.map((skill, i) => (
              <Text key={skill.name}>
                {formatSkill(skill)}
                {i < seed.skills.length - 1 ? SEP : ""}
              </Text>
            ))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.h2}>Experience</Text>
          {seed.employment.map((job) => (
            <View key={`${job.company}-${job.from}`} style={s.job} minPresenceAhead={48}>
              <View style={s.jobHead}>
                <Text style={s.jobTitle}>
                  {job.title} — {job.company}
                </Text>
                <Text style={s.dates}>{period(job.from, job.to)}</Text>
              </View>
              <Text style={s.industry}>Industry: {job.industry}</Text>
              {job.highlights.map((line) => (
                <View key={line} style={s.bullet}>
                  <Text style={s.bulletGlyph}>{variant.bullet}</Text>
                  <Text style={s.bulletText}>{line}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.h2}>Education</Text>
          {seed.education.map((e) => (
            <View key={`${e.institution}-${e.year}`} style={{ marginBottom: 6 }}>
              <View style={s.jobHead}>
                <Text style={s.degree}>{formatDegree(e.degree, e.field)}</Text>
                <Text style={s.dates}>{e.year}</Text>
              </View>
              <Text style={s.institution}>{e.institution}</Text>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.h2}>Languages</Text>
          <Text style={s.inline}>{seed.languages.map((l) => `${l.language} (${l.level})`).join(SEP)}</Text>
        </View>

        {seed.leadership.has && seed.leadership.note && (
          <View style={s.section}>
            <Text style={s.h2}>Leadership</Text>
            <Text>{seed.leadership.note}</Text>
          </View>
        )}

        {seed.certifications.length > 0 && (
          <View style={s.section}>
            <Text style={s.h2}>Certifications</Text>
            <Text style={s.inline}>{seed.certifications.join(SEP)}</Text>
          </View>
        )}
      </Page>
    </CvDocument>
  );
}
