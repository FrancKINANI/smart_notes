import OpenAI from "openai";
import {
  completion,
  cancel,
  loadModel,
  unloadModel,
  LLAMA_3_2_1B_INST_Q4_0,
  QWEN3_600M_INST_Q4,
  QWEN3_1_7B_INST_Q4,
  type CompletionFinal,
  type LoadModelOptions,
} from "@qvac/sdk";

// ---------------------------------------------------------------------------
// Note on the `b4a` workaround (historically a black box, documented here to
// avoid breaking it when replicating the pattern on other projects):
//
// `b4a` is declared as a DIRECT DEPENDENCY in package.json even though the code
// of this project never imports it. It is a workaround for a missing transitive
// dependency of the QVAC P2P stack (`hyperdht` → `bogon`): without `b4a` present
// in node_modules at install time, the QVAC Bare worker (qvac-fabric) does not
// start and `completion()`/`loadModel()` fail with a "Cannot find module 'b4a'"
// error at bootstrap. DO NOT remove it during dependency cleanup. See also the
// README section "Note on b4a".
// ---------------------------------------------------------------------------

/**
 * Single LLM provider interface.
 * All providers (cloud OpenAI-compatible, local QVAC) implement it.
 */
export interface LLMProvider {
  /** Provider id (e.g. "openrouter", "qvac") */
  readonly name: string;
  /** Model used (e.g. "openai/gpt-4o-mini", "LLAMA_3_2_1B_INST_Q4_0") */
  readonly model: string;
  chat(
    messages: { role: string; content: string }[],
    opts?: { temperature?: number; maxTokens?: number; signal?: AbortSignal }
  ): Promise<string>;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  /** AbortSignal propagated down to the underlying binding (openai SDK / QVAC cancel). */
  signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// Provider OpenAI-compatible (OpenAI, OpenRouter, Grok/xAI, DeepSeek, Ollama…)
// ---------------------------------------------------------------------------

export interface OpenAICompatibleConfig {
  name: string;
  baseURL: string;
  apiKey?: string;
  model: string;
  /** true if the provider requires an API key (otherwise fine for local endpoints like Ollama) */
  requireApiKey?: boolean;
}

interface ProviderPreset {
  name: string;
  baseURL: string;
  apiKeyEnv: string;
  modelEnv: string;
  defaultModel: string;
}

const CLOUD_PRESETS: Record<string, ProviderPreset> = {
  openai: {
    name: "openai",
    baseURL: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
    modelEnv: "OPENAI_MODEL",
    defaultModel: "gpt-4o-mini",
  },
  openrouter: {
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    apiKeyEnv: "OPENROUTER_API_KEY",
    modelEnv: "OPENROUTER_MODEL",
    defaultModel: "openai/gpt-4o-mini",
  },
  grok: {
    name: "grok",
    baseURL: "https://api.x.ai/v1",
    apiKeyEnv: "XAI_API_KEY",
    modelEnv: "XAI_MODEL",
    defaultModel: "grok-4",
  },
  deepseek: {
    name: "deepseek",
    baseURL: "https://api.deepseek.com/v1",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    modelEnv: "DEEPSEEK_MODEL",
    defaultModel: "deepseek-chat",
  },
};

export class OpenAICompatibleProvider implements LLMProvider {
  readonly name: string;
  readonly model: string;
  readonly baseURL: string;
  private client: OpenAI;

  /** Last usage (actual tokens) reported by the API, for cost calculations. */
  lastUsage?: { promptTokens: number; completionTokens: number };

  constructor(config: OpenAICompatibleConfig) {
    this.name = config.name;
    this.model = config.model;
    this.baseURL = config.baseURL;

    if (config.requireApiKey && !config.apiKey) {
      throw new Error(
        `Missing API key for provider "${config.name}". Set ${apiKeyEnvFor(config.name)} in .env`
      );
    }

    // The openai SDK v4 throws in the constructor if apiKey is missing/undefined
    // (even with a custom baseURL). For local keyless endpoints (Ollama,
    // LM Studio...), we pass a non-empty placeholder that the server ignores.
    this.client = new OpenAI({
      apiKey: config.apiKey || "local",
      baseURL: config.baseURL,
    });
  }

