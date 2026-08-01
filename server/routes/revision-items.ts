import { Router } from "express";
import { storage } from "../storage";
import { resolveUserId } from "../services/llm-utils";

const router = Router();

// GET /api/revision-items/due?userId=
router.get("/due", async (req, res) => {
  try {
    const userId = resolveUserId(req, res);
    if (userId === null) return;
    const items = await storage.getRevisionItemsForReview(userId);
    res.json(items);
  } catch (error) {
    console.error("Erreur revision-items due:", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des révisions dues" });
  }
});

// GET /api/revision-items?userId=
router.get("/", async (req, res) => {
  try {
    const userId = resolveUserId(req, res);
    if (userId === null) return;
    const items = await storage.getRevisionItemsByUser(userId);
    res.json(items);
  } catch (error) {
    console.error("Erreur revision-items:", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des révisions" });
  }
});

export default router;
