import { Router } from "express";
import { getLLMProvider } from "../services/llm-provider";

const router = Router();

const SYSTEM_PROMPT =
  "You are an intelligent study assistant who helps students understand and learn better. Your answers are concise, precise and educational.";

// Mode-specific system prompts (advanced-learning-assistant)
const MODE_PROMPTS: Record<string, string> = {
  tutor:
    "Act as a patient and pedagogical tutor. Guide the student step by step without directly giving all the answers.",
  quiz:
    "Act as a teacher asking quiz questions. Ask one question at a time and assess the student's answer.",
  explain:
    "Act as an expert who simply explains complex concepts, with concrete examples and analogies.",
};

// POST /api/ai/chat — used by sendChatMessage (openai.ts) and
// AdvancedLearningAssistant (payload { message, context, mode, history }).
router.post("/chat", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { message, history, options, mode } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
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
      })) || "Sorry, I could not generate a response.";

    // `reply` for openai.ts, `response`/`type`/`shouldSpeak` for AdvancedLearningAssistant
    res.json({
      reply,
      response: reply,
      type: "text",
      shouldSpeak: false,
    });
  } catch (error) {
    console.error("AI Chat API error:", error);
    res.status(500).json({
      message: "Error while generating the response",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : undefined,
    });
  }
});

// POST /api/ai/generate — used by generateContextualExplanation,
// generatePersonalizedSummary, generateStudyPlan, extractKeyConcepts,
// generateComprehensionQuestions (openai.ts). Payload { messages, options }.
router.post("/generate", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { messages, options } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res
        .status(400)
        .json({ message: "The messages array is required" });
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
    console.error("AI Generate API error:", error);
    res.status(500).json({
      message: "Error while generating",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : undefined,
    });
  }
});

// POST /api/ai/feedback — positive/negative feedback from AdvancedLearningAssistant.
// No dedicated table: we log and reply ok.
router.post("/feedback", async (req, res) => {
  const { messageId, isPositive } = req.body;
  console.log(
    `[AI Feedback] messageId=${messageId} isPositive=${String(isPositive)}`
  );
  res.json({ ok: true });
});

export default router;
