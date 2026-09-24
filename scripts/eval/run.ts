// Runs the golden questions through the answer pipeline (PLAN, Evaluation),
// per model, and scores them against the thresholds. Every run makes model
// calls: state the estimate first (`--dry-run`) and get it approved.
//
//   npm run eval -- --dry-run                       the estimate and the remaining daily allowance
//   npm run eval                                    every offered model, every question
//   npm run eval -- --model primary --only q01,q19  one model, a few questions
//   npm run eval -- --repeat 2                      each question twice

import nextEnv from "@next/env";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AskEvent, AskRequest, HistoryTurn } from "@/contracts/ask";
import { AnswerModelIdSchema, HISTORY_ANSWER_MAX } from "@/contracts/ask";
import type { AnswerModelId } from "@/contracts/ask";
import { answerEntries, answerEntry } from "@/lib/ai/registry";
import { answerAsText } from "@/lib/answer-text";
import { answerQuestion } from "@/lib/answering/answer-question";
import { answerDeps } from "@/lib/answering/deps";
import type { RequestLog } from "@/lib/answering/log";
import { sectionPages } from "@/lib/pool/chunks";
import { readIndexEntries } from "@/lib/pool/index-files";
import { shortError, sleep } from "../generate/options";
import { observeAnswer } from "./observed";
import { GOLDEN_QUESTIONS, goldenQuestion } from "./questions";
import type { ModelReport } from "./report";
import { formatReports } from "./report";
import type { QuestionScore, SectionPages } from "./score";
import { scoreQuestion, summarize } from "./score";
import { loadSeeds } from "./seeds";
import type { GoldenQuestion, Seeds } from "./types";

nextEnv.loadEnvConfig(process.cwd());

/** Model requests a question takes on average: tool steps, then the answer (PLAN, Retrieval and answering: steps). */
export const REQUESTS_PER_QUESTION = 2.5;
/** Pause between questions: OpenRouter's free tier allows 20 requests a minute. */
const PAUSE_MS = 3_500;
export const REPORT_DIR = path.join("data", "eval");

export interface Asked {
  events: AskEvent[];
  log?: RequestLog;
  latencyMs: number;
}

export interface RunOptions {
  questions: readonly GoldenQuestion[];
  models: readonly AnswerModelId[];
  repeat: number;
  seeds: Seeds;
  sectionPages: SectionPages;
  /** One question through the pipeline; the runner passes the history of a follow-up. */
  ask: (request: AskRequest) => Promise<Asked>;
  log?: (message: string) => void;
  pauseMs?: number;
}

export interface QuestionRun {
  id: string;
  question: string;
  score: QuestionScore;
  events: AskEvent[];
  log?: RequestLog;
}

export interface ModelRun {
  model: AnswerModelId;
  startedAt: string;
  questions: QuestionRun[];
}

/** The history a follow-up is asked with: the answer to the question it follows, from this run. */
export function historyFor(question: GoldenQuestion, answered: ReadonlyMap<string, Asked>, questions: readonly GoldenQuestion[]): HistoryTurn[] {
  if (!question.after) return [];
  const prior = questions.find((q) => q.id === question.after);
  const answer = answered.get(question.after)?.events.at(-1);
  if (!prior || !answer || answer.type !== "answer") return [];
  return [{ question: prior.question, answer: answerAsText(answer.text, answer.view).slice(0, HISTORY_ANSWER_MAX), candidateIds: answer.sources.map((s) => s.candidateId) }];
}

export async function runEvaluation(options: RunOptions): Promise<ModelRun[]> {
  const { log = () => {}, pauseMs = 0 } = options;
  const runs: ModelRun[] = [];
  for (const model of options.models) {
    const run: ModelRun = { model, startedAt: new Date().toISOString(), questions: [] };
    for (let round = 0; round < options.repeat; round++) {
      const answered = new Map<string, Asked>();
      for (const question of options.questions) {
        if (run.questions.length > 0 && pauseMs > 0) await sleep(pauseMs);
        const asked = await options.ask({ question: question.question, model, history: historyFor(question, answered, options.questions) });
        answered.set(question.id, asked);
        const observed = observeAnswer(asked.events, asked.log, asked.latencyMs);
        const score = scoreQuestion(question, observed, options.seeds, options.sectionPages);
        run.questions.push({ id: question.id, question: question.question, score, events: asked.events, log: asked.log });
        log(`${model} ${question.id}: ${score.problems.length ? score.problems.join("; ") : "ok"} (${Math.round(asked.latencyMs / 1000)} s)`);
      }
    }
    runs.push(run);
  }
  return runs;
}

