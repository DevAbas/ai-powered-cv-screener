import type { ProfileSummary } from "@/contracts/answer";
import type { OpenSource } from "./source-link";
import { SourceLink } from "./source-link";

export interface AnswerProfileProps {
  profile: ProfileSummary;
  nameOf: (id: string) => string;
  onOpenSource: OpenSource;
}

/** Structured overview of one candidate: sections as lists. */
export function AnswerProfile({ profile, nameOf, onOpenSource }: AnswerProfileProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-body-md leading-body-md text-on-surface">{profile.headline}</p>
        <div>
          <SourceLink candidateId={profile.candidateId} name={nameOf(profile.candidateId)} page={1} onOpen={onOpenSource} />
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
