// Verifies every model registry entry against its declared capabilities
// (PLAN, Model registry). Model ids are pinned in the registry only after this passes.
//
//   npm run check-models                              every free entry and fallback
//   npm run check-models -- --only image              a paid entry runs only when named
//   npm run check-models -- --only primary --roles main
//   npm run check-models -- --probe google:gemini-3.6-flash,openrouter:qwen/qwen3.8-27b:free
//   npm run check-models -- --probe google:<image model> --capabilities image
//   npm run check-models -- --only primary --roles main --capabilities answer --repeat 5
//
// Probes default to the answer capabilities (tools, answer, extract,
// streaming); a probe id without a provider prefix is an OpenRouter id.

import { loadEnvConfig } from "@next/env";
import { generateText, isStepCount, NoObjectGeneratedError, streamText, tool } from "ai";
import type { LanguageModel } from "ai";
import { z } from "zod";
import { ANSWER_KIND_RULES, AnswerSchema } from "@/contracts/answer";
import { CandidateProfileSchema } from "@/contracts/candidate";
import type { RoutedModel } from "@/lib/ai/providers";
import { languageModel, missingApiKeys } from "@/lib/ai/providers";
import type { ModelEntry, ModelId, ModelTarget, Provider } from "@/lib/ai/registry";
import { REGISTRY } from "@/lib/ai/registry";
import { errorStatus, withRetry } from "@/lib/ai/retry";
import { generateWithRepair, isFirstOutputChunk, schemaIssues } from "@/lib/ai/structured";
import { PHOTO_MEDIA_TYPE, photoPrompt, photoProviderOptions } from "./generate/photo-options";

loadEnvConfig(process.cwd());

const TIMEOUT_MS = 90_000;

const CAPABILITIES = ["tools", "answer", "extract", "streaming", "image"] as const;
type Capability = (typeof CAPABILITIES)[number];
const PROBE_DEFAULT: readonly Capability[] = ["tools", "answer", "extract", "streaming"];
const ROLES = ["main", "fallback", "probe"] as const;

interface Check {
  entry: string;
  role: (typeof ROLES)[number];
  target: RoutedModel;
  capability: Capability;
}

interface Result extends Check {
  ok: boolean;
  /** The first structured-output response failed the schema and a repair call was made. */
  repairAttempted: boolean;
  /** Time from the start of the model call to its first content-bearing chunk. */
  ttftMs?: number;
  ms: number;
  detail: string;
}

const POOL_EXCERPT = `Retrieved pages:
[lena-novak p.1] Lena Novak. Senior Frontend Engineer, Berlin. Skills: React (6 years), TypeScript (5 years), Next.js.
[ali-hasanov p.1] Ali Hasanov. Backend Engineer, Baku. Skills: Go (4 years), PostgreSQL, Kafka.`;

const FAKE_CV = `Jordan Example
Senior Backend Engineer · Lisbon, Portugal · open to remote or relocation
jordan.example@example.com · +1-555-010-2030
EU citizen. Notice period: 1 month.

Experience
Lead Backend Engineer, Northwind Logistics (Logistics), 2021-04 – present. Led a team of 4.
Backend Engineer, Contoso Bank (Finance), 2017-09 – 2021-03.

Skills: Go (6 years), PostgreSQL (7 years), Kubernetes, Kafka
Languages: Portuguese (native), English (C1), German (A2)
Education: MSc Computer Science, University of Lisbon, 2017
Certifications: CKA`;

interface Hooks {
  onRepair: (issues: string, rawText: string | undefined) => void;
  /** Records the time to first token of the first model call in a probe. */
  onFirstOutput: (ms: number) => void;
}

