import { Router } from "express";
import { storage } from "../storage";
import { getLLMProvider } from "../services/llm-provider";
import { extractJsonArray, extractJsonObject, resolveUserId } from "../services/llm-utils";

const router = Router();

const ENHANCE_SYSTEM_PROMPT =
  "You are an expert in improving course notes. From the provided note, improve it: structure it with headings, clarify concepts, add relevant examples and explanations. Return ONLY a valid JSON object of the form: {\"enhancedContent\": \"<enhanced content in markdown>\", \"summary\": \"<concise 2-3 sentence summary>\"}. Do not put any text around the JSON.";

const FLASHCARD_SYSTEM_PROMPT = (count: number) =>
  `You are an expert in creating flashcards. From the provided note, create ${count} relevant revision cards covering the key concepts. Return ONLY a valid JSON array of the form: [{"front": "<question or term>", "back": "<answer or definition>"}, ...]. Do not put any text around the JSON.`;

// ---- Notes CRUD ----

// GET /api/notes/recent?userId=  (lists recent notes, used by dashboards)
router.get("/recent", async (req, res) => {
  try {
    const userId = resolveUserId(req, res);
    if (userId === null) return;
    const notes = await storage.getRecentNotes(userId, 10);
    res.json(notes);
  } catch (error) {
    console.error("Recent notes error:", error);
    res.status(500).json({ message: "Error while retrieving notes" });
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
    console.error("Notes error:", error);
    res.status(500).json({ message: "Error while retrieving notes" });
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
        .json({ message: "Title, content and subject are required" });
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
    console.error("Note creation error:", error);
    res.status(500).json({ message: "Error while creating the note" });
  }
});

// GET /api/notes/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const note = await storage.getNote(id);
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json(note);
  } catch (error) {
    console.error("Note retrieval error:", error);
    res.status(500).json({ message: "Error while retrieving the note" });
  }
});

// PUT /api/notes/:id
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await storage.getNote(id);
    if (!existing) return res.status(404).json({ message: "Note not found" });

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
    console.error("Note update error:", error);
    res.status(500).json({ message: "Error while updating the note" });
  }
});

// DELETE /api/notes/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await storage.getNote(id);
    if (!existing) return res.status(404).json({ message: "Note not found" });
    await storage.deleteNote(id);
    res.json({ message: "Note deleted", id });
  } catch (error) {
    console.error("Note deletion error:", error);
    res.status(500).json({ message: "Error while deleting the note" });
  }
});

// ---- AI routes on notes ----

// POST /api/notes/:id/enhance — improves the note with the LLM (enhanceNote)
router.post("/:id/enhance", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const note = await storage.getNote(id);
    if (!note) return res.status(404).json({ message: "Note not found" });
    if (!note.content || !note.content.trim()) {
      return res
        .status(400)
        .json({ message: "The note must contain content to be improved" });
    }

    const provider = await getLLMProvider();
    const raw = await provider.chat(
      [
        { role: "system", content: ENHANCE_SYSTEM_PROMPT },
        { role: "user", content: note.content },
      ],
      { temperature: 0.4, maxTokens: 2000 }
    );

    // Fallback: the raw text if the JSON is not usable
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
    console.error("Note enhancement error:", error);
    res.status(500).json({
      message: "Error while improving the note",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : undefined,
    });
  }
});

// POST /api/notes/:id/generate-flashcards — generates flashcards via LLM
router.post("/:id/generate-flashcards", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const note = await storage.getNote(id);
    if (!note) return res.status(404).json({ message: "Note not found" });
    if (!note.content || !note.content.trim()) {
      return res
        .status(400)
        .json({ message: "The note must contain content to generate cards" });
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
          "Unable to generate quality cards from this note. Try enriching the content.",
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
    console.error("Flashcards generation error:", error);
    res.status(500).json({
      message: "Error while generating flashcards",
      error:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : undefined,
    });
  }
});

// POST /api/notes/ocr — stub (no OCR engine is configured)
router.post("/ocr", async (_req, res) => {
  res.status(501).json({
    message:
      "OCR is not configured on this server. No image text extraction engine is available.",
  });
});

// ---- Comments ----

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
            : { id: comment.userId, username: "unknown", displayName: null, avatar: null },
        };
      })
    );
    res.json(withUsers);
  } catch (error) {
    console.error("Comments error:", error);
    res
      .status(500)
      .json({ message: "Error while retrieving comments" });
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
        .json({ message: "The comment cannot be empty" });
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
        : { id: userId, username: "unknown", displayName: null, avatar: null },
    });
  } catch (error) {
    console.error("Add comment error:", error);
    res
      .status(500)
      .json({ message: "Error while adding the comment" });
  }
});

export default router;
