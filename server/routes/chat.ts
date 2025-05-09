import { Router } from "express";
import { MistralClient } from "@mistralai/mistralai";

const router = Router();

// Configuration de Mistral AI
const client = new MistralClient(process.env.MISTRAL_API_KEY);

router.post("/", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Le message est requis" });
    }

    // Préparer les messages pour l'API Mistral
    const chatMessages = [
      {
        role: "system",
        content:
          "Vous êtes un assistant d'étude intelligent qui aide les étudiants à mieux comprendre et apprendre. Vos réponses sont concises, précises et pédagogiques.",
      },
      ...history.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    // Appeler l'API Mistral
    const chatResponse = await client.chat({
      model: "mistral-medium",
      messages: chatMessages,
      temperature: 0.7,
      maxTokens: 500,
    });

    const response =
      chatResponse.choices[0]?.message?.content ||
      "Désolé, je n'ai pas pu générer une réponse.";
    res.json({ response });
  } catch (error) {
    console.error("Erreur de l'API Chat:", error);
    res.status(500).json({
      message: "Erreur lors de la génération de la réponse",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

export default router;
