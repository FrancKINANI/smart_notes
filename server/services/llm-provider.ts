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
// NB sur le workaround `b4a` (boîte noire historiquement, documenté ici pour
// éviter de la casser lors de la réplication du pattern sur d'autres projets) :
//
// `b4a` est déclaré en DEPENDANCE DIRECTE dans package.json alors que le code
// de ce projet ne l'importe jamais. C'est un workaround pour une dépendance
// transitive manquante de la stack P2P de QVAC (`hyperdht` → `bogon`) : sans
// `b4a` présent dans node_modules à l'installation, le worker Bare de QVAC
// (qvac-fabric) ne démarre pas et `completion()`/`loadModel()` échouent avec
// un "Cannot find module 'b4a'" au moment du bootstrap. NE PAS le retirer lors
// d'un nettoyage de dépendances. Voir aussi la section README "Note on b4a".
// ---------------------------------------------------------------------------

/**
 * Interface unique de fournisseur LLM.
 * Tous les providers (cloud OpenAI-compatible, QVAC local) l'implémentent.
 */
export interface LLMProvider {
  /** Identifiant du provider (ex: "openrouter", "qvac") */
  readonly name: string;
  /** Modèle utilisé (ex: "openai/gpt-4o-mini", "LLAMA_3_2_1B_INST_Q4_0") */
  readonly model: string;
  chat(
    messages: { role: string; content: string }[],
    opts?: { temperature?: number; maxTokens?: number; signal?: AbortSignal }
  ): Promise<string>;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  /** AbortSignal propagé jusqu'au binding sous-jacent (SDK openai / cancel QVAC). */
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
  /** true si le provider exige une clé API (sinon OK pour endpoints locaux type Ollama) */
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

  /** Dernière utilisation (tokens réels) rapportée par l'API, pour calculs de coût. */
  lastUsage?: { promptTokens: number; completionTokens: number };

