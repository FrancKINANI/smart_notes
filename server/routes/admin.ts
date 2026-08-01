import { Router } from "express";
import { checkPermissions } from "../middleware/security";
import { storage } from "../storage";
import {
  SUPPORTED_PROVIDERS,
  createProviderFromConfig,
  getLLMProvider,
  resetProviderCache,
  resolveProviderConfig,
  QvacProvider,
  type LlmProviderConfig,
} from "../services/llm-provider";

const router = Router();

// GET /api/admin/llm-settings — config actuelle (DB prioritaire, sinon env).
router.get("/llm-settings", checkPermissions("admin"), async (_req, res) => {
  try {
    const settings = await storage.getLlmSettings();

    // Config effective = ce que getLLMProvider() utilisera réellement.
    // resolveProviderConfig() est LA source de vérité unique (DB puis env).
    const active: LlmProviderConfig = await resolveProviderConfig();

    res.json({
      settings: settings ?? null,
      active,
      source: settings ? "database" : "env",
      providers: SUPPORTED_PROVIDERS,
    });
  } catch (error) {
    console.error("GET /api/admin/llm-settings:", error);
    res.status(500).json({
      message: "Erreur lors de la lecture de la configuration LLM",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : undefined,
    });
  }
});

// PUT /api/admin/llm-settings — enregistre la config en DB et bascule à chaud
// (resetProviderCache → l'instance est recréée au prochain appel, sans redémarrage).
router.put("/llm-settings", checkPermissions("admin"), async (req, res) => {
  try {
    const { provider, baseUrl, modelName, qvacModelSrc } = req.body ?? {};

    if (!provider || !SUPPORTED_PROVIDERS.includes(provider)) {
      return res.status(400).json({
        message: `provider invalide: "${provider}". Valeurs possibles: ${SUPPORTED_PROVIDERS.join(", ")}`,
      });
    }

    if (provider === "openai-compatible" && !baseUrl) {
      return res.status(400).json({
        message: "baseUrl est requis pour le provider openai-compatible",
      });
    }

    const settings = await storage.saveLlmSettings({
      provider,
      baseUrl: baseUrl || null,
      modelName: modelName || null,
      qvacModelSrc: qvacModelSrc || null,
    });

    // Bascule à chaud : la prochaine requête LLM utilisera la nouvelle config.
    resetProviderCache();

    res.json({
      settings,
      source: "database",
      message: "Configuration LLM enregistrée et appliquée (bascule à chaud active).",
    });
  } catch (error) {
    console.error("PUT /api/admin/llm-settings:", error);
    res.status(500).json({
      message: "Erreur lors de l'enregistrement de la configuration LLM",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : undefined,
    });
  }
});

// POST /api/admin/llm-settings/test — envoie un prompt de test avec la config
// fournie (ou la config active si absente) et mesure la latence. Ne modifie PAS
// la config enregistrée : l'opérateur valide avant de basculer en prod.
router.post("/llm-settings/test", checkPermissions("admin"), async (req, res) => {
  try {
    const body = req.body ?? {};

    // Config résolue actuelle (DB prioritaire, sinon env) — source de vérité unique.
    const activeConfig = await resolveProviderConfig();

    const providerName = body.provider || activeConfig.provider || "openrouter";
    if (!SUPPORTED_PROVIDERS.includes(providerName)) {
      return res.status(400).json({
        ok: false,
        message: `provider invalide: "${providerName}". Valeurs possibles: ${SUPPORTED_PROVIDERS.join(", ")}`,
      });
    }

    // La config testée = overrides du body sur la config active. Construite à
    // partir d'activeConfig (et non d'une relecture DB) : garantit que la
    // comparaison isActiveConfig compare exactement ce dont config est dérivée.
    const config: LlmProviderConfig = {
      provider: providerName,
      baseUrl: body.baseUrl ?? activeConfig.baseUrl ?? null,
      modelName: body.modelName ?? activeConfig.modelName ?? null,
      qvacModelSrc: body.qvacModelSrc ?? activeConfig.qvacModelSrc ?? null,
    };

    // Si la config testée est identique à la config active (DB OU fallback env),
    // on réutilise le singleton getLLMProvider() : éviter de charger un SECOND
    // modèle QVAC en RAM (~130 Mo à plusieurs Go) juste pour un test.
    const isActiveConfig =
      activeConfig.provider === config.provider &&
      (activeConfig.baseUrl ?? null) === (config.baseUrl ?? null) &&
      (activeConfig.modelName ?? null) === (config.modelName ?? null) &&
      (activeConfig.qvacModelSrc ?? null) === (config.qvacModelSrc ?? null);

    const provider = isActiveConfig
      ? await getLLMProvider()
      : createProviderFromConfig(config);
    const start = performance.now();

    // Le 1er appel QVAC peut prendre plusieurs dizaines de secondes (chargement
    // du modèle en RAM, voire téléchargement P2P initial) — c'est attendu.
    const reply = await provider.chat(
      [
        {
          role: "system",
          content: "Vous êtes un assistant qui répond de manière très concise.",
        },
        {
          role: "user",
          content:
            "Réponds en une phrase : bonjour, dis-moi que la connexion fonctionne.",
        },
      ],
      { temperature: 0.3, maxTokens: 80, signal: AbortSignal.timeout(300_000) }
    );

    const latencyMs = Math.round(performance.now() - start);

    // Ne pas décharger une instance partagée (singleton) ; pour une instance
    // de test jetable, libérer la RAM dès la fin du test.
    if (!isActiveConfig && provider instanceof QvacProvider) {
      await provider.unload().catch(() => undefined);
    }

    res.json({
      ok: true,
      latencyMs,
      model: provider.model,
      provider: provider.name,
      reply: reply.slice(0, 600),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("POST /api/admin/llm-settings/test:", error);
    res.status(500).json({ ok: false, message });
  }
});

export default router;
