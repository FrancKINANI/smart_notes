import { Router } from "express";

const router = Router();

// POST /api/tts — text-to-speech (stub: no TTS engine is configured)
router.post("/", async (_req, res) => {
  res.status(501).json({
    message:
      "Text-to-speech (TTS) is not configured on this server. Browser-side read-aloud (Web Speech API) remains available.",
  });
});

export default router;
