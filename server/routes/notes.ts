import { Router } from "express";
import { storage } from "../storage";
import { getLLMProvider } from "../services/llm-provider";
import { extractJsonArray, extractJsonObject, resolveUserId } from "../services/llm-utils";

const router = Router();

const ENHANCE_SYSTEM_PROMPT =
  "Tu es un expert en amélioration de notes de cours. À partir de la note fournie, améliore-la : structure-la avec des titres, clarifie les concepts, ajoute des exemples pertinents et des explications. Retourne UNIQUEMENT un objet JSON valide de la forme : {\"enhancedContent\": \"<contenu amélioré en markdown>\", \"summary\": \"<résumé concis de 2-3 phrases>\"}. Ne mets aucun texte autour du JSON.";

const FLASHCARD_SYSTEM_PROMPT = (count: number) =>
  `Tu es un expert en création de cartes mémoire (flashcards). À partir de la note fournie, crée ${count} cartes de révision pertinentes qui couvrent les concepts clés. Retourne UNIQUEMENT un tableau JSON valide de la forme : [{"front": "<question ou terme>", "back": "<réponse ou définition>"}, ...]. Ne mets aucun texte autour du JSON.`;

// ---- CRUD notes ----

// GET /api/notes/recent?userId=  (liste les notes récentes, utilisée par les tableaux de bord)
router.get("/recent", async (req, res) => {
  try {
    const userId = resolveUserId(req, res);
    if (userId === null) return;
    const notes = await storage.getRecentNotes(userId, 10);
    res.json(notes);
  } catch (error) {
    console.error("Erreur notes récentes:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des notes" });
  }
});

// GET /api/notes?userId=
router.get("/", async (req, res) => {
  try {
    const userId = resolveUserId(req, res);
    if (userId === null) return;
    const notes = await storage.getNotesByUser(userId);
    notes.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json(notes);
  } catch (error) {
    console.error("Erreur notes:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des notes" });
  }
});

// POST /api/notes
router.post("/", async (req, res) => {
  try {
    const { title, content, subjectId, summary, enhancedContent, sourceType } =
      req.body;
    if (!title || !content || !subjectId) {
      return res
        .status(400)
        .json({ message: "Le titre, le contenu et la matière sont requis" });
    }
    const userId = resolveUserId(req, res);
    if (userId === null) return;

    const note = await storage.createNote({
      userId,
      subjectId: Number(subjectId),
      title: String(title),
      content: String(content),
      summary: summary ? String(summary) : null,
      enhancedContent: enhancedContent ? String(enhancedContent) : null,
      sourceType: sourceType ? String(sourceType) : "text",
    });
    res.status(201).json(note);
  } catch (error) {
    console.error("Erreur création note:", error);
    res.status(500).json({ message: "Erreur lors de la création de la note" });
  }
});

// GET /api/notes/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const note = await storage.getNote(id);
    if (!note) return res.status(404).json({ message: "Note introuvable" });
    res.json(note);
  } catch (error) {
    console.error("Erreur récupération note:", error);
    res.status(500).json({ message: "Erreur lors de la récupération de la note" });
  }
});

// PUT /api/notes/:id
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await storage.getNote(id);
    if (!existing) return res.status(404).json({ message: "Note introuvable" });

    const { title, content, subjectId, summary, enhancedContent, sourceType } =
      req.body;
    const note = await storage.updateNote(id, {
      title: title !== undefined ? String(title) : undefined,
      content: content !== undefined ? String(content) : undefined,
      subjectId: subjectId !== undefined ? Number(subjectId) : undefined,
      summary: summary !== undefined ? String(summary) : undefined,
      enhancedContent:
        enhancedContent !== undefined ? String(enhancedContent) : undefined,
      sourceType: sourceType !== undefined ? String(sourceType) : undefined,
    });
    res.json(note);
  } catch (error) {
    console.error("Erreur mise à jour note:", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour de la note" });
  }
});

// DELETE /api/notes/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await storage.getNote(id);
    if (!existing) return res.status(404).json({ message: "Note introuvable" });
    await storage.deleteNote(id);
    res.json({ message: "Note supprimée", id });
  } catch (error) {
    console.error("Erreur suppression note:", error);
    res.status(500).json({ message: "Erreur lors de la suppression de la note" });
  }
});

// ---- Routes IA sur les notes ----

