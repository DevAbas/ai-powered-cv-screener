import type { AnswerView } from "@/contracts/view";
import { profileFacts } from "@/lib/answer-text";
import { CandidateName } from "./CandidateName";
import type { SourceHref } from "./CvSourceLink";
import { CvSourceLink } from "./CvSourceLink";

type ProfileView = Extract<AnswerView, { kind: "profile" }>;

export interface AnswerProfileProps {
  view: ProfileView;
  sourceHref?: SourceHref | undefined;
}

/**
 * DESIGN.md, Answer views: Profile. One candidate at a glance, every fact
 * from their CV: the name behind a person icon with the compact file card,
 * a line with title, location and years, then labelled sections.
 */
export function AnswerProfile({ view, sourceHref }: AnswerProfileProps) {
  const { candidateId, profile, page } = view.candidate;
  const sections = [
    { label: "Skills", value: profileFacts.skills(profile) },
    { label: "Languages", value: profileFacts.languages(profile) },
    { label: "Education", value: profileFacts.education(profile) },
    { label: "Experience", value: profileFacts.experience(profile) },
    { label: "Work", value: `${profileFacts.work(profile)} · ${profile.workAuthorization}` },
    { label: "Notice", value: profileFacts.notice(profile) },
    { label: "Leadership", value: profile.leadership.has ? profile.leadership.note : "" },
    { label: "Certifications", value: profile.certifications.join(" · ") },
  ].filter((section) => section.value);

  return (
    <section aria-label={`${profile.name}'s profile`} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <CandidateName name={profile.name} />
          <CvSourceLink compact candidateId={candidateId} name={profile.name} page={page} sourceHref={sourceHref} />
        </div>
        <p className="text-body-md leading-body-md text-on-surface-variant">{profileFacts.summary(profile)}</p>
      </div>
      <dl className="flex flex-col gap-5">
        {sections.map((section) => (
          <div key={section.label} className="flex flex-col gap-1">
            <dt className="text-label-sm leading-label-sm tracking-label-sm font-(weight:--font-weight-label-sm) text-on-surface-variant uppercase">
              {section.label}
            </dt>
            <dd className="text-body-md leading-body-md text-on-surface">{section.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