export function reportOf(run: ModelRun): ModelReport {
  const entry = answerEntry(run.model);
  return {
    model: run.model,
    displayName: entry?.displayName ?? run.model,
    pinned: entry?.model ?? "-",
    startedAt: run.startedAt,
    summary: summarize(run.questions.map((q) => q.score)),
    scores: run.questions.map((q) => q.score),
  };
}

function parseArgs(argv: string[]) {
  const known = new Set(["--model", "--only", "--repeat", "--dry-run"]);
  for (const arg of argv) if (arg.startsWith("--") && !known.has(arg)) throw new Error(`Unknown flag ${arg}`);
  const value = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? (argv[i + 1] ?? "").split(",").filter(Boolean) : undefined;
  };
  const models = (value("--model") ?? answerEntries().map((entry) => entry.id)).map((id) => AnswerModelIdSchema.parse(id));
  for (const id of models) if (!answerEntry(id)) throw new Error(`Model ${id} is not offered`);
  const only = value("--only");
  const questions = only ? only.map(goldenQuestion) : [...GOLDEN_QUESTIONS];
  const repeat = Number(value("--repeat")?.[0] ?? 1);
  if (!Number.isInteger(repeat) || repeat < 1) throw new Error("--repeat takes a positive integer");
  return { models, questions, repeat, dryRun: argv.includes("--dry-run") };
}

/** The account's key status from OpenRouter (API reference, limits), for the remaining daily allowance. */
async function keyStatus(): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return "OPENROUTER_API_KEY is not set; cannot read the remaining allowance.";
  try {
    const response = await fetch("https://openrouter.ai/api/v1/key", { headers: { Authorization: `Bearer ${key}` } });
    if (!response.ok) return `OpenRouter key status: HTTP ${response.status}`;
    const json = (await response.json()) as { data?: Record<string, unknown> };
    const data = json.data ?? {};
    const picked = Object.fromEntries(Object.entries(data).filter(([k]) => /usage|limit|free|rate/i.test(k)));
    return `OpenRouter key status: ${JSON.stringify(picked)}`;
  } catch (error) {
    return `OpenRouter key status unavailable: ${shortError(error)}`;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const requests = Math.ceil(args.questions.length * args.repeat * REQUESTS_PER_QUESTION);
  console.log(`eval: ${args.questions.length} question(s) × ${args.repeat} × ${args.models.length} model(s) ≈ ${requests * args.models.length} model requests (${REQUESTS_PER_QUESTION} per question)`);
  console.log(await keyStatus());
  if (args.dryRun) return;

  const entries = readIndexEntries();
  const pages = new Map(entries.map((entry) => [entry.id, sectionPages(entry)]));
  const deps = answerDeps(entries);
  const ask = async (request: AskRequest): Promise<Asked> => {
    const events: AskEvent[] = [];
    let log: RequestLog | undefined;
    const started = performance.now();
    await answerQuestion(request, (event) => events.push(event), { ...deps, log: (record) => (log = record) }, new AbortController().signal);
    return { events, log, latencyMs: Math.round(performance.now() - started) };
  };
  const runs = await runEvaluation({
    questions: args.questions,
    models: args.models,
    repeat: args.repeat,
    seeds: await loadSeeds(),
    sectionPages: (id) => pages.get(id) ?? {},
    ask,
    log: (message) => console.log(`eval ${message}`),
    pauseMs: PAUSE_MS,
  });

  await mkdir(REPORT_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const reports = runs.map(reportOf);
  for (const run of runs) {
    await writeFile(path.join(REPORT_DIR, `${stamp}-${run.model}.json`), `${JSON.stringify({ ...run, report: reportOf(run) }, null, 2)}\n`);
  }
  const markdown = formatReports(reports);
  await writeFile(path.join(REPORT_DIR, "latest.md"), `${markdown}\n`);
  console.log(`\n${markdown}`);
  if (reports.some((report) => !report.summary.passes)) process.exitCode = 1;
}

if (process.argv[1]?.endsWith("run.ts")) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
