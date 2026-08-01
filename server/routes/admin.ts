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

// GET /api/admin/llm-settings — current config (DB takes priority, otherwise env).
router.get("/llm-settings", checkPermissions("admin"), async (_req, res) => {
  try {
    const settings = await storage.getLlmSettings();

    // Effective config = what getLLMProvider() will actually use.
    // resolveProviderConfig() is THE single source of truth (DB then env).
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
      message: "Error while reading the LLM configuration",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : undefined,
    });
  }
});

// PUT /api/admin/llm-settings — saves the config in DB and hot-switches
// (resetProviderCache → the instance is recreated on the next call, without restart).
router.put("/llm-settings", checkPermissions("admin"), async (req, res) => {
  try {
    const { provider, baseUrl, modelName, qvacModelSrc } = req.body ?? {};

    if (!provider || !SUPPORTED_PROVIDERS.includes(provider)) {
      return res.status(400).json({
        message: `invalid provider: "${provider}". Possible values: ${SUPPORTED_PROVIDERS.join(", ")}`,
      });
    }

    if (provider === "openai-compatible" && !baseUrl) {
      return res.status(400).json({
        message: "baseUrl is required for the openai-compatible provider",
      });
    }

    const settings = await storage.saveLlmSettings({
      provider,
      baseUrl: baseUrl || null,
      modelName: modelName || null,
      qvacModelSrc: qvacModelSrc || null,
    });

    // Hot switch: the next LLM request will use the new config.
    resetProviderCache();

    res.json({
      settings,
      source: "database",
      message: "LLM configuration saved and applied (hot switch active).",
    });
  } catch (error) {
    console.error("PUT /api/admin/llm-settings:", error);
    res.status(500).json({
      message: "Error while saving the LLM configuration",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : undefined,
    });
  }
});

// POST /api/admin/llm-settings/test — sends a test prompt with the provided
// config (or the active config if absent) and measures latency. It does NOT modify
// the saved config: the operator validates before switching in prod.
router.post("/llm-settings/test", checkPermissions("admin"), async (req, res) => {
  try {
    const body = req.body ?? {};

    // Current resolved config (DB takes priority, otherwise env) — single source of truth.
    const activeConfig = await resolveProviderConfig();

    const providerName = body.provider || activeConfig.provider || "openrouter";
    if (!SUPPORTED_PROVIDERS.includes(providerName)) {
      return res.status(400).json({
        ok: false,
        message: `invalid provider: "${providerName}". Possible values: ${SUPPORTED_PROVIDERS.join(", ")}`,
      });
    }

    // The tested config = body overrides on the active config. Built from
    // activeConfig (not a fresh DB read): guarantees that the
    // isActiveConfig comparison compares exactly what config is derived from.
    const config: LlmProviderConfig = {
      provider: providerName,
      baseUrl: body.baseUrl ?? activeConfig.baseUrl ?? null,
      modelName: body.modelName ?? activeConfig.modelName ?? null,
      qvacModelSrc: body.qvacModelSrc ?? activeConfig.qvacModelSrc ?? null,
    };

    // If the tested config is identical to the active config (DB OR env fallback),
    // reuse the getLLMProvider() singleton: avoid loading a SECOND
    // QVAC model in RAM (~130 MB to several GB) just for a test.
    const isActiveConfig =
      activeConfig.provider === config.provider &&
      (activeConfig.baseUrl ?? null) === (config.baseUrl ?? null) &&
      (activeConfig.modelName ?? null) === (config.modelName ?? null) &&
      (activeConfig.qvacModelSrc ?? null) === (config.qvacModelSrc ?? null);

    const provider = isActiveConfig
      ? await getLLMProvider()
      : createProviderFromConfig(config);
    const start = performance.now();

    // The first QVAC call can take several tens of seconds (loading the model
    // into RAM, or even the initial P2P download) — this is expected.
    const reply = await provider.chat(
      [
        {
          role: "system",
          content: "You are an assistant who answers very concisely.",
        },
        {
          role: "user",
          content:
            "Answer in one sentence: hello, tell me the connection works.",
        },
      ],
      { temperature: 0.3, maxTokens: 80, signal: AbortSignal.timeout(300_000) }
    );

    const latencyMs = Math.round(performance.now() - start);

    // Do not unload a shared (singleton) instance; for a disposable
    // test instance, free the RAM as soon as the test ends.
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
