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
 * DESIGN.md, Answer views: Profile. The answer to a question about one
 * candidate: under the sentences that answer it, only the name behind a
 * person icon with the compact file card, and one line with title,
 * location and years. The details are in the CV.
 */
export function AnswerProfile({ view, sourceHref }: AnswerProfileProps) {
  const { candidateId, profile, page } = view.candidate;
  return (
    <section aria-label={`${profile.name}'s profile`} className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-3">
        <CandidateName name={profile.name} />
        <CvSourceLink compact candidateId={candidateId} name={profile.name} page={page} sourceHref={sourceHref} />
      </div>
      <p className="text-body-md leading-body-md text-on-surface-variant">{profileFacts.summary(profile)}</p>
    </section>
  );
}
