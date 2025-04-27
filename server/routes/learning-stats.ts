import { Router } from "express";
import { storage } from "../storage";
import { withCache } from "../cache";
import {
  calculateMasteryLevel,
  calculateRetentionHistory,
} from "../../client/src/lib/spaced-repetition";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const userId = parseInt(req.query.userId as string);
    const cacheKey = `learning-stats:${userId}`;

    const stats = await withCache(
      cacheKey,
      { userId },
      async () => {
        const [flashcards, quizResults, notes, subjects] = await Promise.all([
          storage.getFlashcardsByUser(userId),
          storage.getQuizResultsByUser(userId),
          storage.getNotesByUser(userId),
          storage.getSubjects(),
        ]);

        const subjectMastery = subjects.map((subject) => {
          const subjectNotes = notes.filter(
            (note) => note.subjectId === subject.id
          );
          const subjectFlashcards = flashcards.filter((card) =>
            subjectNotes.some((note) => note.id === card.noteId)
          );

          const masteryLevels = subjectFlashcards.map((card) => ({
            id: card.id,
            interval: card.interval || 1,
            easeFactor: card.easeFactor || 250,
            nextReviewDate: card.nextReviewDate,
            consecutiveCorrect: card.consecutiveCorrect || 0,
            totalReviews: card.totalReviews || 0,
            lastResponseQuality: card.lastResponseQuality || 0,
            difficulty: card.difficulty || 50,
          }));

          const averageMastery =
            masteryLevels.length > 0
              ? masteryLevels.reduce(
                  (acc, curr) => acc + calculateMasteryLevel(curr),
                  0
                ) / masteryLevels.length
              : 0;

          return {
            subject: subject.name,
            mastery: Math.round(averageMastery),
          };
        });

        const averageMastery = Math.round(
          subjectMastery.reduce((acc, curr) => acc + curr.mastery, 0) /
            (subjectMastery.length || 1)
        );

        const retentionHistory = calculateRetentionHistory(quizResults);
        const averageRetention = Math.round(
          quizResults.reduce((acc, curr) => acc + curr.score, 0) /
            (quizResults.length || 1)
        );

        const allFlashcards = flashcards.map((card) => ({
          ...card,
          consecutiveCorrect: card.consecutiveCorrect || 0,
          difficulty: card.difficulty || 50,
        }));

        const difficultyDistribution = [
          {
            level: "Facile",
            count: allFlashcards.filter((c) => (c.difficulty || 50) <= 30)
              .length,
          },
          {
            level: "Moyen",
            count: allFlashcards.filter(
              (c) => (c.difficulty || 50) > 30 && (c.difficulty || 50) <= 70
            ).length,
          },
          {
            level: "Difficile",
            count: allFlashcards.filter((c) => (c.difficulty || 50) > 70)
              .length,
          },
        ];

        const masteredConcepts = allFlashcards.filter(
          (c) => (c.consecutiveCorrect || 0) >= 3
        ).length;
        const conceptsToReview = allFlashcards.filter(
          (c) => c.nextReviewDate && new Date(c.nextReviewDate) <= new Date()
        ).length;

        return {
          averageMastery,
          subjectMastery,
          retentionHistory,
          averageRetention,
          difficultyDistribution,
          masteredConcepts,
          conceptsToReview,
        };
      },
      { ttl: 3600 }
    );

    res.json(stats);
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    res.status(500).json({
      message:
        "Erreur lors de la récupération des statistiques d'apprentissage",
    });
  }
});

export default router;