  async chat(
    messages: { role: string; content: string }[],
    opts: ChatOptions = {}
  ): Promise<string> {
    const temperature = opts.temperature ?? 0.7;
    const maxTokens = opts.maxTokens ?? 500;

    const response = await this.client.chat.completions.create(
      {
        model: this.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })) as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        temperature,
        max_tokens: maxTokens,
      },
      // The AbortSignal is passed to the openai SDK (RequestOptions): an abort
      // cancels the in-flight HTTP request (fetch) instead of letting it finish.
      { signal: opts.signal }
    );

    if (response.usage) {
      this.lastUsage = {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
      };
    }

    return response.choices[0]?.message?.content ?? "";
  }
}

function apiKeyEnvFor(name: string): string {
  const preset = CLOUD_PRESETS[name];
  if (preset) return preset.apiKeyEnv;
  return "LLM_API_KEY";
}

// ---------------------------------------------------------------------------
// QVAC provider (local inference, llama.cpp via qvac-fabric)
// ---------------------------------------------------------------------------

/**
 * Minimal structural shape of a QVAC registry model descriptor.
 * `loadModel` accepts these objects (with modelType) as `modelSrc`:
 * https://github.com/tetherto/qvac (quickstart: modelSrc: LLAMA_3_2_1B_INST_Q4_0, modelType: "llm").
 * Only the needed properties are declared to stay compatible with the SDK's
 * `LoadModelOptions` type (structural typing).
 */
interface RegistryDescriptor {
  src: string;
  name?: string;
  modelId?: string;
  registryPath?: string;
  registrySource?: string;
  blobCoreKey?: string;
  blobIndex?: number;
  engine?: string;
  expectedSize?: number;
  sha256Checksum?: string;
}

/** QVAC model source: registry constant (object) or URL / local path (string). */
type QvacModelSrc = string | RegistryDescriptor;

/** QVAC registry constants resolvable by name via QVAC_MODEL_SRC */
const REGISTRY_MODELS: Record<string, RegistryDescriptor> = {
  LLAMA_3_2_1B_INST_Q4_0,
  QWEN3_600M_INST_Q4,
  QWEN3_1_7B_INST_Q4,
};

export interface QvacProviderOptions {
  /** Registry constant (e.g. "QWEN3_600M_INST_Q4"), http(s) URL or local .gguf path */
  modelSrc?: string;
  onProgress?: (p: { percentage: number; downloaded: number; total: number }) => void;
}

export class QvacProvider implements LLMProvider {
  readonly name = "qvac";
  readonly model: string;
  private modelSrc: QvacModelSrc;
  private onProgress?: QvacProviderOptions["onProgress"];
  private modelId: string | null = null;
  private loadPromise: Promise<string> | null = null;

  /** Latest inference stats (tok/s, device, tokens) for the benchmark. */
  lastStats?: CompletionFinal["stats"];

  constructor(opts?: QvacProviderOptions) {
    const src = opts?.modelSrc ?? process.env.QVAC_MODEL_SRC;
    if (src && typeof src === "string" && src in REGISTRY_MODELS) {
      this.modelSrc = REGISTRY_MODELS[src];
      this.model = src;
    } else {
      // URL / local path / default constant
      this.modelSrc = src ?? LLAMA_3_2_1B_INST_Q4_0;
      this.model =
        typeof this.modelSrc === "string" ? this.modelSrc : this.modelSrc.name ?? "default";
    }
    this.onProgress = opts?.onProgress;
  }

  /**
   * Loads the model only once (P2P download on first call).
   * `modelType: "llm"` is accepted both for a registry constant and
   * for a .gguf URL/path (see the official QVAC quickstart).
   */
  private async doLoadModel(): Promise<string> {
    const options: LoadModelOptions = {
      modelSrc: this.modelSrc,
      modelType: "llm",
      onProgress: this.onProgress,
    };
    return loadModel(options);
  }

  /** Loads the model only once (P2P download on first call). */
  private ensureModel(): Promise<string> {
    if (this.modelId) return Promise.resolve(this.modelId);
    if (!this.loadPromise) {
      this.loadPromise = this.doLoadModel()
        .then((id) => {
          this.modelId = id;
          return id;
        })
        .catch((err) => {
          this.loadPromise = null;
          throw err;
        });
    }
    return this.loadPromise;
  }