async function probe(check: Check, { onRepair, onFirstOutput }: Hooks): Promise<string> {
  const abortSignal = AbortSignal.timeout(TIMEOUT_MS);
  const common = { maxRetries: 0, abortSignal } as const;

  const model: LanguageModel = languageModel(check.target);

  switch (check.capability) {
    case "tools": {
      const result = await generateText({
        ...common,
        model,
        tools: {
          pool_size: tool({
            description: "Returns the number of CVs in the candidate pool.",
            inputSchema: z.object({}),
            execute: async () => ({ size: 30 }),
          }),
        },
        stopWhen: isStepCount(2),
        prompt: "How many CVs are in the pool? Call the pool_size tool to find out.",
      });
      if (!result.toolCalls.some((call) => call.toolName === "pool_size")) {
        throw new Error("the model did not call the tool");
      }
      return `${result.toolCalls.length} tool call(s)`;
    }
    case "answer": {
      // The same kind rules the compose prompt carries (PLAN, Retrieval and answering).
      const { output, repaired } = await generateWithRepair(model, {
        schema: AnswerSchema,
        name: "answer",
        instructions: `You answer questions about candidate CVs using only the retrieved pages. Cite each candidate by id and page.\n\n${ANSWER_KIND_RULES}`,
        prompt: `${POOL_EXCERPT}\n\nQuestion: Who has React experience? Answer with kind "filter".`,
        onRepair,
      }, { signal: abortSignal, onFirstOutput });
      const ids = output.candidates?.map((c) => c.candidateId) ?? [];
      if (output.kind !== "filter" || !ids.includes("lena-novak")) {
        throw new Error(`unexpected answer: kind=${output.kind}, candidates=${ids.join(",") || "none"}`);
      }
      return `kind=${output.kind}, ${ids.length} candidate(s)${repaired ? ", repaired" : ""}`;
    }
    case "extract": {
      const { output, repaired } = await generateWithRepair(model, {
        schema: CandidateProfileSchema,
        name: "candidate_profile",
        instructions: "Extract the candidate profile from the CV text. Use only facts stated in the CV.",
        prompt: FAKE_CV,
        onRepair,
      }, { signal: abortSignal, onFirstOutput });
      if (output.name !== "Jordan Example") throw new Error(`unexpected name: ${output.name}`);
      return `${output.skills.length} skills, ${output.employment.length} jobs${repaired ? ", repaired" : ""}`;
    }
    case "streaming": {
      // Mid-stream errors do not throw: they reach `onError` and end
      // `textStream` quietly, with finishReason "error".
      let streamError: unknown;
      const started = performance.now();
      const result = streamText({
        ...common,
        model,
        prompt: "Reply with the single word OK.",
        onChunk: ({ chunk }) => {
          if (isFirstOutputChunk(chunk)) onFirstOutput(performance.now() - started);
        },
        onError: ({ error }) => {
          streamError = error;
        },
      });
      let text = "";
      for await (const chunk of result.textStream) text += chunk;
      if (streamError !== undefined) throw streamError;
      const finishReason = await result.finishReason;
      if (finishReason === "error") throw new Error("stream finished with an error");
      if (!text.trim()) throw new Error(`empty stream (finishReason=${finishReason})`);
      return JSON.stringify(text.trim().slice(0, 20));
    }
    case "image": {
      // The exact request the photo step sends, so a pass means photos work.
      const result = await generateText({
        ...common,
        model,
        prompt: photoPrompt("A fictional software engineer in their thirties, short dark hair, calm expression"),
        providerOptions: photoProviderOptions(),
      });
      const image = result.files.find((file) => file.mediaType === PHOTO_MEDIA_TYPE);
      if (!image) {
        const types = result.files.map((f) => f.mediaType).join(", ") || "none";
        throw new Error(`no ${PHOTO_MEDIA_TYPE} returned (files: ${types}; finishReason=${result.finishReason})`);
      }
      return `${image.mediaType}, ${Math.round(image.uint8Array.length / 1024)} KB`;
    }
  }
}

const SCHEMAS: Partial<Record<Capability, z.ZodType>> = {
  answer: AnswerSchema,
  extract: CandidateProfileSchema,
};

function indent(text: string): string {
  return text.replace(/^/gm, "    ");
}

