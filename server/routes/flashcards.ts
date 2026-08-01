import { Router } from "express";
import { storage } from "../storage";
import { resolveUserId } from "../services/llm-utils";
import type { InsertFlashcard } from "@shared/schema";

const router = Router();

// GET /api/flashcards/review?userId= — doit être déclarée AVANT /:id
router.get("/review", async (req, res) => {
  try {
    const userId = resolveUserId(req, res);
    if (userId === null) return;
    const cards = await storage.getFlashcardsForReview(userId);
    res.json(cards);
  } catch (error) {
    console.error("Erreur flashcards review:", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des cartes à réviser" });
  }
});

// GET /api/flashcards?userId=&noteId=
router.get("/", async (req, res) => {
  try {
    const userId = resolveUserId(req, res);
    if (userId === null) return;

    let cards = await storage.getFlashcardsByUser(userId);

    const noteIdRaw = req.query.noteId;
    if (noteIdRaw !== undefined) {
      const noteId = parseInt(String(noteIdRaw), 10);
      if (!Number.isNaN(noteId)) {
        cards = cards.filter((card) => card.noteId === noteId);
      }
    }

    res.json(cards);
  } catch (error) {
    console.error("Erreur flashcards:", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des cartes" });
  }
});

// POST /api/flashcards — création (utilisée par la synchronisation offline)
router.post("/", async (req, res) => {
  try {
    const { front, back, noteId } = req.body;
    if (!front || !back) {
      return res
        .status(400)
        .json({ message: "Le recto et le verso de la carte sont requis" });
    }
    const userId = resolveUserId(req, res);
    if (userId === null) return;

    const card = await storage.createFlashcard({
      noteId: Number(noteId) || 0,
      userId,
      front: String(front),
      back: String(back),
      interval: 1,
      easeFactor: 250,
      nextReviewDate: new Date(),
    });
    res.status(201).json(card);
  } catch (error) {
    console.error("Erreur création flashcard:", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la création de la carte" });
  }
});

// PUT /api/flashcards/:id — mise à jour SM-2 (processResponse côté client)
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await storage.getFlashcard(id);
    if (!existing) {
      return res.status(404).json({ message: "Flashcard introuvable" });
    }

    const {
      front,
      back,
      noteId,
      interval,
      easeFactor,
      nextReviewDate,
      consecutiveCorrect,
      totalReviews,
      lastResponseQuality,
      difficulty,
    } = req.body;

    // front/back/noteId sont acceptés pour la synchronisation offline
    // (syncOfflineChanges envoie un PUT même pour une carte créée hors-ligne,
    // car IndexedDB attribue un id local). Les champs SM-2
    // (consecutiveCorrect, totalReviews, lastResponseQuality, difficulty)
    // existent en DB (migration 0003) mais pas dans InsertFlashcard : on cast
    // pour les passer à drizzle (même convention que storage.ts).
    const update: Partial<InsertFlashcard> & {
      consecutiveCorrect?: number;
      totalReviews?: number;
      lastResponseQuality?: number;
      difficulty?: number;
    } = {
      front: front !== undefined ? String(front) : undefined,
      back: back !== undefined ? String(back) : undefined,
      noteId: noteId !== undefined ? Number(noteId) : undefined,
      interval: interval !== undefined ? Number(interval) : undefined,
      easeFactor: easeFactor !== undefined ? Number(easeFactor) : undefined,
      nextReviewDate:
        nextReviewDate !== undefined && !Number.isNaN(new Date(String(nextReviewDate)).getTime())
          ? new Date(String(nextReviewDate))
          : undefined,
      consecutiveCorrect:
        consecutiveCorrect !== undefined ? Number(consecutiveCorrect) : undefined,
      totalReviews: totalReviews !== undefined ? Number(totalReviews) : undefined,
      lastResponseQuality:
        lastResponseQuality !== undefined ? Number(lastResponseQuality) : undefined,
      difficulty: difficulty !== undefined ? Number(difficulty) : undefined,
    };

    const card = await storage.updateFlashcard(
      id,
      update as Partial<InsertFlashcard>
    );

    res.json(card);
  } catch (error) {
    console.error("Erreur mise à jour flashcard:", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la mise à jour de la carte" });
  }
});

export default router;
