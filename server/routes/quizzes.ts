import { Router } from "express";
import { storage } from "../storage";
import { getLLMProvider } from "../services/llm-provider";
import { extractJsonArray, resolveUserId } from "../services/llm-utils";
import type { QuizQuestion } from "@shared/schema";

const router = Router();

const QUIZ_SYSTEM_PROMPT = (count: number) =>
  `You are an expert in educational assessment. From the provided note, generate ${count} high-quality multiple-choice quiz questions. Each question must have exactly 4 options, a single correct answer, and a varied difficulty level. Return ONLY a valid JSON array of the form: [{"question": "stem", "options": ["A", "B", "C", "D"], "correctAnswer": "A", "type": "multiple-choice"}, ...]. The value of "correctAnswer" must be one of the options. Do not put any text around the JSON.`;

// GET /api/quizzes/results — must be declared BEFORE /:id
router.get("/results", async (req, res) => {
  try {
    const userId = resolveUserId(req, res);
    if (userId === null) return;
    const results = await storage.getQuizResultsByUser(userId);
    res.json(results);
  } catch (error) {
    console.error("Quiz results error:", error);
    res
      .status(500)
      .json({ message: "Error while retrieving results" });
  }
});

// POST /api/quizzes/generate — generates a quiz via LLM (generateQuiz)
router.post("/generate", async (req, res) => {
  try {
    const { noteId, questionCount } = req.body;
    if (!noteId) {
      return res
        .status(400)
        .json({ message: "noteId is required to generate a quiz" });
    }
    const userId = resolveUserId(req, res);
    if (userId === null) return;

    const note = await storage.getNote(Number(noteId));
    if (!note) return res.status(404).json({ message: "Note not found" });
    if (!note.content || !note.content.trim()) {
      return res
        .status(400)
        .json({ message: "The note must contain content to generate a quiz" });
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
          "Unable to generate a quality quiz from this note. Try enriching the content.",
      });
    }

    // Normalize the questions into the QuizQuestion format expected by the frontend
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
          options: options.length >= 2 ? options : ["True", "False"],
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
          "Unable to generate a quality quiz from this note.",
      });
    }

    const quiz = await storage.createQuiz({
      noteId: Number(noteId),
      userId,
      questions,
    });

    res.status(201).json(quiz);
  } catch (error) {
    console.error("Quiz generation error:", error);
    res.status(500).json({
      message: "Error while generating the quiz",
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
    // Join the note to display its title (quiz.note?.title)
    const withNotes = await Promise.all(
      quizzes.map(async (quiz) => {
        const note = await storage.getNote(quiz.noteId);
        return { ...quiz, note: note ? { id: note.id, title: note.title } : null };
      })
    );
    res.json(withNotes);
  } catch (error) {
    console.error("Quizzes error:", error);
    res.status(500).json({ message: "Error while retrieving quizzes" });
  }
});

// GET /api/quizzes/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const quiz = await storage.getQuiz(id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    res.json(quiz);
  } catch (error) {
    console.error("Quiz retrieval error:", error);
    res.status(500).json({ message: "Error while retrieving the quiz" });
  }
});

// POST /api/quizzes/:id/submit — saves a quiz result
router.post("/:id/submit", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const quiz = await storage.getQuiz(id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const { answers, score } = req.body;
    if (typeof score !== "number") {
      return res
        .status(400)
        .json({ message: "Score is required (a number between 0 and 100)" });
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
    console.error("Quiz submission error:", error);
    res
      .status(500)
      .json({ message: "Error while saving the results" });
  }
});

export default router;
