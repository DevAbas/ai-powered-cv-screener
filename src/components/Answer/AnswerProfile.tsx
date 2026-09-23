import type { ProfileSummary } from "@/contracts/answer";
import type { SourceHref } from "./CvSourceLink";
import { CvSourceLink } from "./CvSourceLink";

export interface AnswerProfileProps {
  profile: ProfileSummary;
  nameOf: (id: string) => string;
  sourceHref?: SourceHref | undefined;
}

/** Structured overview of one candidate: sections as lists. */
export function AnswerProfile({ profile, nameOf, sourceHref }: AnswerProfileProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-body-md leading-body-md text-on-surface">{profile.headline}</p>
        <div>
          <CvSourceLink candidateId={profile.candidateId} name={nameOf(profile.candidateId)} page={1} sourceHref={sourceHref} />
        </div>
      </div>
      {profile.sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-1">
          <h3 className="text-label-sm leading-label-sm tracking-label-sm font-(weight:--font-weight-label-sm) text-on-surface-variant uppercase">{section.title}</h3>
          <ul className="flex flex-col gap-0.5 text-body-md leading-body-md text-on-surface">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
