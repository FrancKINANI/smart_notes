import { Router } from "express";
import { getLLMProvider } from "../services/llm-provider";

const router = Router();

const SYSTEM_PROMPT =
  "Vous êtes un assistant d'étude intelligent qui aide les étudiants à mieux comprendre et apprendre. Vos réponses sont concises, précises et pédagogiques.";

// Mode-specific system prompts (advanced-learning-assistant)
const MODE_PROMPTS: Record<string, string> = {
  tutor:
    "Agissez comme un tuteur patient et pédagogique. Guidez l'étudiant étape par étape sans donner directement toutes les réponses.",
  quiz:
    "Agissez comme un professeur qui pose des questions de quiz. Posez une question à la fois et évaluez la réponse de l'étudiant.",
  explain:
    "Agissez comme un expert qui explique simplement les concepts complexes, avec des exemples concrets et des analogies.",
};

// POST /api/ai/chat — utilisé par sendChatMessage (openai.ts) et
// AdvancedLearningAssistant (payload { message, context, mode, history }).
router.post("/chat", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { message, history, options, mode } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Le message est requis" });
    }

    const systemPrompt = (mode && MODE_PROMPTS[mode]) || SYSTEM_PROMPT;

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...(history ?? []).map((msg: { role?: string; content?: string }) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content ?? "",
      })),
      { role: "user", content: message },
    ];

    const provider = await getLLMProvider();
    const reply =
      (await provider.chat(chatMessages, {
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens ?? 1000,
      })) || "Désolé, je n'ai pas pu générer une réponse.";

    // `reply` pour openai.ts, `response`/`type`/`shouldSpeak` pour AdvancedLearningAssistant
    res.json({
      reply,
      response: reply,
      type: "text",
      shouldSpeak: false,
    });
  } catch (error) {
    console.error("Erreur de l'API AI Chat:", error);
    res.status(500).json({
      message: "Erreur lors de la génération de la réponse",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : undefined,
    });
  }
});

// POST /api/ai/generate — utilisé par generateContextualExplanation,
// generatePersonalizedSummary, generateStudyPlan, extractKeyConcepts,
// generateComprehensionQuestions (openai.ts). Payload { messages, options }.
router.post("/generate", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { messages, options } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res
        .status(400)
        .json({ message: "Le tableau de messages est requis" });
    }

    const sanitized = messages.map(
      (msg: { role?: string; content?: string }) => ({
        role:
          msg.role === "assistant" || msg.role === "system" ? msg.role : "user",
        content: msg.content ?? "",
      })
    );

    const provider = await getLLMProvider();
    const content =
      (await provider.chat(sanitized, {
        temperature: options?.temperature ?? 0.5,
        maxTokens: options?.maxTokens ?? 1000,
      })) || "";

    res.json({ content });
  } catch (error) {
    console.error("Erreur de l'API AI Generate:", error);
    res.status(500).json({
      message: "Erreur lors de la génération",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : undefined,
    });
  }
});

// POST /api/ai/feedback — retours positifs/négatifs de AdvancedLearningAssistant.
// Aucune table dédiée : on journalise et on répond ok.
router.post("/feedback", async (req, res) => {
  const { messageId, isPositive } = req.body;
  console.log(
    `[AI Feedback] messageId=${messageId} isPositive=${String(isPositive)}`
  );
  res.json({ ok: true });
});

export default router;
