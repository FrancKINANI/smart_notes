/**
 * Comparative benchmark of LLM providers (OpenAI-compatible cloud vs local QVAC).
 *
 * Sends a set of prompts representative of SmartNotes' real use cases to the selected
 * providers, measuring for each: response time, output length, actual tokens
 * (if available), estimated cost (cloud: configurable API rate / QVAC: 0 + RAM/CPU).
 *
 * The full raw output (untruncated responses) is written to a JSON file
 * (scripts/benchmark-results/) for manual quality review. The script does NOT
 * decide a "winner" — it produces the data, the switch decision remains manual.
 *
 * Usage:
 *   npm run benchmark:llm                       # default providers: openrouter,qvac
 *   npm run benchmark:llm -- --providers=qvac   # QVAC only (local)
 *   npm run benchmark:llm -- --providers=openrouter,qvac --cases=5
 *   npm run benchmark:llm -- --out=./benchmark.json
 *   npm run benchmark:llm -- --timeout=600   # per-case timeout in seconds (default 300)
 *
 * Prerequisites:
 *   - Cloud: OPENROUTER_API_KEY (or another preset) in .env
 *   - QVAC  : network on first run (P2P model download) + ~1 GB disk
 */
import "dotenv/config";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import {
  createLLMProvider,
  QvacProvider,
  type LLMProvider,
  type QvacProviderOptions,
} from "../server/services/llm-provider";

// ---------------------------------------------------------------------------
// Prompt set — real product use cases (study assistant)
// ---------------------------------------------------------------------------

interface BenchmarkCase {
  id: string;
  category: "chat" | "explain" | "quiz" | "flashcards" | "summary" | "study-plan";
  title: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  maxTokens?: number;
}

const SYSTEM_STUDY =
  "You are an intelligent study assistant who helps students understand and learn better. Your answers are concise, precise and educational.";