// POST /api/notes/:id/enhance — améliore la note avec le LLM (enhanceNote)
router.post("/:id/enhance", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const note = await storage.getNote(id);
    if (!note) return res.status(404).json({ message: "Note introuvable" });
    if (!note.content || !note.content.trim()) {
      return res
        .status(400)
        .json({ message: "La note doit contenir du contenu pour être améliorée" });
    }

    const provider = await getLLMProvider();
    const raw = await provider.chat(
      [
        { role: "system", content: ENHANCE_SYSTEM_PROMPT },
        { role: "user", content: note.content },
      ],
      { temperature: 0.4, maxTokens: 2000 }
    );

    // Fallback : le texte brut si le JSON n'est pas exploitable
    let enhancedContent = raw;
    let summary = "";

    const parsed = extractJsonObject(raw ?? "");
    if (parsed) {
      enhancedContent =
        typeof parsed.enhancedContent === "string"
          ? parsed.enhancedContent
          : raw;
      summary = typeof parsed.summary === "string" ? parsed.summary : "";
    }

    const updated = await storage.updateNote(id, {
      enhancedContent,
      summary: summary || note.summary,
    });

    res.json({
      id,
      enhancedContent,
      summary,
    });
  } catch (error) {
    console.error("Erreur enhancement note:", error);
    res.status(500).json({
      message: "Erreur lors de l'amélioration de la note",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : undefined,
    });
  }
});

// POST /api/notes/:id/generate-flashcards — génère des flashcards via LLM
router.post("/:id/generate-flashcards", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const note = await storage.getNote(id);
    if (!note) return res.status(404).json({ message: "Note introuvable" });
    if (!note.content || !note.content.trim()) {
      return res
        .status(400)
        .json({ message: "La note doit contenir du contenu pour générer des cartes" });
    }

    const userId = resolveUserId(req, res);
    if (userId === null) return;

    const count = Math.min(Math.max(parseInt(req.body?.count, 10) || 5, 1), 20);

    const provider = await getLLMProvider();
    const raw = await provider.chat(
      [
        { role: "system", content: FLASHCARD_SYSTEM_PROMPT(count) },
        { role: "user", content: note.content },
      ],
      { temperature: 0.5, maxTokens: 2000 }
    );

    const pairs = extractJsonArray(raw ?? "");
    if (!pairs || pairs.length === 0) {
      return res.status(422).json({
        message:
          "Impossible de générer des cartes de qualité à partir de cette note. Essayez d'enrichir le contenu.",
      });
    }

    const now = new Date();
    const created: any[] = [];
    for (const pair of pairs.slice(0, count)) {
      const obj = pair as Record<string, unknown>;
      const front = String(obj.front ?? obj.question ?? "").trim();
      const back = String(obj.back ?? obj.answer ?? "").trim();
      if (!front || !back) continue;
      const card = await storage.createFlashcard({
        noteId: id,
        userId,
        front,
        back,
        interval: 1,
        easeFactor: 250,
        nextReviewDate: now,
      });
      created.push(card);
    }

    res.status(201).json(created);
  } catch (error) {
    console.error("Erreur génération flashcards:", error);
    res.status(500).json({
      message: "Erreur lors de la génération des flashcards",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : undefined,
    });
  }
});

// POST /api/notes/ocr — stub (aucun moteur OCR n'est configuré)
router.post("/ocr", async (_req, res) => {
  res.status(501).json({
    message:
      "L'OCR n'est pas configuré sur ce serveur. Aucun moteur d'extraction de texte d'image n'est disponible.",
  });
});

// ---- Commentaires ----

// GET /api/notes/:id/comments
router.get("/:id/comments", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const comments = await storage.getNoteComments(id);
    const withUsers = await Promise.all(
      comments.map(async (comment) => {
        const user = await storage.getUser(comment.userId);
        return {
          ...comment,
          user: user
            ? {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                avatar: user.avatar,
              }
            : { id: comment.userId, username: "inconnu", displayName: null, avatar: null },
        };
      })
    );
    res.json(withUsers);
  } catch (error) {
    console.error("Erreur commentaires:", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des commentaires" });
  }
});

// POST /api/notes/:id/comments
router.post("/:id/comments", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { content } = req.body;
    if (!content || !String(content).trim()) {
      return res
        .status(400)
        .json({ message: "Le commentaire ne peut pas être vide" });
    }
    const userId = resolveUserId(req, res);
    if (userId === null) return;

    const comment = await storage.addComment({
      noteId: id,
      userId,
      content: String(content).trim(),
    });

    const user = await storage.getUser(userId);
    res.status(201).json({
      ...comment,
      user: user
        ? {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
          }
        : { id: userId, username: "inconnu", displayName: null, avatar: null },
    });
  } catch (error) {
    console.error("Erreur ajout commentaire:", error);
    res
      .status(500)
      .json({ message: "Erreur lors de l'ajout du commentaire" });
  }
});

export default router;
