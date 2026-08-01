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
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = parseInt(req.query.userId as string);
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Check that the user is accessing their own data
    if (req.user.id !== userId) {
      return res.status(403).json({ message: "Access denied" });
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

        // If no data is found, return default values
        if (!flashcards.length && !quizResults.length && !notes.length) {
          return {
            averageMastery: 0,
            subjectMastery: [],
            retentionHistory: [],
            averageRetention: 0,
            difficultyDistribution: [
              { level: "Easy", count: 0 },
              { level: "Medium", count: 0 },
              { level: "Hard", count: 0 },
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

        // Make sure all quizzes have a valid completedAt field
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
            level: "Easy",
            count: allFlashcards.filter((c) => (c.difficulty || 50) <= 30)
              .length,
          },
          {
            level: "Medium",
            count: allFlashcards.filter(
              (c) => (c.difficulty || 50) > 30 && (c.difficulty || 50) <= 70
            ).length,
          },
          {
            level: "Hard",
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
      { ttl: 300 } // Reduced to 5 minutes instead of an hour
    );

    // Add cache headers for the client
    res.setHeader("Cache-Control", "private, max-age=300");
    res.json(stats);
  } catch (error) {
    console.error("Error while retrieving statistics:", error);
    res.status(500).json({
      message:
        "Error while retrieving learning statistics",
    });
  }
});

export default router;
