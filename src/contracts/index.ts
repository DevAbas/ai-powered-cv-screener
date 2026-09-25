// The contracts (AGENTS.md, Conventions): every Zod schema and its type,
// imported from `@/contracts`. Each file owns one area. Names are listed,
// not `export *`: the scripts run as ES modules and Node only sees the
// names a CommonJS module declares itself.

export { ANSWER_MODEL_IDS, AnswerModelIdSchema, HISTORY_ANSWER_MAX, HistoryTurnSchema, AskRequestSchema, PROGRESS_STAGES, ProgressStageSchema, AnswerSourceSchema, AnswerMatchedSchema, AnsweredBySchema, AskEventSchema } from "./contract.ask";
export type { AnswerModelId, HistoryTurn, AskRequest, ProgressStage, AnswerSource, AnswerMatched, AnsweredBy, AskEvent } from "./contract.ask";

export { ROLES, RoleSchema, SENIORITIES, SenioritySchema, WORK_MODES, WorkModeSchema, LANGUAGE_LEVELS, LanguageLevelSchema, DEGREES, DegreeSchema, SkillSchema, LanguageSchema, EducationSchema, EmploymentSchema, CandidateProfileSchema, SECTION_NAMES, SectionNameSchema, ChunkSchema, FieldSourceSchema, CandidateIdSchema, EmploymentSeedSchema, SkillGroupSchema, CandidateSeedSchema, IndexEntrySchema } from "./contract.candidate";
export type { Role, Seniority, WorkMode, LanguageLevel, Degree, Skill, Language, Education, Employment, CandidateProfile, SectionName, Chunk, FieldSource, CandidateId, EmploymentSeed, SkillGroup, CandidateSeed, IndexEntry } from "./contract.candidate";

export { RangeSchema, SCOPES, ScopeSchema, PRESENT_VIEWS, PresentViewSchema, MAX_PRESENT_SKILLS, FiltersShape, filtersSchema, FindCandidatesShape, findCandidatesInput, GetCandidatesShape, getCandidatesInput, SearchCvTextShape, searchCvTextInput, PresentShape, presentInput, STATIC_VOCABULARY } from "./contract.tools";
export type { Vocabulary, Range, Scope, Filters, FindCandidatesInput, GetCandidatesInput, SearchCvTextInput, PresentInput } from "./contract.tools";

export { MAX_VIEW_SKILLS, ANSWER_STATUSES, AnswerStatusSchema, SkillYearsSchema, CandidateRowSchema, ViewCandidateSchema, AnswerViewSchema } from "./contract.view";
export type { AnswerStatus, SkillYears, CandidateRow, ViewCandidate, AnswerView } from "./contract.view";