const CASES: BenchmarkCase[] = [
  {
    id: "chat-1",
    category: "chat",
    title: "Course question — integration by parts",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "Explain the concept of integration by parts with a concrete example." },
    ],
  },
  {
    id: "chat-2",
    category: "chat",
    title: "First-order differential equation",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "How do you solve a first-order differential equation of the form y' + ay = b? Show the steps." },
    ],
  },
  {
    id: "chat-3",
    category: "chat",
    title: "Molecular polarity",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "What is the difference between a polar and a nonpolar molecule? Give examples." },
    ],
  },
  {
    id: "chat-4",
    category: "chat",
    title: "Conversation with history (follow-up)",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "I need to revise photosynthesis for my biology exam." },
      { role: "assistant", content: "Great! Photosynthesis happens in two phases: the light-dependent phase and the Calvin cycle. What would you like to dig into?" },
      { role: "user", content: "Explain the light-dependent phase in detail, including the pigments and the photolysis of water." },
    ],
  },
  {
    id: "explain-1",
    category: "explain",
    title: "Pythagorean theorem, 8th grade level",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "Explain the Pythagorean theorem to an 8th grader. Use a simple right triangle as an example and show how to compute the hypotenuse." },
    ],
    temperature: 0.4,
  },
  {
    id: "explain-2",
    category: "explain",
    title: "Recursion in computer science",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "Explain recursion with a simple analogy and a JavaScript code example (e.g. factorial)." },
    ],
  },
  {
    id: "quiz-1",
    category: "quiz",
    title: "Multiple-choice quiz generation — photosynthesis",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "Generate 5 multiple-choice quiz questions about photosynthesis. For each question, provide 4 options and the correct answer. Format: Q1) stem... then Answer: X." },
    ],
    temperature: 0.6,
    maxTokens: 800,
  },
  {
    id: "quiz-2",
    category: "quiz",
    title: "Open-ended questions — French Revolution",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "Generate 3 high-school-level open-ended questions about the French Revolution, with a detailed answer key for each." },
    ],
    temperature: 0.6,
    maxTokens: 800,
  },
  {
    id: "flashcards-1",
    category: "flashcards",
    title: "English vocabulary flashcards",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "Create 5 front/back flashcards to memorize English vocabulary for the environment theme. Format: Front: ... | Back: ..." },
    ],
    temperature: 0.5,
    maxTokens: 600,
  },
  {
    id: "flashcards-2",
    category: "flashcards",
    title: "Data structures flashcards",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "Create 5 flashcards about data structures in computer science (stack, queue, linked list, tree, graph): definition and complexity. Format: Front: ... | Back: ..." },
    ],
    temperature: 0.5,
    maxTokens: 600,
  },
  {
    id: "summary-1",
    category: "summary",
    title: "Note summary — thermodynamics",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content:
        "Summarize this course in 5 key points:\n\n" +
        "\"Thermodynamics studies the energy exchanges between a system and its surroundings. The first law (conservation of energy) is written ΔU = W + Q, where ΔU is the change in internal energy, W the work and Q the heat transfer. The second law introduces entropy S: for a spontaneous transformation, the total entropy of the universe increases (ΔS ≥ 0). Transformations can be isothermal (constant T), isobaric (constant P) or isochoric (constant V). Enthalpy H = U + PV simplifies the study of reactions at constant pressure. The third law states that at absolute zero, the entropy of a perfect crystal is zero.\"" },
    ],
    temperature: 0.3,
    maxTokens: 600,
  },
  {
    id: "summary-2",
    category: "summary",
    title: "Summary — cell biology",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content:
        "Write a short, structured summary of this chapter:\n\n" +
        "\"The cell is the structural and functional unit of life. Eukaryotic cells have a nucleus bounded by a nuclear envelope, organelles (mitochondria, endoplasmic reticulum, Golgi apparatus) and a cytoskeleton. Prokaryotes (bacteria) have no nucleus. The plasma membrane, a lipid bilayer, enables exchanges and signaling. Mitochondria produce ATP through cellular respiration. The nucleus contains DNA, the carrier of genetic information, transcribed into mRNA then translated into proteins in the ribosomes.\"" },
    ],
    temperature: 0.3,
    maxTokens: 600,
  },
  {
    id: "study-plan-1",
    category: "study-plan",
    title: "Revision plan — organic chemistry",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "Propose a one-week revision plan to prepare for an organic chemistry exam (nomenclature, SN1/SN2 mechanisms, stereochemistry). Detail the objectives for each day." },
    ],
    temperature: 0.5,
    maxTokens: 800,
  },
  {
    id: "chat-5",
    category: "chat",
    title: "Krebs cycle",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "Help me understand the Krebs cycle step by step, without excessive jargon." },
    ],
  },
  {
    id: "chat-6",
    category: "chat",
    title: "Conservation of energy",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "What is the law of conservation of energy? Explain it with an everyday example." },
    ],
  },
  {
    id: "explain-3",
    category: "explain",
    title: "Genotype vs phenotype",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "I don't understand the difference between genotype and phenotype. Can you explain it with a concrete example?" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Cost estimation
// ---------------------------------------------------------------------------

interface Pricing {
  inputPerM: number; // USD per million input tokens
  outputPerM: number; // USD per million output tokens
}

/** Default prices (configurable via env) — per million tokens, in USD. */
function defaultPricing(): Pricing {
  return {
    inputPerM: parseFloat(process.env.LLM_INPUT_PRICE_PER_MTOK || "0.5") || 0.5,
    outputPerM: parseFloat(process.env.LLM_OUTPUT_PRICE_PER_MTOK || "1.5") || 1.5,
  };
}

/** Best-effort: fetches the real model price from OpenRouter (else it would be guesswork). */
async function fetchOpenRouterPricing(model: string): Promise<Pricing | null> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models");
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: Array<{ id: string; pricing?: { prompt: string; completion: string } }>;
    };
    const m = data.data?.find((x) => x.id === model);
    if (!m?.pricing) return null;
    // OpenRouter prices (/api/v1/models) are expressed in USD PER TOKEN
    // (e.g. "0.00000015" for gpt-4o-mini = $0.15 / million). We convert them
    // to per-million to stay consistent with defaultPricing().
    return {
      inputPerM: (parseFloat(m.pricing.prompt) || 0) * 1_000_000,
      outputPerM: (parseFloat(m.pricing.completion) || 0) * 1_000_000,
    };
  } catch {
    return null;
  }
}

function estimateTokens(chars: number): number {
  // Rough heuristic ~4 characters per token.
  return Math.max(1, Math.round(chars / 4));
}

// ---------------------------------------------------------------------------
// Measurements
// ---------------------------------------------------------------------------

interface RunResult {
  caseId: string;
  category: string;
  title: string;
  ok: boolean;
  error?: string;
  latencyMs: number;
  outputChars: number;
  outputTokensEst: number;
  usage?: { promptTokens: number; completionTokens: number };
  costUsd?: number;
  pricing?: Pricing;
  qvac?: {
    tokensPerSecond?: number;
    backendDevice?: string;
    promptTokens?: number;
    generatedTokens?: number;
    timeToFirstToken?: number;
    rssBeforeMb: number;
    rssAfterMb: number;
    freeMemBeforeMb: number;
    freeMemAfterMb: number;
    cpuCount: number;
  };
  rawOutput: string;
}