/** For a final structured-output failure: the last raw response and why it fails the contract. */
function describeSchemaFailure(check: Check, error: unknown): string | undefined {
  const schema = SCHEMAS[check.capability];
  if (!schema || !NoObjectGeneratedError.isInstance(error)) return undefined;
  return [
    `finishReason: ${error.finishReason ?? "unknown"}`,
    `raw text: ${error.text ?? "(none)"}`,
    schemaIssues(schema, error.text),
  ].join("\n");
}

/** Entries whose structured output is a candidate profile, not an answer. */
const PROFILE_ENTRIES = new Set<ModelId>(["extract", "generate"]);

function capabilitiesOf(entry: ModelEntry): Capability[] {
  const { capabilities } = entry;
  const list: Capability[] = [];
  if (capabilities.tools) list.push("tools");
  if (capabilities.structuredOutput) list.push(PROFILE_ENTRIES.has(entry.id) ? "extract" : "answer");
  if (capabilities.streaming) list.push("streaming");
  if (capabilities.image) list.push("image");
  return list;
}

function checksFor(entry: ModelEntry): Check[] {
  const roles: [Check["role"], ModelTarget | undefined][] = [
    ["main", entry],
    ["fallback", entry.fallback],
  ];
  return roles.flatMap(([role, target]) =>
    target ? capabilitiesOf(entry).map((capability) => ({ entry: entry.id, role, target, capability })) : [],
  );
}

function parseArgs(argv: string[]) {
  const value = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? (argv[i + 1] ?? "").split(",").filter(Boolean) : undefined;
  };
  return {
    only: value("--only"),
    roles: value("--roles"),
    probe: value("--probe"),
    capabilities: value("--capabilities"),
    repeat: Number(value("--repeat")?.[0] ?? 1),
  };
}

function parseProbe(id: string): RoutedModel {
  const match = /^(google|openrouter):(.+)$/.exec(id);
  const provider: Provider = match ? (match[1] as Provider) : "openrouter";
  return { provider, model: match ? match[2] : id };
}

function assertKnown(kind: string, values: string[] | undefined, known: readonly string[]) {
  const unknown = values?.filter((v) => !known.includes(v)) ?? [];
  if (unknown.length) throw new Error(`Unknown ${kind}: ${unknown.join(", ")}. Expected one of: ${known.join(", ")}`);
}

function printTable(results: Result[]) {
  const rows = [
    ["entry", "role", "model", "capability", "result", "ms", "ttft", "detail"],
    ...results.map((r) => [
      r.entry,
      r.role,
      `${r.target.provider}:${r.target.model}`,
      r.capability,
      r.ok ? "pass" : "FAIL",
      String(r.ms),
      r.ttftMs === undefined ? "-" : String(Math.round(r.ttftMs)),
      r.detail,
    ]),
  ];
  const widths = rows[0].map((_, col) => Math.max(...rows.map((row) => row[col].length)));
  for (const row of rows) {
    console.log(row.map((cell, col) => (col === row.length - 1 ? cell : cell.padEnd(widths[col]))).join("  "));
  }
}