  async chat(
    messages: { role: string; content: string }[],
    opts: ChatOptions = {}
  ): Promise<string> {
    const modelId = await this.ensureModel();
    const temperature = opts.temperature ?? 0.7;
    const maxTokens = opts.maxTokens ?? 500;

    const run = completion({
      modelId,
      history: messages,
      stream: false,
      generationParams: {
        temp: temperature,
        predict: maxTokens,
      },
    });

    // REAL cancellation of the running inference: instead of letting the
    // generation run in the background until completion (the old benchmark's
    // simple-timeout behavior), we propagate the AbortSignal down to the QVAC
    // binding via cancel({ requestId }), which stops the inference in the Bare
    // worker and immediately frees the inference slot.
    //
    // We also race run.final against an abort-rejection promise: cancel()
    // is not guaranteed to make run.final reject depending on the request state,
    // this race guarantees chat() terminates (and the benchmark's withTimeout /
    // the admin /test route do not hang indefinitely).
    const signal = opts.signal;
    let onAbortCancel: (() => void) | null = null;
    let onAbortReject: (() => void) | null = null;

    if (signal) {
      onAbortCancel = () => {
        cancel({ requestId: run.requestId }).catch(() => undefined);
      };
      if (signal.aborted) onAbortCancel();
      else signal.addEventListener("abort", onAbortCancel, { once: true });
    }

    const abortError = new Error("QVAC inference cancelled (abort)");
    const chatPromise: Promise<CompletionFinal> = signal
      ? Promise.race([
          run.final,
          new Promise<never>((_, reject) => {
            onAbortReject = () => reject(abortError);
            if (signal.aborted) onAbortReject();
            else signal.addEventListener("abort", onAbortReject, { once: true });
          }),
        ])
      : run.final;

    // Clean up the abort listeners as soon as the request is done (avoids
    // accumulation on a shared/reused signal and any late cancel()).
    const final: CompletionFinal = await chatPromise.finally(() => {
      if (signal) {
        if (onAbortCancel) signal.removeEventListener("abort", onAbortCancel);
        if (onAbortReject) signal.removeEventListener("abort", onAbortReject);
      }
    });
    this.lastStats = final.stats;
    return final.contentText || final.raw?.fullText || "";
  }

