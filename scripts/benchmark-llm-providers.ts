/**
 * Benchmark comparatif des providers LLM (cloud OpenAI-compatible vs QVAC local).
 *
 * Envoie un jeu de prompts représentatifs des cas réels de SmartNotes aux providers
 * sélectionnés, mesure pour chacun : temps de réponse, longueur de sortie, tokens
 * réels (si dispo), coût estimé (cloud: tarif API configurable / QVAC: 0 + RAM/CPU).
 *
 * La sortie brute complète (réponses non tronquées) est écrite dans un fichier JSON
 * (scripts/benchmark-results/) pour revue manuelle de qualité. Le script ne décide
 * PAS de "gagnant" — il produit les données, la décision de bascule reste manuelle.
 *
 * Usage :
 *   npm run benchmark:llm                       # providers par défaut: openrouter,qvac
 *   npm run benchmark:llm -- --providers=qvac   # seulement QVAC (local)
 *   npm run benchmark:llm -- --providers=openrouter,qvac --cases=5
 *   npm run benchmark:llm -- --out=./benchmark.json
 *   npm run benchmark:llm -- --timeout=600   # timeout par case en secondes (défaut 300)
 *
 * Prérequis :
 *   - Cloud : OPENROUTER_API_KEY (ou autre preset) dans .env
 *   - QVAC  : réseau au premier lancement (téléchargement P2P du modèle) + ~1 Go disque
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
// Jeu de prompts — cas réels du produit (assistant d'étude francophone)
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
  "Vous êtes un assistant d'étude intelligent qui aide les étudiants à mieux comprendre et apprendre. Vos réponses sont concises, précises et pédagogiques.";

const CASES: BenchmarkCase[] = [
  {
    id: "chat-1",
    category: "chat",
    title: "Question de cours — intégration par parties",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "Explique-moi le concept d'intégration par parties avec un exemple concret." },
    ],
  },
  {
    id: "chat-2",
    category: "chat",
    title: "Équation différentielle du premier ordre",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "Comment résoudre une équation différentielle du premier ordre du type y' + ay = b ? Montre les étapes." },
    ],
  },
  {
    id: "chat-3",
    category: "chat",
    title: "Polarité des molécules",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "Quelle est la différence entre une molécule polaire et une molécule apolaire ? Donne des exemples." },
    ],
  },
  {
    id: "chat-4",
    category: "chat",
    title: "Conversation avec historique (relance)",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "Je dois réviser la photosynthèse pour mon examen de SVT." },
      { role: "assistant", content: "Très bien ! La photosynthèse se déroule en deux phases : la phase claire (dépendante de la lumière) et le cycle de Calvin. Qu'aimerais-tu approfondir ?" },
      { role: "user", content: "Explique-moi en détail la phase claire, avec les pigments et la photolyse de l'eau." },
    ],
  },
  {
    id: "explain-1",
    category: "explain",
    title: "Théorème de Pythagore niveau 4ème",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "Explique le théorème de Pythagore à un élève de 4ème. Utilise un triangle rectangle simple comme exemple et montre comment calculer l'hypoténuse." },
    ],
    temperature: 0.4,
  },
  {
    id: "explain-2",
    category: "explain",
    title: "Récursivité en informatique",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "Explique-moi la récursivité avec une analogie simple et un exemple de code en JavaScript (ex: factorielle)." },
    ],
  },
  {
    id: "quiz-1",
    category: "quiz",
    title: "Génération de quiz QCM — photosynthèse",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "Génère 5 questions de quiz à choix multiples sur la photosynthèse. Pour chaque question, fournis 4 propositions et la bonne réponse. Format: Q1) énoncé... puis Réponse: X." },
    ],
    temperature: 0.6,
    maxTokens: 800,
  },
  {
    id: "quiz-2",
    category: "quiz",
    title: "Questions ouvertes — Révolution française",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "Génère 3 questions ouvertes de niveau lycée sur la Révolution française, avec un corrigé détaillé pour chacune." },
    ],
    temperature: 0.6,
    maxTokens: 800,
  },
  {
    id: "flashcards-1",
    category: "flashcards",
    title: "Flashcards vocabulaire anglais",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "Crée 5 flashcards recto/verso pour mémoriser le vocabulaire anglais du bac sur le thème de l'environnement. Format: Recto: ... | Verso: ..." },
    ],
    temperature: 0.5,
    maxTokens: 600,
  },
  {
    id: "flashcards-2",
    category: "flashcards",
    title: "Flashcards structures de données",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "Crée 5 flashcards sur les structures de données en informatique (pile, file, liste chaînée, arbre, graphe) : définition et complexité. Format: Recto: ... | Verso: ..." },
    ],
    temperature: 0.5,
    maxTokens: 600,
  },
  {
    id: "summary-1",
    category: "summary",
    title: "Résumé de note — thermodynamique",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content:
        "Résume ce cours en 5 points clés :\n\n" +
        "« La thermodynamique étudie les échanges d'énergie entre un système et son milieu extérieur. Le premier principe (conservation de l'énergie) s'écrit ΔU = W + Q, où ΔU est la variation d'énergie interne, W le travail et Q le transfert thermique. Le second principe introduit l'entropie S : pour une transformation spontanée, l'entropie totale de l'univers augmente (ΔS ≥ 0). Les transformations peuvent être isothermes (T constante), isobares (P constante) ou isochores (V constant). L'enthalpie H = U + PV simplifie l'étude des réactions à pression constante. Le troisième principe énonce qu'au zéro absolu, l'entropie d'un cristal parfait est nulle. »" },
    ],
    temperature: 0.3,
    maxTokens: 600,
  },
  {
    id: "summary-2",
    category: "summary",
    title: "Résumé — biologie cellulaire",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content:
        "Fais un résumé court et structuré de ce chapitre :\n\n" +
        "« La cellule est l'unité structurale et fonctionnelle du vivant. Les cellules eucaryotes possèdent un noyau délimité par une enveloppe nucléaire, des organites (mitochondries, réticulum endoplasmique, appareil de Golgi) et un cytosquelette. Les procaryotes (bactéries) n'ont pas de noyau. La membrane plasmique, en bicouche lipidique, assure les échanges et la signalisation. Les mitochondries produisent l'ATP par respiration cellulaire. Le noyau contient l'ADN, support de l'information génétique, transcrit en ARNm puis traduit en protéines dans les ribosomes. »" },
    ],
    temperature: 0.3,
    maxTokens: 600,
  },
  {
    id: "study-plan-1",
    category: "study-plan",
    title: "Plan de révision — chimie organique",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "Propose un plan de révision d'une semaine pour préparer un examen de chimie organique (nomenclature, mécanismes SN1/SN2, stéréochimie). Détaille les objectifs par jour." },
    ],
    temperature: 0.5,
    maxTokens: 800,
  },
  {
    id: "chat-5",
    category: "chat",
    title: "Cycle de Krebs",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "Aide-moi à comprendre le cycle de Krebs étape par étape, sans jargon excessif." },
    ],
  },
  {
    id: "chat-6",
    category: "chat",
    title: "Conservation de l'énergie",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "Qu'est-ce que la loi de conservation de l'énergie ? Explique-la avec un exemple du quotidien." },
    ],
  },
  {
    id: "explain-3",
    category: "explain",
    title: "Génotype vs phénotype",
    messages: [
      { role: "system", content: SYSTEM_STUDY },
      { role: "user", content: "Je ne comprends pas la différence entre génotype et phénotype. Peux-tu m'expliquer avec un exemple concret ?" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Estimation de coût
// ---------------------------------------------------------------------------

interface Pricing {
  inputPerM: number; // USD par million de tokens en entrée
  outputPerM: number; // USD par million de tokens en sortie
}

/** Prix par défaut (configurables via env) — par million de tokens, en USD. */
function defaultPricing(): Pricing {
  return {
    inputPerM: parseFloat(process.env.LLM_INPUT_PRICE_PER_MTOK || "0.5") || 0.5,
    outputPerM: parseFloat(process.env.LLM_OUTPUT_PRICE_PER_MTOK || "1.5") || 1.5,
  };
}