/** Structured-output checks: first-attempt schema failures, repairs and final failures, reported separately. */
function printRepairSummary(results: Result[]) {
  const groups = new Map<string, Result[]>();
  for (const r of results) {
    if (!SCHEMAS[r.capability]) continue;
    const key = `${r.target.provider}:${r.target.model} ${r.capability}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  if (groups.size === 0) return;
  console.log("\nStructured output:");
  for (const [key, group] of groups) {
    const firstFailures = group.filter((r) => r.repairAttempted).length;
    const repaired = group.filter((r) => r.repairAttempted && r.ok).length;
    const finalFailures = group.filter((r) => !r.ok).length;
    const rate = Math.round((firstFailures / group.length) * 100);
    console.log(
      `  ${key}: ${group.length} runs, first-attempt schema failures ${firstFailures} (${rate}%), repaired ${repaired}, final failures ${finalFailures}`,
    );
  }
}

/** Nearest-rank percentile. */
function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
}

/** Time to first token per model and capability, the input for the first-output limit. */
function printTtftSummary(results: Result[]) {
  const groups = new Map<string, number[]>();
  for (const r of results) {
    if (r.ttftMs === undefined) continue;
    const key = `${r.target.provider}:${r.target.model} ${r.capability}`;
    groups.set(key, [...(groups.get(key) ?? []), r.ttftMs]);
  }
  if (groups.size === 0) return;
  console.log("\nTime to first token:");
  for (const [key, values] of groups) {
    const p50 = Math.round(percentile(values, 0.5));
    const p95 = Math.round(percentile(values, 0.95));
    console.log(`  ${key}: n=${values.length}, p50 ${p50} ms, p95 ${p95} ms`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  assertKnown("registry id", args.only, Object.keys(REGISTRY));
  assertKnown("role", args.roles, ROLES);
  assertKnown("capability", args.capabilities, CAPABILITIES);
  if (!Number.isInteger(args.repeat) || args.repeat < 1) throw new Error("--repeat expects a positive integer");

  const probeCapabilities = (args.capabilities ?? PROBE_DEFAULT) as Capability[];
  const checks: Check[] = args.probe
    ? args.probe.flatMap((id) =>
        probeCapabilities.map((capability) => ({ entry: "-", role: "probe" as const, target: parseProbe(id), capability })),
      )
    : Object.values(REGISTRY)
        .filter((e) => !args.only || args.only.includes(e.id))
        // A paid entry costs money per check, so it runs only when named (PLAN, Environment).
        .filter((e) => {
          if (e.tier === "free" || args.only) return true;
          console.log(`skipped paid entry ${e.id} (run with --only ${e.id})`);
          return false;
        })
        .flatMap(checksFor)
        .filter((c) => !args.roles || args.roles.includes(c.role))
        .filter((c) => !args.capabilities || args.capabilities.includes(c.capability));
  const runs = checks.flatMap((check) => Array.from({ length: args.repeat }, () => check));

  const missing = missingApiKeys(runs.map((c) => c.target.provider));
  if (missing.length) throw new Error(`Set ${missing.join(" and ")} in .env.local (see .env.example).`);

  const results: Result[] = [];
  for (const check of runs) {
    const started = Date.now();
    let repairAttempted = false;
    let ttftMs: number | undefined;
    const hooks: Hooks = {
      onRepair: (issues, rawText) => {
        repairAttempted = true;
        process.stdout.write(`schema failure, repairing …\n${indent(`raw text: ${rawText ?? "(none)"}\n${issues}`)}\n    `);
      },
      onFirstOutput: (ms) => {
        ttftMs ??= ms;
      },
    };
    process.stdout.write(`${check.entry} ${check.role} ${check.target.model} ${check.capability} … `);
    try {
      const detail = await withRetry(() => {
        ttftMs = undefined;
        return probe(check, hooks);
      }, {
        attempts: 3,
        onRetry: (_error, attempt, delayMs) => process.stdout.write(`retry ${attempt} in ${Math.round(delayMs)}ms … `),
      });
      results.push({ ...check, ok: true, repairAttempted, ttftMs, ms: Date.now() - started, detail });
      console.log("pass");
    } catch (error) {
      const status = errorStatus(error);
      const message = error instanceof Error ? error.message.split("\n")[0].slice(0, 160) : String(error);
      const detail = status === undefined ? message : `[${status}] ${message}`;
      results.push({ ...check, ok: false, repairAttempted, ttftMs, ms: Date.now() - started, detail });
      console.log("FAIL");
      const diagnosis = describeSchemaFailure(check, error);
      if (diagnosis) console.log(indent(diagnosis));
    }
  }

  console.log("");
  printTable(results);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed.`);
  printRepairSummary(results);
  printTtftSummary(results);
  if (failed) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
