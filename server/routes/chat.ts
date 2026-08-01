import { Router } from "express";
import { getLLMProvider } from "../services/llm-provider";

const router = Router();

router.post("/", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Le message est requis" });
    }

    // Préparer les messages pour le provider LLM
    const chatMessages = [
      {
        role: "system",
        content:
          "Vous êtes un assistant d'étude intelligent qui aide les étudiants à mieux comprendre et apprendre. Vos réponses sont concises, précises et pédagogiques.",
      },
      ...(history ?? []).map((msg: { role?: string; content?: string }) => ({
        role: msg.role ?? "user",
        content: msg.content ?? "",
      })),
      { role: "user", content: message },
    ];

    // Appeler le provider LLM actif (config admin DB prioritaire, sinon LLM_PROVIDER env)
    const provider = await getLLMProvider();
    const response =
      (await provider.chat(chatMessages, { temperature: 0.7, maxTokens: 500 })) ||
      "Désolé, je n'ai pas pu générer une réponse.";

    res.json({ response });
  } catch (error) {
    console.error("Erreur de l'API Chat:", error);
    res.status(500).json({
      message: "Erreur lors de la génération de la réponse",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : undefined,
    });
  }
});

export default router;
