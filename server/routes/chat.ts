import { Router } from "express";
import { getLLMProvider } from "../services/llm-provider";

const router = Router();

router.post("/", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    // Prepare the messages for the LLM provider
    const chatMessages = [
      {
        role: "system",
        content:
          "You are an intelligent study assistant who helps students understand and learn better. Your answers are concise, precise and educational.",
      },
      ...(history ?? []).map((msg: { role?: string; content?: string }) => ({
        role: msg.role ?? "user",
        content: msg.content ?? "",
      })),
      { role: "user", content: message },
    ];

    // Call the active LLM provider (DB admin config takes priority, otherwise LLM_PROVIDER env)
    const provider = await getLLMProvider();
    const response =
      (await provider.chat(chatMessages, { temperature: 0.7, maxTokens: 500 })) ||
      "Sorry, I could not generate a response.";

    res.json({ response });
  } catch (error) {
    console.error("Chat API error:", error);
    res.status(500).json({
      message: "Error while generating the response",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : undefined,
    });
  }
});

export default router;
