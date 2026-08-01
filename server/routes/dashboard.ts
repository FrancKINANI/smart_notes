import { Router } from "express";
import { storage } from "../storage";
import { resolveUserId } from "../services/llm-utils";

const router = Router();

// GET /api/user/stats — stats agrégées pour ProgressSection
router.get("/user/stats", async (req, res) => {
  try {
    const userId = resolveUserId(req, res);
    if (userId === null) return;

    const [notes, quizResults] = await Promise.all([
      storage.getNotesByUser(userId),
      storage.getQuizResultsByUser(userId),
    ]);

    const averageScore = quizResults.length
      ? Math.round(
          quizResults.reduce((sum, r) => sum + (r.score || 0), 0) /
            quizResults.length
        )
      : 0;

    res.json({
      notesCount: notes.length,
      quizzesCompleted: quizResults.length,
      studyTimeMinutes: 0, // Aucune session de suivi de temps enregistrée pour l'instant
      averageScore,
    });
  } catch (error) {
    console.error("Erreur user stats:", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des statistiques" });
  }
});

// GET /api/dashboard/stats?userId= — stats pour EnhancedDashboard
router.get("/dashboard/stats", async (req, res) => {
  try {
    const userId = resolveUserId(req, res);
    if (userId === null) return;

    const [notes, flashcards, quizResults, revisionItems] = await Promise.all([
      storage.getNotesByUser(userId),
      storage.getFlashcardsByUser(userId),
      storage.getQuizResultsByUser(userId),
      storage.getRevisionItemsByUser(userId),
    ]);

    const dueItems = revisionItems.filter(
      (item) =>
        !item.nextReviewDate || new Date(item.nextReviewDate) <= new Date()
    );

    res.json({
      totalNotes: notes.length,
      totalFlashcards: flashcards.length,
      studyStreak: 0, // Calcul de série non disponible — à enrichir
      weeklyGoalProgress: 0,
      masteryLevel: quizResults.length
        ? Math.round(
            quizResults.reduce((sum, r) => sum + (r.score || 0), 0) /
              quizResults.length
          )
        : 0,
      upcomingReviews: dueItems.length,
      completedQuizzes: quizResults.length,
      studyTime: 0,
    });
  } catch (error) {
    console.error("Erreur dashboard stats:", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des statistiques" });
  }
});

// GET /api/dashboard/activity?userId= — activité récente pour EnhancedDashboard
router.get("/dashboard/activity", async (req, res) => {
  try {
    const userId = resolveUserId(req, res);
    if (userId === null) return;

    const [notes, quizResults] = await Promise.all([
      storage.getRecentNotes(userId, 5),
      storage.getQuizResultsByUser(userId),
    ]);

    const activity: Array<{
      id: string;
      type: "note" | "quiz" | "flashcard" | "study_session";
      title: string;
      timestamp: string;
      score?: number;
    }> = [];

    for (const note of notes) {
      activity.push({
        id: `note-${note.id}`,
        type: "note",
        title: `Note créée : ${note.title}`,
        timestamp: new Date(note.createdAt).toISOString(),
      });
    }

    for (const result of quizResults.slice(-5)) {
      activity.push({
        id: `quiz-${result.id}`,
        type: "quiz",
        title: "Quiz complété",
        timestamp: new Date(result.completedAt).toISOString(),
        score: result.score,
      });
    }

    activity.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    res.json(activity.slice(0, 10));
  } catch (error) {
    console.error("Erreur dashboard activity:", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération de l'activité" });
  }
});

export default router;
