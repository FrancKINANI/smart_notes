import { Router } from "express";
import { storage } from "../storage";
import { getLLMProvider } from "../services/llm-provider";
import { extractJsonArray, resolveUserId } from "../services/llm-utils";
import type { QuizQuestion } from "@shared/schema";

const router = Router();

const QUIZ_SYSTEM_PROMPT = (count: number) =>
  `Tu es un expert en évaluation éducative. À partir de la note fournie, génère ${count} questions de quiz à choix multiples de qualité. Chaque question doit avoir exactement 4 options, une seule réponse correcte, et un niveau de difficulté varié. Retourne UNIQUEMENT un tableau JSON valide de la forme : [{"question": "énoncé", "options": ["A", "B", "C", "D"], "correctAnswer": "A", "type": "multiple-choice"}, ...]. La valeur de "correctAnswer" doit être l'une des options. Ne mets aucun texte autour du JSON.`;

// GET /api/quizzes/results — doit être déclarée AVANT /:id
router.get("/results", async (req, res) => {
  try {
    const userId = resolveUserId(req, res);
    if (userId === null) return;
    const results = await storage.getQuizResultsByUser(userId);
    res.json(results);
  } catch (error) {
    console.error("Erreur résultats quiz:", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des résultats" });
  }
});

// POST /api/quizzes/generate — génère un quiz via LLM (generateQuiz)
router.post("/generate", async (req, res) => {
  try {
    const { noteId, questionCount } = req.body;
    if (!noteId) {
      return res
        .status(400)
        .json({ message: "noteId est requis pour générer un quiz" });
    }
    const userId = resolveUserId(req, res);
    if (userId === null) return;

    const note = await storage.getNote(Number(noteId));
    if (!note) return res.status(404).json({ message: "Note introuvable" });
    if (!note.content || !note.content.trim()) {
      return res
        .status(400)
        .json({ message: "La note doit contenir du contenu pour générer un quiz" });
    }

    const count = Math.min(Math.max(parseInt(questionCount, 10) || 5, 1), 20);

    const provider = await getLLMProvider();
    const raw = await provider.chat(
      [
        { role: "system", content: QUIZ_SYSTEM_PROMPT(count) },
        { role: "user", content: note.content },
      ],
      { temperature: 0.5, maxTokens: 2000 }
    );

    const parsed = extractJsonArray(raw ?? "");
    if (!parsed || parsed.length === 0) {
      return res.status(422).json({
        message:
          "Impossible de générer un quiz de qualité à partir de cette note. Essayez d'enrichir le contenu.",
      });
    }

    // Normaliser les questions au format QuizQuestion attendu par le frontend
    const questions: QuizQuestion[] = parsed
      .slice(0, count)
      .map((entry, index) => {
        const q = entry as Record<string, unknown>;
        const options = Array.isArray(q.options)
          ? q.options.map((o) => String(o))
          : [];
        const correctAnswer = String(q.correctAnswer ?? "");
        return {
          id: `q${index + 1}`,
          question: String(q.question ?? ""),
          options: options.length >= 2 ? options : ["Vrai", "Faux"],
          correctAnswer: options.includes(correctAnswer)
            ? correctAnswer
            : options[0],
          type: (q.type as QuizQuestion["type"]) ?? "multiple-choice",
        };
      })
      .filter((q) => q.question.trim().length > 0);

    if (questions.length === 0) {
      return res.status(422).json({
        message:
          "Impossible de générer un quiz de qualité à partir de cette note.",
      });
    }

    const quiz = await storage.createQuiz({
      noteId: Number(noteId),
      userId,
      questions,
    });

    res.status(201).json(quiz);
  } catch (error) {
    console.error("Erreur génération quiz:", error);
    res.status(500).json({
      message: "Erreur lors de la génération du quiz",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : undefined,
    });
  }
});

// GET /api/quizzes
router.get("/", async (req, res) => {
  try {
    const userId = resolveUserId(req, res);
    if (userId === null) return;
    const quizzes = await storage.getQuizzesByUser(userId);
    // Joindre la note pour afficher le titre (quiz.note?.title)
    const withNotes = await Promise.all(
      quizzes.map(async (quiz) => {
        const note = await storage.getNote(quiz.noteId);
        return { ...quiz, note: note ? { id: note.id, title: note.title } : null };
      })
    );
    res.json(withNotes);
  } catch (error) {
    console.error("Erreur quizzes:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des quiz" });
  }
});

// GET /api/quizzes/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const quiz = await storage.getQuiz(id);
    if (!quiz) return res.status(404).json({ message: "Quiz introuvable" });
    res.json(quiz);
  } catch (error) {
    console.error("Erreur récupération quiz:", error);
    res.status(500).json({ message: "Erreur lors de la récupération du quiz" });
  }
});

// POST /api/quizzes/:id/submit — enregistre un résultat de quiz
router.post("/:id/submit", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const quiz = await storage.getQuiz(id);
    if (!quiz) return res.status(404).json({ message: "Quiz introuvable" });

    const { answers, score } = req.body;
    if (typeof score !== "number") {
      return res
        .status(400)
        .json({ message: "Le score est requis (nombre entre 0 et 100)" });
    }
    const userId = resolveUserId(req, res);
    if (userId === null) return;

    const result = await storage.createQuizResult({
      quizId: id,
      userId,
      score: Math.min(Math.max(Math.round(score), 0), 100),
      answers: answers ?? {},
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Erreur soumission quiz:", error);
    res
      .status(500)
      .json({ message: "Erreur lors de l'enregistrement des résultats" });
  }
});

export default router;