  /** Frees the model memory (useful at the end of a benchmark, clean shutdown). */
  async unload(): Promise<void> {
    if (this.modelId) {
      await unloadModel({ modelId: this.modelId, clearStorage: false });
      this.modelId = null;
      this.loadPromise = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Provider selection: DB config takes priority (admin hot switch),
// fallback on environment variables (backward compatibility).
// ---------------------------------------------------------------------------

export const SUPPORTED_PROVIDERS = [
  "openai",
  "openrouter",
  "grok",
  "deepseek",
  "openai-compatible",
  "qvac",
] as const;

export type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

/** LLM config as stored in the DB (llm_settings table) — the API key stays in env. */
export interface LlmProviderConfig {
  provider?: string;
  baseUrl?: string | null;
  modelName?: string | null;
  qvacModelSrc?: string | null;
}

/**
 * Creates a provider from a config (DB or env). Accepted values:
 *  - openai | openrouter | grok | deepseek  (cloud OpenAI-compatible presets)
 *  - openai-compatible                      (generic endpoint via baseUrl/modelName or LLM_*)
 *  - qvac                                   (local inference)
 */
export function createProviderFromConfig(config: LlmProviderConfig = {}): LLMProvider {
  const provider = (config.provider || process.env.LLM_PROVIDER || "openrouter").toLowerCase();

  if (provider === "qvac") {
    return new QvacProvider({ modelSrc: config.qvacModelSrc || undefined });
  }

  if (provider === "openai-compatible") {
    const baseURL = config.baseUrl || process.env.LLM_BASE_URL;
    const model = config.modelName || process.env.LLM_MODEL;
    if (!baseURL || !model) {
      throw new Error(
        "LLM_PROVIDER=openai-compatible requires baseUrl and modelName (admin config or LLM_BASE_URL/LLM_MODEL in .env)"
      );
    }
    return new OpenAICompatibleProvider({
      name: "openai-compatible",
      baseURL,
      apiKey: process.env.LLM_API_KEY,
      model,
    });
  }

  if (provider in CLOUD_PRESETS) {
    const preset = CLOUD_PRESETS[provider];
    return new OpenAICompatibleProvider({
      name: preset.name,
      baseURL: preset.baseURL,
      apiKey: process.env[preset.apiKeyEnv],
      model: config.modelName || process.env[preset.modelEnv] || preset.defaultModel,
      requireApiKey: true,
    });
  }

  throw new Error(
    `Unknown LLM_PROVIDER: "${provider}". Possible values: ${SUPPORTED_PROVIDERS.join(", ")}`
  );
}

/** Benchmark compat: creates a provider by name (env fallback). */
export function createLLMProvider(name?: string): LLMProvider {
  return createProviderFromConfig({ provider: name });
}

/**
 * Resolves the active config: llm_settings table first (hot switch without
 * restart), otherwise environment variables (historical behavior).
 */
export async function resolveProviderConfig(): Promise<LlmProviderConfig> {
  // Short cache (5 s): avoids a SELECT query on every chat call while
  // keeping a nearly immediate hot switch (the admin PUT calls
  // resetProviderCache() which clears this cache).
  if (
    cachedConfig &&
    Date.now() - cachedConfigAt < PROVIDER_CONFIG_CACHE_TTL_MS
  ) {
    return cachedConfig;
  }
  try {
    const { storage } = await import("../storage");
    const settings = await storage.getLlmSettings();
    cachedConfig = settings
      ? {
          provider: settings.provider,
          baseUrl: settings.baseUrl,
          modelName: settings.modelName,
          qvacModelSrc: settings.qvacModelSrc,
        }
      : {
          provider: process.env.LLM_PROVIDER ?? "openrouter",
          baseUrl: process.env.LLM_BASE_URL ?? null,
          modelName: process.env.LLM_MODEL ?? null,
          qvacModelSrc: process.env.QVAC_MODEL_SRC ?? null,
        };
    cachedConfigAt = Date.now();
  } catch (error) {
    console.warn(
      "getLLMProvider: DB config unavailable, falling back to environment:",
      error
    );
    cachedConfig = {
      provider: process.env.LLM_PROVIDER ?? "openrouter",
      baseUrl: process.env.LLM_BASE_URL ?? null,
      modelName: process.env.LLM_MODEL ?? null,
      qvacModelSrc: process.env.QVAC_MODEL_SRC ?? null,
    };
    cachedConfigAt = Date.now();
  }
  return cachedConfig;
}

let defaultProvider: LLMProvider | null = null;
let defaultProviderKey: string | null = null;

// TTL of the resolved config cache (5 s) to avoid querying the DB on every chat.
const PROVIDER_CONFIG_CACHE_TTL_MS = 5_000;
let cachedConfig: LlmProviderConfig | null = null;
let cachedConfigAt = 0;

/**
 * Active provider (lazy singleton). Priority: DB config (llm_settings,
 * hot-switchable via the admin interface) then LLM_PROVIDER env.
 * Nothing is loaded at import: QVAC only downloads the model on the 1st chat().
 *
 * The hot switch works through the cache key: if the DB config changes
 * (PUT /api/admin/llm-settings), the key changes and the instance is recreated
 * on the next call — without a server restart.
 */
export async function getLLMProvider(): Promise<LLMProvider> {
  const config = await resolveProviderConfig();
  const key = providerConfigKey(config);
  if (!defaultProvider || defaultProviderKey !== key) {
    const previous = defaultProvider;
    defaultProvider = createProviderFromConfig(config);
    defaultProviderKey = key;
    // Hot switch: unloads the old instance's QVAC model so ~1-5 GB of RAM
    // is not left loaded in the Bare worker.
    if (previous instanceof QvacProvider) {
      previous.unload().catch(() => undefined);
    }
  }
  return defaultProvider;
}

/** Forces the provider to be recreated on the next call (called after an admin PUT). */
export function resetProviderCache(): void {
  const previous = defaultProvider;
  defaultProvider = null;
  defaultProviderKey = null;
  // Also clears the config TTL cache so the next getLLMProvider() immediately
  // re-reads the llm_settings table (instant hot switch).
  cachedConfig = null;
  cachedConfigAt = 0;
  if (previous instanceof QvacProvider) {
    previous.unload().catch(() => undefined);
  }
}

/** Cache key: resolved config + variables that change the active provider config. */
function providerConfigKey(config: LlmProviderConfig): string {
  const p = (config.provider || process.env.LLM_PROVIDER || "openrouter").toLowerCase();
  if (p === "qvac") return `${p}:${config.qvacModelSrc || "default"}`;
  if (p === "openai-compatible") {
    return `${p}:${config.baseUrl || ""}:${config.modelName || ""}:${process.env.LLM_API_KEY || ""}`;
  }
  const preset = CLOUD_PRESETS[p];
  if (preset) {
    return `${p}:${config.modelName || process.env[preset.modelEnv] || preset.defaultModel}:${process.env[preset.apiKeyEnv] || ""}`;
  }
  return p;
}