/** Best-effort : récupère le prix réel du modèle sur OpenRouter (perte de temps sinon). */
async function fetchOpenRouterPricing(model: string): Promise<Pricing | null> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models");
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: Array<{ id: string; pricing?: { prompt: string; completion: string } }>;
    };
    const m = data.data?.find((x) => x.id === model);
    if (!m?.pricing) return null;
    // Les prix OpenRouter (/api/v1/models) sont exprimés en USD PAR TOKEN
    // (ex: "0.00000015" pour gpt-4o-mini = $0.15 / million). On convertit
    // en par-million pour rester cohérent avec defaultPricing().
    return {
      inputPerM: (parseFloat(m.pricing.prompt) || 0) * 1_000_000,
      outputPerM: (parseFloat(m.pricing.completion) || 0) * 1_000_000,
    };
  } catch {
    return null;
  }
}

function estimateTokens(chars: number): number {
  // Heuristique grossière ~4 caractères par token (texte français).
  return Math.max(1, Math.round(chars / 4));
}

// ---------------------------------------------------------------------------
// Mesures
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
 * Timeout par case (ms) — configurable via --timeout (s), défaut 300 s.
 *
 * Fix dette technique : l'ancien withTimeout rejetait la promesse sans annuler
 * l'inférence en cours — QVAC continuait de générer en arrière-plan jusqu'à la
 * fin (slot d'inférence bloqué, RAM occupée). On propage désormais un
 * AbortController : au timeout on appelle controller.abort() ce qui déclenche,
 * dans le provider, cancel({ requestId }) pour QVAC (arrêt réel dans le worker)
 * et l'annulation fetch pour les providers OpenAI-compatible.
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
      reject(new Error(`Timeout après ${Math.round(ms / 1000)} s (${label})`));
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

    // Tokens réels + coût (provider cloud OpenAI-compatible)
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

    // Métriques QVAC (local)
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
// CLI / exécution
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
  console.log("🧠 Benchmark LLM Providers — SmartNotes");
  console.log(`Node ${process.version} · ${os.platform()} ${os.arch()} · ${os.cpus().length} CPU · RAM ${Math.round(os.totalmem() / 1024 / 1024 / 1024)} Go`);
  console.log(`Cases: ${selectedCases.length} · Providers: ${providers.join(", ")} · Timeout/case: ${Math.round(timeoutMs / 1000)}s`);
  console.log("═".repeat(72));

  const reports: ProviderReport[] = [];

  for (const providerName of providers) {
    console.log(`\n▸ Provider: ${providerName}`);

    let provider: LLMProvider;
    try {
      // QVAC : on branche un onProgress pour suivre le téléchargement P2P du modèle
      if (providerName === "qvac") {
        const qvacOpts: QvacProviderOptions = {
          onProgress: (p) => {
            const mb = (n: number) => (n / 1e6).toFixed(1);
            const line = `  ▸ Téléchargement modèle ${p.percentage.toFixed(0)}% (${mb(p.downloaded)}/${mb(p.total)} MB)`;
            process.stderr.write(process.stderr.isTTY ? `\r${line}   ` : `${line}\n`);
            if (p.percentage >= 100) process.stderr.write("\n");
          },
        };
        provider = new QvacProvider(qvacOpts);
      } else {
        provider = createLLMProvider(providerName);
      }
    } catch (error) {
      console.log(`  ⚠ Skippé : ${error instanceof Error ? error.message : error}`);
      continue;
    }

    console.log(`  Modèle: ${provider.model}`);
    const pricing =
      providerName === "openrouter"
        ? await fetchOpenRouterPricing(provider.model)
        : null;
    if (pricing) {
      console.log(
        `  Prix OpenRouter: $${pricing.inputPerM}/M in · $${pricing.outputPerM}/M out`
      );
    }

    const results: RunResult[] = [];
    for (const testCase of selectedCases) {
      process.stdout.write(`  [${testCase.id}] ${testCase.title}… `);
      const result = await runCase(provider, providerName, testCase, pricing, timeoutMs);
      results.push(result);
      if (result.ok) {
        console.log(`OK (${result.latencyMs} ms, ${result.outputChars} chars)`);
      } else {
        console.log(`ERREUR: ${result.error}`);
      }
    }

    // Libération mémoire QVAC entre deux providers
    if (provider instanceof QvacProvider) {
      await provider.unload().catch(() => undefined);
    }

    reports.push({ provider: providerName, model: provider.model, results });
  }

  // -------------------------------------------------------------------------
  // Résumé console
  // -------------------------------------------------------------------------
  console.log("\n" + "═".repeat(72));
  console.log("📊 RÉSUMÉ (temps de réponse & longueur de sortie)");
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
  // Écriture JSON brute (pour revue manuelle de qualité)
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
      note: "Le benchmark ne tranche pas : la décision de bascule reste manuelle après revue de la qualité des réponses brutes.",
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
  console.log(`\n💾 Sortie brute complète (revue manuelle) : ${outFile}`);
  console.log("\nRappel : ce script ne désigne pas de gagnant. Comparez les réponses brutes du JSON avant toute bascule (LLM_PROVIDER).");
}

main().catch((error) => {
  console.error("Erreur fatale du benchmark:", error);
  process.exit(1);
});
