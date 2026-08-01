import { Router } from "express";

const router = Router();

// POST /api/tts — synthèse vocale (stub : aucun moteur TTS n'est configuré)
router.post("/", async (_req, res) => {
  res.status(501).json({
    message:
      "La synthèse vocale (TTS) n'est pas configurée sur ce serveur. La lecture à voix haute côté navigateur (Web Speech API) reste disponible.",
  });
});

export default router;
