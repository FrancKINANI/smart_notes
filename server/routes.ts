import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertNoteSchema,
  insertQuizSchema,
  insertQuizResultSchema,
  insertFlashcardSchema,
  insertRevisionItemSchema,
  QuizQuestion
} from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes
  const apiRouter = app.route("/api");

  // User authentication - simplified for demo
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const user = await storage.getUserByUsername(username);
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // In a real app, you'd use JWT or sessions here
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role
    });
  });

  // Subjects
  app.get("/api/subjects", async (req: Request, res: Response) => {
    const subjects = await storage.getSubjects();
    res.json(subjects);
  });

  // Notes
  app.get("/api/notes", async (req: Request, res: Response) => {
    const userId = parseInt(req.query.userId as string);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Valid userId required" });
    }
    
    const notes = await storage.getNotesByUser(userId);
    res.json(notes);
  });

  app.get("/api/notes/recent", async (req: Request, res: Response) => {
    const userId = parseInt(req.query.userId as string);
    const limit = parseInt(req.query.limit as string) || 5;
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Valid userId required" });
    }
    
    const notes = await storage.getRecentNotes(userId, limit);
    res.json(notes);
  });

  app.get("/api/notes/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const note = await storage.getNote(id);
    
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }
    
    res.json(note);
  });

  app.post("/api/notes", async (req: Request, res: Response) => {
    try {
      const noteData = insertNoteSchema.parse(req.body);
      const note = await storage.createNote(noteData);
      
      // Create a revision item for this note
      await storage.createRevisionItem({
        userId: note.userId,
        noteId: note.id,
        masteryLevel: 0,
        nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day from now
      });
      
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid note data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create note" });
    }
  });

  app.put("/api/notes/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    try {
      const noteUpdate = req.body;
      const note = await storage.updateNote(id, noteUpdate);
      
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      
      res.json(note);
    } catch (error) {
      res.status(500).json({ message: "Failed to update note" });
    }
  });

  app.delete("/api/notes/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteNote(id);
    
    if (!success) {
      return res.status(404).json({ message: "Note not found" });
    }
    
    res.json({ success: true });
  });

  // OCR processing endpoint
  app.post("/api/notes/ocr", async (req: Request, res: Response) => {
    try {
      // In a real app, you'd use a library like Tesseract.js on the server
      // For this demo, we'll simulate OCR processing
      const { image, userId, subjectId, title } = req.body;
      
      if (!image || !userId || !subjectId || !title) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // For demo purposes, return a simulated OCR result
      // In a real app, this would be actual OCR processing
      const ocrText = "This is a simulated OCR result. In a real application, this would be the text extracted from the uploaded image.";
      
      // Create a new note with the OCR'd content
      const note = await storage.createNote({
        userId,
        subjectId,
        title,
        content: ocrText,
        summary: "",
        enhancedContent: "",
        sourceType: "photo"
      });
      
      res.status(201).json({ note, ocrText });
    } catch (error) {
      res.status(500).json({ message: "OCR processing failed" });
    }
  });

  // AI Enhancement endpoint
  app.post("/api/notes/:id/enhance", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const note = await storage.getNote(id);
      
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      
      // In a real app, call OpenAI API here to enhance the note
      // For demo purposes, we'll simulate this
      let enhancedContent = note.content;
      let summary = "";
      
      try {
        if (process.env.OPENAI_API_KEY) {
          // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are an expert educational assistant. Enhance the following note by adding structure, clarifying concepts, and providing examples where appropriate. Also provide a brief summary."
              },
              {
                role: "user",
                content: note.content
              }
            ],
            response_format: { type: "json_object" }
          });
          
          const result = JSON.parse(response.choices[0].message.content);
          enhancedContent = result.enhancedContent || note.content;
          summary = result.summary || "";
        }
      } catch (error) {
        console.error("OpenAI API error:", error);
        // Fall back to the original content if OpenAI call fails
      }
      
      // Update the note with enhanced content
      const updatedNote = await storage.updateNote(id, {
        ...note,
        enhancedContent,
        summary
      });
      
      res.json(updatedNote);
    } catch (error) {
      res.status(500).json({ message: "Failed to enhance note" });
    }
  });

  // Quiz generation
  app.post("/api/quizzes/generate", async (req: Request, res: Response) => {
    try {
      const { noteId, userId, questionCount = 5 } = req.body;
      
      if (!noteId || !userId) {
        return res.status(400).json({ message: "noteId and userId are required" });
      }
      
      const note = await storage.getNote(noteId);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      
      // In a real app, call OpenAI API here to generate questions
      // For demo purposes, we'll create some sample questions
      const questions: QuizQuestion[] = [];
      
      try {
        if (process.env.OPENAI_API_KEY) {
          // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `Generate ${questionCount} multiple-choice quiz questions based on the following note content. Include 4 options for each question with one correct answer. Format as a JSON array of objects with fields: id (string), question (string), options (array of strings), correctAnswer (string), and type (string, set to "multiple-choice").`
              },
              {
                role: "user",
                content: note.content
              }
            ],
            response_format: { type: "json_object" }
          });
          
          const result = JSON.parse(response.choices[0].message.content);
          if (Array.isArray(result.questions)) {
            questions.push(...result.questions);
          }
        }
      } catch (error) {
        console.error("OpenAI API error:", error);
        // Fall back to sample questions if OpenAI call fails
      }
      
      // If no questions were generated (or API call failed), provide fallback questions
      if (questions.length === 0) {
        for (let i = 1; i <= questionCount; i++) {
          questions.push({
            id: `q${i}`,
            question: `Sample Question ${i} about ${note.title}?`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctAnswer: "Option A",
            type: "multiple-choice" as const
          });
        }
      }
      
      // Create a new quiz
      const quiz = await storage.createQuiz({
        noteId,
        userId,
        questions
      });
      
      res.status(201).json(quiz);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate quiz" });
    }
  });

  // Quiz results submission
  app.post("/api/quizzes/:id/submit", async (req: Request, res: Response) => {
    try {
      const quizId = parseInt(req.params.id);
      const { userId, answers, score } = req.body;
      
      if (!userId || !answers || typeof score !== 'number') {
        return res.status(400).json({ message: "userId, answers, and score are required" });
      }
      
      const quiz = await storage.getQuiz(quizId);
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }
      
      // Save the quiz result
      const quizResult = await storage.createQuizResult({
        quizId,
        userId,
        answers,
        score
      });
      
      // Update the revision item for the associated note
      const revisionItems = await storage.getRevisionItemsByNote(quiz.noteId);
      if (revisionItems.length > 0) {
        const item = revisionItems[0];
        const masteryLevel = Math.min(100, item.masteryLevel + Math.floor(score * 10));
        
        // Calculate next review date based on spaced repetition
        const daysToAdd = masteryLevel < 50 ? 1 : masteryLevel < 75 ? 3 : 7;
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd);
        
        await storage.updateRevisionItem(item.id, {
          masteryLevel,
          nextReviewDate
        });
      }
      
      res.status(201).json(quizResult);
    } catch (error) {
      res.status(500).json({ message: "Failed to submit quiz result" });
    }
  });

  // Flashcards
  app.get("/api/flashcards", async (req: Request, res: Response) => {
    const userId = parseInt(req.query.userId as string);
    const noteId = req.query.noteId ? parseInt(req.query.noteId as string) : undefined;
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Valid userId required" });
    }
    
    let flashcards;
    if (noteId && !isNaN(noteId)) {
      flashcards = await storage.getFlashcardsByNote(noteId);
    } else {
      flashcards = await storage.getFlashcardsByUser(userId);
    }
    
    res.json(flashcards);
  });

  app.get("/api/flashcards/review", async (req: Request, res: Response) => {
    const userId = parseInt(req.query.userId as string);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Valid userId required" });
    }
    
    const flashcards = await storage.getFlashcardsForReview(userId);
    res.json(flashcards);
  });

  app.post("/api/flashcards", async (req: Request, res: Response) => {
    try {
      const flashcardData = insertFlashcardSchema.parse(req.body);
      const flashcard = await storage.createFlashcard(flashcardData);
      res.status(201).json(flashcard);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid flashcard data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create flashcard" });
    }
  });

  app.post("/api/notes/:id/generate-flashcards", async (req: Request, res: Response) => {
    try {
      const noteId = parseInt(req.params.id);
      const { userId, count = 5 } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "userId is required" });
      }
      
      const note = await storage.getNote(noteId);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      
      // In a real app, call OpenAI API here to generate flashcards
      // For demo purposes, we'll create sample flashcards
      const flashcards = [];
      
      try {
        if (process.env.OPENAI_API_KEY) {
          // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `Generate ${count} flashcards based on the following note content. Each flashcard should have a front (question or term) and back (answer or definition). Format as a JSON array of objects with fields: front and back.`
              },
              {
                role: "user",
                content: note.content
              }
            ],
            response_format: { type: "json_object" }
          });
          
          const result = JSON.parse(response.choices[0].message.content);
          if (Array.isArray(result.flashcards)) {
            for (const card of result.flashcards) {
              const newFlashcard = await storage.createFlashcard({
                noteId,
                userId,
                front: card.front,
                back: card.back,
                nextReviewDate: new Date(),
                interval: 1,
                easeFactor: 250
              });
              flashcards.push(newFlashcard);
            }
          }
        }
      } catch (error) {
        console.error("OpenAI API error:", error);
        // Fall back to sample flashcards if OpenAI call fails
      }
      
      // If no flashcards were generated (or API call failed), provide fallback flashcards
      if (flashcards.length === 0) {
        for (let i = 1; i <= count; i++) {
          const newFlashcard = await storage.createFlashcard({
            noteId,
            userId,
            front: `Sample Term ${i}`,
            back: `Sample Definition ${i}`,
            nextReviewDate: new Date(),
            interval: 1,
            easeFactor: 250
          });
          flashcards.push(newFlashcard);
        }
      }
      
      res.status(201).json(flashcards);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate flashcards" });
    }
  });

  // Revision items
  app.get("/api/revision-items", async (req: Request, res: Response) => {
    const userId = parseInt(req.query.userId as string);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Valid userId required" });
    }
    
    const items = await storage.getRevisionItemsByUser(userId);
    res.json(items);
  });

  app.get("/api/revision-items/due", async (req: Request, res: Response) => {
    const userId = parseInt(req.query.userId as string);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Valid userId required" });
    }
    
    const items = await storage.getRevisionItemsForReview(userId);
    
    // Fetch the associated notes for each revision item
    const enhancedItems = await Promise.all(
      items.map(async (item) => {
        const note = await storage.getNote(item.noteId);
        return {
          ...item,
          note: note ? { id: note.id, title: note.title } : null
        };
      })
    );
    
    res.json(enhancedItems);
  });

  // Text-to-Speech endpoint (simplified)
  app.post("/api/tts", (req: Request, res: Response) => {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ message: "Text is required" });
    }
    
    // In a real app, you'd call a TTS service
    // For this demo, we're just acknowledging the request
    res.json({
      success: true,
      message: "TTS request processed. In a real app, audio would be generated."
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
