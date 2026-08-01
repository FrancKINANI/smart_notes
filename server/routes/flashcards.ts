import { Router } from "express";
import { storage } from "../storage";
import { resolveUserId } from "../services/llm-utils";
import type { InsertFlashcard } from "@shared/schema";

const router = Router();

// GET /api/flashcards/review?userId= — must be declared BEFORE /:id
router.get("/review", async (req, res) => {
  try {
    const userId = resolveUserId(req, res);
    if (userId === null) return;
    const cards = await storage.getFlashcardsForReview(userId);
    res.json(cards);
  } catch (error) {
    console.error("Flashcards review error:", error);
    res
      .status(500)
      .json({ message: "Error while retrieving cards to review" });
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
    console.error("Flashcards error:", error);
    res
      .status(500)
      .json({ message: "Error while retrieving cards" });
  }
});

// POST /api/flashcards — creation (used by offline synchronization)
router.post("/", async (req, res) => {
  try {
    const { front, back, noteId } = req.body;
    if (!front || !back) {
      return res
        .status(400)
        .json({ message: "The front and back of the card are required" });
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
    console.error("Flashcard creation error:", error);
    res
      .status(500)
      .json({ message: "Error while creating the card" });
  }
});

// PUT /api/flashcards/:id — SM-2 update (processResponse on the client side)
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await storage.getFlashcard(id);
    if (!existing) {
      return res.status(404).json({ message: "Flashcard not found" });
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

    // front/back/noteId are accepted for offline synchronization
    // (syncOfflineChanges sends a PUT even for a card created offline,
    // because IndexedDB assigns a local id). The SM-2 fields
    // (consecutiveCorrect, totalReviews, lastResponseQuality, difficulty)
    // exist in the DB (migration 0003) but not in InsertFlashcard: we cast
    // them to pass to drizzle (same convention as storage.ts).
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
    console.error("Flashcard update error:", error);
    res
      .status(500)
      .json({ message: "Error while updating the card" });
  }
});

export default router;
