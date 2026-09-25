// Runs the golden questions through the answer pipeline (PLAN, Evaluation),
// per model, and scores them against the thresholds. Every run makes model
// calls: state the estimate first (`--dry-run`) and get it approved.
//
//   npm run eval -- --dry-run                       the estimate, its cost and the remaining credits
//   npm run eval                                    every offered model, every question
//   npm run eval -- --model primary --only q01,q19  one model, a few questions
//   npm run eval -- --repeat 2                      each question twice

import nextEnv from "@next/env";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AskEvent, AskRequest, HistoryTurn, AnswerModelId } from "@/contracts";
import { AnswerModelIdSchema, HISTORY_ANSWER_MAX } from "@/contracts";
import { answerEntries, answerEntry } from "@/lib/models";
import { answerAsText } from "@/lib/conversation";
import { answerQuestion, answerDeps } from "@/lib/screening";
import type { RequestLog } from "@/lib/screening";
import { sectionPages } from "@/lib/candidates";
import { readIndexEntries } from "@/lib/candidates/indexFiles";
import { shortError, sleep } from "../generation/options";
import { observeAnswer } from "./observed";
import { GOLDEN_QUESTIONS, goldenQuestion } from "./questions";
import type { ModelReport } from "./report";
import { formatReports } from "./report";
import type { QuestionScore, SectionPages } from "./score";
import { scoreQuestion, summarize } from "./score";
import { loadSeeds } from "./loadSeeds";
import type { GoldenQuestion, Seeds } from "./types";

nextEnv.loadEnvConfig(process.cwd());

/** Model requests a question takes on average: tool steps, then the answer (PLAN, Retrieval and answering: steps). */
export const REQUESTS_PER_QUESTION = 2.5;
/** Pause between questions, kept from the OpenRouter phase; the Gemini API free tier allows about 15 requests a minute (PLAN, Environment). */
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

/** Tokens per model request on the answer loop, from the request log (2026-09-25): the mission with the directory, and a short answer. */
const INPUT_TOKENS_PER_REQUEST = 12_000;
const OUTPUT_TOKENS_PER_REQUEST = 150;

/** The account's credits (OpenRouter API reference: GET /api/v1/credits), for the remaining balance. */
async function creditStatus(): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return "OPENROUTER_API_KEY is not set; cannot read the remaining credits.";
  try {
    const response = await fetch("https://openrouter.ai/api/v1/credits", { headers: { Authorization: `Bearer ${key}` } });
    if (!response.ok) return `OpenRouter credits: HTTP ${response.status}`;
    const { data } = (await response.json()) as { data?: { total_credits?: unknown; total_usage?: unknown } };
    const credits = data?.total_credits;
    const usage = data?.total_usage;
    if (typeof credits !== "number" || typeof usage !== "number") return `OpenRouter credits: ${JSON.stringify(data)}`;
    return `OpenRouter credits: $${(credits - usage).toFixed(2)} remaining of $${credits.toFixed(2)} bought`;
  } catch (error) {
    return `OpenRouter credits unavailable: ${shortError(error)}`;
  }
}

/** The run's cost per model, from OpenRouter's public prices (GET /api/v1/models) and the tokens a request takes. */
async function estimatedCost(models: readonly AnswerModelId[], requestsPerModel: number): Promise<string> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models");
    if (!response.ok) return `prices unavailable (HTTP ${response.status})`;
    const { data } = (await response.json()) as { data: { id: string; pricing?: { prompt?: string; completion?: string } }[] };
    const lines = models.map((id) => {
      const entry = answerEntry(id);
      const model = entry?.model ?? id;
      // The Gemini API is a quota, not a price list: free tier about 1,000 requests a day per model (Gemini API rate limits), or billed per token.
      if (entry?.provider === "google") return `${model}: Gemini API quota (free tier about 1,000 requests a day per model, or billed per token)`;
      const pricing = data.find((listed) => listed.id === model)?.pricing;
      if (!pricing) return `${model}: no price listed`;
      const perRequest = INPUT_TOKENS_PER_REQUEST * Number(pricing.prompt ?? 0) + OUTPUT_TOKENS_PER_REQUEST * Number(pricing.completion ?? 0);
      return `${model} ≈ $${(perRequest * requestsPerModel).toFixed(2)}`;
    });
    return `estimated cost: ${lines.join("; ")}`;
  } catch (error) {
    return `prices unavailable: ${shortError(error)}`;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const requests = Math.ceil(args.questions.length * args.repeat * REQUESTS_PER_QUESTION);
  console.log(`eval: ${args.questions.length} question(s) × ${args.repeat} × ${args.models.length} model(s) ≈ ${requests * args.models.length} model requests (${REQUESTS_PER_QUESTION} per question)`);
  console.log(await estimatedCost(args.models, requests));
  if (args.models.some((id) => answerEntry(id)?.provider === "openrouter")) console.log(await creditStatus());
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

if (process.argv[1]?.endsWith("cli.ts")) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
