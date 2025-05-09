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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const userId = parseInt(req.query.userId as string);
    if (!userId) {
      return res.status(400).json({ message: "userId est requis" });
    }

    // Vérifier que l'utilisateur accède à ses propres données
    if (req.user.id !== userId) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

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

        // Si aucune donnée n'est trouvée, renvoyer des valeurs par défaut
        if (!flashcards.length && !quizResults.length && !notes.length) {
          return {
            averageMastery: 0,
            subjectMastery: [],
            retentionHistory: [],
            averageRetention: 0,
            difficultyDistribution: [
              { level: "Facile", count: 0 },
              { level: "Moyen", count: 0 },
              { level: "Difficile", count: 0 },
            ],
            masteredConcepts: 0,
            conceptsToReview: 0,
          };
        }

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

        // S'assurer que les quiz ont tous un champ completedAt valide
        const validQuizResults = quizResults.filter(quiz => quiz && quiz.completedAt);
        
        const retentionHistory = calculateRetentionHistory(validQuizResults);
        const averageRetention = validQuizResults.length 
          ? Math.round(
              validQuizResults.reduce((acc, curr) => acc + curr.score, 0) /
                validQuizResults.length
            )
          : 0;

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
      { ttl: 300 } // Réduit à 5 minutes au lieu d'une heure
    );

    // Ajouter les en-têtes de cache pour le client
    res.setHeader("Cache-Control", "private, max-age=300");
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
