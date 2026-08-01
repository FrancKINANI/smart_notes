import { Router } from "express";
import { storage } from "../storage";

const router = Router();

// GET /api/subjects
router.get("/", async (_req, res) => {
  try {
    const subjects = await storage.getSubjects();
    res.json(subjects);
  } catch (error) {
    console.error("Subjects error:", error);
    res
      .status(500)
      .json({ message: "Error while retrieving subjects" });
  }
});

export default router;