interface ProviderReport {
  provider: string;
  model: string;
  results: RunResult[];
}

/**
 * Per-case timeout (ms) — configurable via --timeout (s), default 300 s.
 *
 * Technical debt fix: the old withTimeout rejected the promise without cancelling
 * the running inference — QVAC kept generating in the background until completion
 * (blocked inference slot, RAM occupied). We now propagate an AbortController:
 * on timeout we call controller.abort(), which triggers, in the provider,
 * cancel({ requestId }) for QVAC (real stop in the worker) and fetch cancellation
 * for OpenAI-compatible providers.
 */
function withTimeout<T>(
  createPromise: (signal: AbortSignal) => Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  const controller = new AbortController();
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Timeout after ${Math.round(ms / 1000)} s (${label})`));
    }, ms);
    createPromise(controller.signal).then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

async function runCase(
  provider: LLMProvider,
  providerName: string,
  testCase: BenchmarkCase,
  pricing: Pricing | null,
  timeoutMs: number
): Promise<RunResult> {
  const before = process.memoryUsage().rss;
  const freeMemBefore = os.freemem();
  const start = performance.now();

  const base: RunResult = {
    caseId: testCase.id,
    category: testCase.category,
    title: testCase.title,
    ok: false,
    latencyMs: 0,
    outputChars: 0,
    outputTokensEst: 0,
    rawOutput: "",
  };

  try {
    const output = await withTimeout(
      (signal) =>
        provider.chat(testCase.messages, {
          temperature: testCase.temperature ?? 0.7,
          maxTokens: testCase.maxTokens ?? 500,
          signal,
        }),
      timeoutMs,
      `${providerName}/${testCase.id}`
    );
    const latencyMs = performance.now() - start;
    const after = process.memoryUsage().rss;

    base.ok = true;
    base.latencyMs = Math.round(latencyMs * 100) / 100;
    base.outputChars = output.length;
    base.outputTokensEst = estimateTokens(output.length);
    base.rawOutput = output;

    // Actual tokens + cost (OpenAI-compatible cloud provider)
    const usage =
      provider instanceof QvacProvider
        ? undefined
        : (provider as { lastUsage?: { promptTokens: number; completionTokens: number } })
            .lastUsage;
    if (usage) {
      base.usage = usage;
      const p = pricing ?? defaultPricing();
      base.pricing = p;
      base.costUsd =
        (usage.promptTokens / 1_000_000) * p.inputPerM +
        (usage.completionTokens / 1_000_000) * p.outputPerM;
    }

    // QVAC metrics (local)
    if (provider instanceof QvacProvider) {
      const stats = provider.lastStats;
      base.qvac = {
        tokensPerSecond: stats?.tokensPerSecond,
        backendDevice: stats?.backendDevice,
        promptTokens: stats?.promptTokens,
        generatedTokens: stats?.generatedTokens,
        timeToFirstToken: stats?.timeToFirstToken,
        rssBeforeMb: Math.round(before / 1024 / 1024),
        rssAfterMb: Math.round(after / 1024 / 1024),
        freeMemBeforeMb: Math.round(freeMemBefore / 1024 / 1024),
        freeMemAfterMb: Math.round(os.freemem() / 1024 / 1024),
        cpuCount: os.cpus().length,
      };
    }
  } catch (error) {
    base.error = error instanceof Error ? error.message : String(error);
    base.latencyMs = Math.round((performance.now() - start) * 100) / 100;
  }

  return base;
}

// ---------------------------------------------------------------------------
// CLI / execution
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): {
  providers: string[];
  cases: number;
  out?: string;
  timeoutMs: number;
} {
  const args: Record<string, string> = {};
  for (const a of argv) {
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      args[k] = v ?? "true";
    }
  }
  return {
    providers: (args["providers"] || "openrouter,qvac").split(",").map((s) => s.trim()).filter(Boolean),
    cases: args["cases"] ? parseInt(args["cases"], 10) : CASES.length,
    out: args["out"],
    timeoutMs: args["timeout"] ? parseInt(args["timeout"], 10) * 1000 : 300_000,
  };
}

async function main() {
  const { providers, cases: caseLimit, out, timeoutMs } = parseArgs(process.argv.slice(2));
  const selectedCases = CASES.slice(0, Math.min(caseLimit, CASES.length));

  console.log("═".repeat(72));
  console.log("🧠 LLM Provider Benchmark — SmartNotes");
  console.log(`Node ${process.version} · ${os.platform()} ${os.arch()} · ${os.cpus().length} CPU · RAM ${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`);
  console.log(`Cases: ${selectedCases.length} · Providers: ${providers.join(", ")} · Timeout/case: ${Math.round(timeoutMs / 1000)}s`);
  console.log("═".repeat(72));

  const reports: ProviderReport[] = [];

  for (const providerName of providers) {
    console.log(`\n▸ Provider: ${providerName}`);

    let provider: LLMProvider;
    try {
      // QVAC: wire an onProgress to track the model's P2P download
      if (providerName === "qvac") {
        const qvacOpts: QvacProviderOptions = {
          onProgress: (p) => {
            const mb = (n: number) => (n / 1e6).toFixed(1);
            const line = `  ▸ Model download ${p.percentage.toFixed(0)}% (${mb(p.downloaded)}/${mb(p.total)} MB)`;
            process.stderr.write(process.stderr.isTTY ? `\r${line}   ` : `${line}\n`);
            if (p.percentage >= 100) process.stderr.write("\n");
          },
        };
        provider = new QvacProvider(qvacOpts);
      } else {
        provider = createLLMProvider(providerName);
      }
    } catch (error) {
      console.log(`  ⚠ Skipped: ${error instanceof Error ? error.message : error}`);
      continue;
    }

    console.log(`  Model: ${provider.model}`);
    const pricing =
      providerName === "openrouter"
        ? await fetchOpenRouterPricing(provider.model)
        : null;
    if (pricing) {
      console.log(
        `  OpenRouter price: $${pricing.inputPerM}/M in · $${pricing.outputPerM}/M out`
      );
    }

    const results: RunResult[] = [];
    for (const testCase of selectedCases) {
      process.stdout.write(`  [${testCase.id}] ${testCase.title}... `);
      const result = await runCase(provider, providerName, testCase, pricing, timeoutMs);
      results.push(result);
      if (result.ok) {
        console.log(`OK (${result.latencyMs} ms, ${result.outputChars} chars)`);
      } else {
        console.log(`ERROR: ${result.error}`);
      }
    }

    // Free QVAC memory between two providers
    if (provider instanceof QvacProvider) {
      await provider.unload().catch(() => undefined);
    }

    reports.push({ provider: providerName, model: provider.model, results });
  }

  // -------------------------------------------------------------------------
  // Console summary
  // -------------------------------------------------------------------------
  console.log("\n" + "═".repeat(72));
  console.log("📊 SUMMARY (response time & output length)");
  console.log("═".repeat(72));

  const header = ["case", ...reports.map((r) => r.provider.padEnd(22))].join("  ");
  console.log(header);
  console.log("-".repeat(header.length));

  for (const testCase of selectedCases) {
    const row: string[] = [testCase.id.padEnd(9)];
    for (const report of reports) {
      const res = report.results.find((r) => r.caseId === testCase.id);
      if (!res) {
        row.push("n/a".padEnd(22));
      } else if (!res.ok) {
        row.push("ERR".padEnd(22));
      } else {
        row.push(`${res.latencyMs}ms/${res.outputChars}ch`.padEnd(22));
      }
    }
    console.log(row.join("  "));
  }

  // -------------------------------------------------------------------------
  // Raw JSON output (for manual quality review)
  // -------------------------------------------------------------------------
  const outDir = out ? path.dirname(path.resolve(out)) : path.join(process.cwd(), "scripts", "benchmark-results");
  const outFile =
    out ??
    path.join(outDir, `benchmark-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.mkdirSync(outDir, { recursive: true });

  const payload = {
    meta: {
      timestamp: new Date().toISOString(),
      node: process.version,
      platform: `${os.platform()} ${os.arch()}`,
      cpus: os.cpus().length,
      totalMemGb: Math.round(os.totalmem() / 1024 / 1024 / 1024),
      freeMemGb: Math.round(os.freemem() / 1024 / 1024 / 1024),
      note: "The benchmark does not decide: the switch decision remains manual after reviewing the quality of the raw responses.",
    },
    cases: selectedCases.map((c) => ({
      id: c.id,
      category: c.category,
      title: c.title,
      messages: c.messages,
      temperature: c.temperature ?? 0.7,
      maxTokens: c.maxTokens ?? 500,
    })),
    reports,
  };

  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`\n💾 Full raw output (manual review): ${outFile}`);
  console.log("\nReminder: this script does not designate a winner. Compare the raw JSON responses before any switch (LLM_PROVIDER).");
}

main().catch((error) => {
  console.error("Fatal benchmark error:", error);
  process.exit(1);
});