  constructor(config: OpenAICompatibleConfig) {
    this.name = config.name;
    this.model = config.model;
    this.baseURL = config.baseURL;

    if (config.requireApiKey && !config.apiKey) {
      throw new Error(
        `Clé API manquante pour le provider "${config.name}". Définissez ${apiKeyEnvFor(config.name)} dans .env`
      );
    }

    // Le SDK openai v4 jette au constructeur si apiKey est absent/undefined
    // (même avec baseURL custom). Pour les endpoints locaux sans clé (Ollama,
    // LM Studio…), on passe un placeholder non vide que le serveur ignore.
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
      // L'AbortSignal est transmis au SDK openai (RequestOptions) : un abort
      // annule la requête HTTP en vol (fetch) au lieu de la laisser finir.
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
// Provider QVAC (inférence locale, llama.cpp via qvac-fabric)
// ---------------------------------------------------------------------------

/**
 * Forme structurelle minimale d'un descripteur de modèle du registry QVAC.
 * `loadModel` accepte ces objets (avec modelType) comme `modelSrc` :
 * https://github.com/tetherto/qvac (quickstart : modelSrc: LLAMA_3_2_1B_INST_Q4_0, modelType: "llm").
 * Seules les propriétés nécessaires sont déclarées pour rester compatible avec
 * le type `LoadModelOptions` du SDK (typage structurel).
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

/** Source de modèle QVAC : constante du registry (objet) ou URL / chemin local (string). */
type QvacModelSrc = string | RegistryDescriptor;

/** Constantes du registry QVAC résolubles par nom via QVAC_MODEL_SRC */
const REGISTRY_MODELS: Record<string, RegistryDescriptor> = {
  LLAMA_3_2_1B_INST_Q4_0,
  QWEN3_600M_INST_Q4,
  QWEN3_1_7B_INST_Q4,
};

export interface QvacProviderOptions {
  /** Constante du registry (ex: "QWEN3_600M_INST_Q4"), URL http(s) ou chemin local .gguf */
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

  /** Dernières stats d'inférence (tok/s, device, tokens) pour le benchmark. */
  lastStats?: CompletionFinal["stats"];

  constructor(opts?: QvacProviderOptions) {
    const src = opts?.modelSrc ?? process.env.QVAC_MODEL_SRC;
    if (src && typeof src === "string" && src in REGISTRY_MODELS) {
      this.modelSrc = REGISTRY_MODELS[src];
      this.model = src;
    } else {
      // URL / chemin local / constante par défaut
      this.modelSrc = src ?? LLAMA_3_2_1B_INST_Q4_0;
      this.model =
        typeof this.modelSrc === "string" ? this.modelSrc : this.modelSrc.name ?? "default";
    }
    this.onProgress = opts?.onProgress;
  }

  /**
   * Charge le modèle une seule fois (téléchargement P2P au premier appel).
   * `modelType: "llm"` est accepté à la fois pour une constante du registry et
   * pour un URL/chemin .gguf (voir quickstart officiel QVAC).
   */
  private async doLoadModel(): Promise<string> {
    const options: LoadModelOptions = {
      modelSrc: this.modelSrc,
      modelType: "llm",
      onProgress: this.onProgress,
    };
    return loadModel(options);
  }

  /** Charge le modèle une seule fois (téléchargement P2P au premier appel). */
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

    // Annulation RÉELLE de l'inférence en cours : au lieu de laisser la
    // génération tourner en arrière-plan jusqu'au bout (comportement du simple
    // timeout de l'ancien benchmark), on propage l'AbortSignal jusqu'au binding
    // QVAC via cancel({ requestId }), ce qui stoppe l'inférence dans le worker
    // Bare et libère le slot d'inférence immédiatement.
    //
    // On race en plus run.final contre une promesse de rejet à l'abort : cancel()
    // n'est pas garanti de faire rejeter run.final selon l'état de la requête,
    // cette race garantit que chat() se termine (et que le withTimeout du
    // benchmark / la route /test admin ne restent pas pendants indéfiniment).
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

    const abortError = new Error("Inférence QVAC annulée (abort)");
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

    // Nettoyage des listeners d'abort dès que la requête est terminée (évite
    // l'accumulation sur un signal partagé/réutilisé et tout cancel() tardif).
    const final: CompletionFinal = await chatPromise.finally(() => {
      if (signal) {
        if (onAbortCancel) signal.removeEventListener("abort", onAbortCancel);
        if (onAbortReject) signal.removeEventListener("abort", onAbortReject);
      }
    });
    this.lastStats = final.stats;
    return final.contentText || final.raw?.fullText || "";
  }

  /** Libère la mémoire du modèle (utile en fin de benchmark, arrêt propre). */
  async unload(): Promise<void> {
    if (this.modelId) {
      await unloadModel({ modelId: this.modelId, clearStorage: false });
      this.modelId = null;
      this.loadPromise = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Sélection du provider : config DB prioritaire (bascule à chaud admin),
// fallback sur les variables d'environnement (compat rétroactive).
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

/** Config LLM telle que stockée en DB (table llm_settings) — la clé API reste en env. */
export interface LlmProviderConfig {
  provider?: string;
  baseUrl?: string | null;
  modelName?: string | null;
  qvacModelSrc?: string | null;
}

/**
 * Crée un provider à partir d'une config (DB ou env). Valeurs acceptées :
 *  - openai | openrouter | grok | deepseek  (presets cloud OpenAI-compatible)
 *  - openai-compatible                      (endpoint générique via baseUrl/modelName ou LLM_*)
 *  - qvac                                   (inférence locale)
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
        "LLM_PROVIDER=openai-compatible nécessite baseUrl et modelName (config admin ou LLM_BASE_URL/LLM_MODEL dans .env)"
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
    `LLM_PROVIDER inconnu: "${provider}". Valeurs possibles: ${SUPPORTED_PROVIDERS.join(", ")}`
  );
}

/** Compat benchmark : crée un provider par nom (fallback env). */
export function createLLMProvider(name?: string): LLMProvider {
  return createProviderFromConfig({ provider: name });
}

/**
 * Résout la config active : table llm_settings en priorité (bascule à chaud
 * sans redémarrage), sinon variables d'environnement (comportement historique).
 */
export async function resolveProviderConfig(): Promise<LlmProviderConfig> {
  // Cache court (5 s) : évite une requête SELECT sur chaque appel chat tout en
  // gardant une bascule à chaud quasi immédiate (le PUT admin appelle
  // resetProviderCache() qui vide ce cache).
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
      "getLLMProvider: config DB indisponible, fallback sur l'environnement:",
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

// Cache TTL de la config résolue (5 s) pour ne pas requêter la DB à chaque chat.
const PROVIDER_CONFIG_CACHE_TTL_MS = 5_000;
let cachedConfig: LlmProviderConfig | null = null;
let cachedConfigAt = 0;

/**
 * Provider actif (singleton paresseux). Priorité : config DB (llm_settings,
 * modifiable à chaud via l'interface admin) puis LLM_PROVIDER env.
 * Rien n'est chargé à l'import : QVAC ne télécharge le modèle qu'au 1er chat().
 *
 * La bascule à chaud fonctionne via la clé de cache : si la config DB change
 * (PUT /api/admin/llm-settings), la clé change et l'instance est recréée au
 * prochain appel — sans redémarrage du serveur.
 */
export async function getLLMProvider(): Promise<LLMProvider> {
  const config = await resolveProviderConfig();
  const key = providerConfigKey(config);
  if (!defaultProvider || defaultProviderKey !== key) {
    const previous = defaultProvider;
    defaultProvider = createProviderFromConfig(config);
    defaultProviderKey = key;
    // Bascule à chaud : libère le modèle QVAC de l'ancienne instance pour ne pas
    // laisser ~1-5 Go de RAM chargés dans le worker Bare.
    if (previous instanceof QvacProvider) {
      previous.unload().catch(() => undefined);
    }
  }
  return defaultProvider;
}

/** Force la recréation du provider au prochain appel (appelé après un PUT admin). */
export function resetProviderCache(): void {
  const previous = defaultProvider;
  defaultProvider = null;
  defaultProviderKey = null;
  // Vide aussi le cache TTL de config pour que le prochain getLLMProvider()
  // relise immédiatement la table llm_settings (bascule à chaud sans délai).
  cachedConfig = null;
  cachedConfigAt = 0;
  if (previous instanceof QvacProvider) {
    previous.unload().catch(() => undefined);
  }
}

/** Clé de cache : config résolue + variables qui changent la config du provider actif. */
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
