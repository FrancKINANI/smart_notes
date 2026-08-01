import { Router } from "express";
import { storage } from "../storage";

const router = Router();

// GET /api/subjects
router.get("/", async (_req, res) => {
  try {
    const subjects = await storage.getSubjects();
    res.json(subjects);
  } catch (error) {
    console.error("Erreur subjects:", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des matières" });
  }
});

export default router;
