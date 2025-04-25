import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import {
  insertNoteSchema,
  insertQuizSchema,
  insertQuizResultSchema,
  insertFlashcardSchema,
  insertRevisionItemSchema,
  insertStudyGroupSchema,
  insertGroupMemberSchema,
  insertSharedNoteSchema,
  insertCommentSchema,
  QuizQuestion,
} from "@shared/schema";

// Helper function to call Mistral AI API
async function callMistralAPI(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.MISTRAL_MODEL || "mistral-small-latest",
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mistral API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling Mistral API:", error);
    throw error;
  }
}

// Middleware pour vérifier si l'utilisateur est authentifié
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Non authentifié" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Configuration de l'authentification
  setupAuth(app);

  // API Routes
  const apiRouter = app.route("/api");

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
    console.log("Fetching note with ID:", id); // Log pour vérifier l'ID reçu

    const note = await storage.getNote(id);

    if (!note) {
      console.error("Note not found for ID:", id); // Log si la note n'est pas trouvée
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
        nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
      });

      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid note data", errors: error.errors });
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
      const ocrText =
        "This is a simulated OCR result. In a real application, this would be the text extracted from the uploaded image.";

      // Create a new note with the OCR'd content
      const note = await storage.createNote({
        userId,
        subjectId,
        title,
        content: ocrText,
        summary: "",
        enhancedContent: "",
        sourceType: "photo",
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

      try {
        const response = await callMistralAPI([
          {
            role: "system",
            content: `You are an expert educational assistant. Analyze and enhance the following educational note.
            Return your response in this exact JSON structure:
            {
              "enhancedContent": {
                "Introduction": "A clear, concise introduction to the topic",
                "Concepts Fondamentaux": {
                  "Définitions": ["List of key definitions"],
                  "Principes": ["List of main principles"],
                  "Exemples": ["Relevant examples"]
                },
                "Points Clés": ["List of key points"],
                "Applications": ["Practical applications"],
                "Pour Aller Plus Loin": "Additional insights and advanced concepts"
              },
              "summary": "A concise summary of the main points"
            }`,
          },
          {
            role: "user",
            content: note.content,
          },
        ]);

        console.log("Raw response from Mistral API:", response);

        try {
          const result = JSON.parse(response);

          // Update the note with the enhanced content
          const updatedNote = await storage.updateNote(id, {
            ...note,
            enhancedContent: result.enhancedContent,
            summary: result.summary || "",
          });

          res.json(updatedNote);
        } catch (parseError) {
          console.error("Failed to parse Mistral response:", parseError);
          res.status(500).json({
            message: "Failed to process the enhanced content",
            error:
              parseError instanceof Error
                ? parseError.message
                : "Unknown parsing error",
          });
        }
      } catch (mistralError) {
        console.error("Mistral API error:", mistralError);
        res.status(500).json({
          message: "Failed to enhance the note",
          error:
            mistralError instanceof Error
              ? mistralError.message
              : "Unknown API error",
        });
      }
    } catch (error) {
      console.error("Note enhancement error:", error);
      res.status(500).json({ message: "Failed to enhance note" });
    }
  });

  // Quiz generation
  app.post("/api/quizzes/generate", async (req: Request, res: Response) => {
    try {
      const { noteId, userId, questionCount = 5 } = req.body;

      if (!noteId || !userId) {
        return res
          .status(400)
          .json({ message: "noteId and userId are required" });
      }

      const note = await storage.getNote(noteId);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }

      if (!note.content.trim()) {
        return res.status(400).json({
          message: "La note doit contenir du contenu pour générer un quiz",
        });
      }

      try {
        const response = await callMistralAPI([
          {
            role: "system",
            content: `Tu es un expert en éducation chargé de créer un quiz basé sur le contenu suivant : ${note.title}.
            Génère ${questionCount} questions à choix multiples qui :
            1. Testent la compréhension réelle du sujet traité dans la note
            2. Ont chacune une seule bonne réponse et 3 mauvaises réponses plausibles
            3. Sont clairement formulées et sans ambiguïté
            4. Couvrent les points importants du contenu de la note

            FORMAT REQUIS (exemple) :
            {
              "questions": [
                {
                  "id": "q1",
                  "question": "Quelle est la définition d'un espace vectoriel ?",
                  "options": [
                    "Un ensemble muni d'opérations vérifiant certains axiomes",
                    "Une liste de nombres",
                    "Un graphique en deux dimensions",
                    "Un tableau de valeurs"
                  ],
                  "correctAnswer": "Un ensemble muni d'opérations vérifiant certains axiomes",
                  "type": "multiple-choice"
                }
              ]
            }`,
          },
          {
            role: "user",
            content: note.content,
          },
        ]);

        try {
          // Nettoyer et parser la réponse
          const cleanedResponse = response
            .replace(/```json\n?|```/g, "")
            .trim();

          interface QuizResponse {
            questions: Array<{
              id?: string;
              question: string;
              options: string[];
              correctAnswer: string;
              type: "multiple-choice";
            }>;
          }

          const parsedResponse = JSON.parse(cleanedResponse) as QuizResponse;

          if (
            !Array.isArray(parsedResponse.questions) ||
            parsedResponse.questions.length === 0
          ) {
            throw new Error("Format de réponse invalide");
          }

          // Valider chaque question
          const questions = parsedResponse.questions.map((q, index) => {
            if (
              !q.question ||
              !Array.isArray(q.options) ||
              q.options.length !== 4 ||
              !q.correctAnswer
            ) {
              throw new Error(`Question ${index + 1} est invalide`);
            }
            if (!q.options.includes(q.correctAnswer)) {
              throw new Error(
                `La réponse correcte de la question ${
                  index + 1
                } n'est pas dans les options`
              );
            }
            return {
              id: q.id || `q${index + 1}`,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              type: "multiple-choice" as const,
            };
          });

          // Créer le quiz avec les questions validées et les informations de la note
          const quiz = await storage.createQuiz({
            noteId: noteId,
            userId: userId,
            questions: questions,
          });

          // Retourner le quiz avec les informations de la note
          res.status(201).json({
            ...quiz,
            note: {
              id: note.id,
              title: note.title,
            },
          });
        } catch (parseError) {
          console.error(
            "Failed to parse or validate Mistral response:",
            parseError
          );
          console.error("Raw response:", response);
          res.status(500).json({
            message:
              "La génération du quiz a échoué. Les questions générées ne sont pas valides.",
          });
        }
      } catch (mistralError) {
        console.error("Mistral API error:", mistralError);
        res.status(500).json({
          message:
            "Erreur lors de la génération des questions. Veuillez réessayer.",
        });
      }
    } catch (error) {
      console.error("Quiz generation error:", error);
      res.status(500).json({ message: "Failed to generate quiz" });
    }
  });

  // Quiz results submission
  app.post(
    "/api/quizzes/:id/submit",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const quizId = parseInt(req.params.id);
        const { answers, score } = req.body;
        const userId = req.user!.id;

        if (!answers || typeof score !== "number") {
          return res
            .status(400)
            .json({ message: "Les réponses et le score sont requis" });
        }

        const quiz = await storage.getQuiz(quizId);
        if (!quiz) {
          return res.status(404).json({ message: "Quiz introuvable" });
        }

        // Vérifier que l'utilisateur a accès au quiz
        if (quiz.userId !== userId) {
          return res.status(403).json({
            message:
              "Vous n'avez pas la permission de soumettre des résultats pour ce quiz",
          });
        }

        const questions = quiz.questions as QuizQuestion[];

        // Vérifier que les réponses correspondent aux questions du quiz
        const allQuestionsAnswered = questions.every(
          (question) => answers[question.id] !== undefined
        );

        if (!allQuestionsAnswered) {
          return res.status(400).json({
            message: "Toutes les questions doivent avoir une réponse",
          });
        }

        // Recalculer le score côté serveur pour validation
        let correctAnswers = 0;
        questions.forEach((question) => {
          if (answers[question.id] === question.correctAnswer) {
            correctAnswers++;
          }
        });

        const calculatedScore = Math.round(
          (correctAnswers / questions.length) * 100
        );

        // Si le score envoyé ne correspond pas au score calculé, il y a un problème
        if (calculatedScore !== score) {
          return res.status(400).json({ message: "Score invalide" });
        }

        // Sauvegarder le résultat
        const quizResult = await storage.createQuizResult({
          quizId,
          userId,
          answers,
          score: calculatedScore,
        });

        // Mettre à jour l'item de révision pour la note associée
        const revisionItems = await storage.getRevisionItemsByNote(quiz.noteId);
        if (revisionItems.length > 0) {
          const item = revisionItems[0];
          const currentMasteryLevel = item.masteryLevel || 0;
          const masteryLevel = Math.min(
            100,
            currentMasteryLevel + Math.floor(calculatedScore * 0.1)
          );

          // Calculer la prochaine date de révision basée sur la répétition espacée
          const daysToAdd = masteryLevel < 50 ? 1 : masteryLevel < 75 ? 3 : 7;
          const nextReviewDate = new Date();
          nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd);

          await storage.updateRevisionItem(item.id, {
            masteryLevel,
            nextReviewDate,
          });
        }

        res.status(201).json({
          ...quizResult,
          masteryLevel: revisionItems[0]?.masteryLevel || 0,
        });
      } catch (error) {
        console.error("Erreur lors de la soumission du quiz:", error);
        res
          .status(500)
          .json({ message: "Erreur lors de la sauvegarde des résultats" });
      }
    }
  );

  // Quiz routes
  app.get(
    "/api/quizzes",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user!.id;
        const quizzes = await storage.getQuizzesByUser(userId);

        // Récupérer les notes associées pour chaque quiz
        const quizzesWithNotes = await Promise.all(
          quizzes.map(async (quiz) => {
            const note = await storage.getNote(quiz.noteId);
            return {
              ...quiz,
              note: note ? { id: note.id, title: note.title } : null,
            };
          })
        );

        res.json(quizzesWithNotes);
      } catch (error) {
        console.error("Error fetching quizzes:", error);
        res.status(500).json({
          message: "Une erreur est survenue lors du chargement des quiz",
          code: "INTERNAL_ERROR",
        });
      }
    }
  );

  // Quiz results route
  app.get(
    "/api/quizzes/results",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user!.id;
        const results = await storage.getQuizResultsByUser(userId);

        // Enrichir les résultats avec les détails des quiz et des notes
        const enrichedResults = await Promise.all(
          results.map(async (result) => {
            const quiz = await storage.getQuiz(result.quizId);
            if (!quiz) {
              return {
                ...result,
                quiz: null,
                note: null,
              };
            }

            const note = await storage.getNote(quiz.noteId);
            return {
              ...result,
              quiz: {
                ...quiz,
                note: note ? { id: note.id, title: note.title } : null,
              },
            };
          })
        );

        res.json(enrichedResults);
      } catch (error) {
        console.error("Error fetching quiz results:", error);
        res.status(500).json({
          message:
            "Une erreur est survenue lors de la récupération des résultats",
          code: "INTERNAL_ERROR",
        });
      }
    }
  );

  // Individual quiz route
  app.get(
    "/api/quizzes/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const quizId = parseInt(req.params.id);
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ message: "Authentication required" });
        }

        if (isNaN(quizId)) {
          return res.status(400).json({ message: "Invalid quiz ID" });
        }

        const quiz = await storage.getQuiz(quizId);

        if (!quiz) {
          return res.status(404).json({
            message: "Le quiz demandé n'existe plus.",
            code: "QUIZ_NOT_FOUND",
          });
        }

        // Vérifier si l'utilisateur a accès au quiz
        if (quiz.userId !== userId) {
          return res.status(403).json({
            message: "Vous n'avez pas la permission d'accéder à ce quiz.",
            code: "QUIZ_ACCESS_DENIED",
          });
        }

        // Vérifier si la note associée existe toujours
        const note = await storage.getNote(quiz.noteId);
        if (!note) {
          return res.status(404).json({
            message: "La note associée à ce quiz n'existe plus.",
            code: "NOTE_NOT_FOUND",
          });
        }

        // Retourner le quiz avec les informations de la note
        res.json({
          ...quiz,
          note: {
            id: note.id,
            title: note.title,
          },
        });
      } catch (error) {
        console.error("Error fetching quiz:", error);
        res.status(500).json({
          message: "Une erreur est survenue lors du chargement du quiz.",
          code: "INTERNAL_ERROR",
        });
      }
    }
  );

  // Endpoint pour récupérer les résultats des quiz
  app.get("/api/quizzes/results", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "L'ID utilisateur est requis" });
      }

      const results = await storage.getQuizResultsByUser(userId);
      res.json(results);
    } catch (error) {
      console.error("Error fetching quiz results:", error);
      res.status(500).json({
        message:
          "Une erreur est survenue lors de la récupération des résultats",
        code: "INTERNAL_ERROR",
      });
    }
  });

  // Flashcards
  app.get("/api/flashcards", async (req: Request, res: Response) => {
    const userId = parseInt(req.query.userId as string);
    const noteId = req.query.noteId
      ? parseInt(req.query.noteId as string)
      : undefined;

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
        return res
          .status(400)
          .json({ message: "Invalid flashcard data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create flashcard" });
    }
  });

  app.post(
    "/api/notes/:id/generate-flashcards",
    async (req: Request, res: Response) => {
      try {
        const noteId = parseInt(req.params.id);
        const { userId, count = 5 } = req.body;

        if (!userId) {
          return res.status(400).json({ message: "userId est requis" });
        }

        const note = await storage.getNote(noteId);
        if (!note) {
          return res.status(404).json({ message: "Note non trouvée" });
        }

        // Vérifier que la note a suffisamment de contenu
        if (!note.content || note.content.trim().length < 50) {
          return res.status(400).json({
            message:
              "La note ne contient pas assez de contenu pour générer des flashcards",
            code: "INSUFFICIENT_CONTENT",
          });
        }

        try {
          const fullResponse = await callMistralAPI([
            {
              role: "system",
              content: `Tu es un expert en pédagogie chargé de créer des cartes de révision (flashcards) efficaces.
              Analyse attentivement le contenu de la note suivante et génère ${count} flashcards pertinentes.
              
              DIRECTIVES IMPORTANTES :
              1. Chaque flashcard doit être basée sur un concept clé unique et spécifique de la note
              2. Le recto (front) doit poser une question claire et précise
              3. Le verso (back) doit donner une réponse concise mais complète
              4. Évite les questions vagues - préfère des formulations spécifiques
              5. La réponse doit être directe et ne pas dépasser 2-3 phrases
              6. Utilise une variété de types de questions :
                 - Définitions de concepts clés
                 - Applications pratiques
                 - Relations entre les concepts
                 - Exemples concrets
                 - Questions de compréhension
              
              Format JSON requis :
              {
                "flashcards": [
                  {
                    "front": "Question spécifique ou concept à définir",
                    "back": "Réponse précise et complète"
                  }
                ]
              }

              IMPORTANT : Si tu ne trouves pas assez de contenu pertinent pour générer ${count} flashcards de qualité, génère-en moins plutôt que de créer des cartes non pertinentes.`,
            },
            {
              role: "user",
              content: note.content,
            },
          ]);

          // Extraction robuste du JSON depuis la réponse IA
          let jsonString = "";
          const markdownMatch =
            fullResponse.match(/```json\s*([\s\S]*?)```/i) ||
            fullResponse.match(/```\s*([\s\S]*?)```/i);

          if (markdownMatch) {
            jsonString = markdownMatch[1].trim();
          } else {
            const jsonStart = fullResponse.indexOf("{");
            if (jsonStart === -1)
              throw new Error(
                "Format de réponse invalide : aucune structure JSON trouvée"
              );
            jsonString = fullResponse
              .slice(jsonStart)
              .replace(/```json|```/g, "")
              .trim();
          }

          const result = JSON.parse(jsonString);

          if (
            !result.flashcards ||
            !Array.isArray(result.flashcards) ||
            result.flashcards.length === 0
          ) {
            return res.status(500).json({
              message:
                "Impossible de générer des flashcards pertinentes à partir de cette note",
              code: "NO_FLASHCARDS_GENERATED",
            });
          }

          // Valider chaque flashcard
          for (const card of result.flashcards) {
            if (
              !card.front ||
              !card.back ||
              typeof card.front !== "string" ||
              typeof card.back !== "string" ||
              card.front.trim().length === 0 ||
              card.back.trim().length === 0
            ) {
              throw new Error("Format de flashcard invalide");
            }
          }

          // Créer les flashcards en base de données
          const flashcards = await Promise.all(
            result.flashcards.map((card: { front: string; back: string }) =>
              storage.createFlashcard({
                noteId,
                userId,
                front: card.front,
                back: card.back,
                nextReviewDate: new Date(),
                interval: 1,
                easeFactor: 250,
              })
            )
          );

          res.status(201).json(flashcards);
        } catch (error) {
          console.error("Erreur lors de la génération des flashcards:", error);
          res.status(500).json({
            message:
              error instanceof Error
                ? error.message
                : "Erreur inconnue lors de la génération des flashcards",
            code: "GENERATION_FAILED",
          });
        }
      } catch (error) {
        console.error("Erreur lors du traitement de la requête:", error);
        res.status(500).json({
          message:
            "Une erreur est survenue lors de la génération des flashcards",
          code: "INTERNAL_ERROR",
          error: error instanceof Error ? error.message : "Erreur inconnue",
        });
      }
    }
  );

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
          note: note ? { id: note.id, title: note.title } : null,
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
      message:
        "TTS request processed. In a real app, audio would be generated.",
    });
  });

  // === Routes pour les fonctionnalités collaboratives ===
  // Groupes d'étude
  app.get(
    "/api/study-groups",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user!.id;
        const groups = await storage.getStudyGroupsByUser(userId);
        res.json(groups);
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des groupes d'étude:",
          error
        ); // Ajout du log détaillé
        res.status(500).json({
          message: "Erreur lors de la récupération des groupes d'étude",
        });
      }
    }
  );

  app.post(
    "/api/study-groups",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const groupData = insertStudyGroupSchema.parse(req.body);
        const group = await storage.createStudyGroup(groupData);
        res.status(201).json(group);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: "Données de groupe invalides",
            errors: error.errors,
          });
        }
        res
          .status(500)
          .json({ message: "Erreur lors de la création du groupe d'étude" });
      }
    }
  );

  app.get(
    "/api/study-groups/:id",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const groupId = parseInt(req.params.id);
        const group = await storage.getStudyGroup(groupId);

        if (!group) {
          return res.status(404).json({ message: "Groupe d'étude non trouvé" });
        }

        // Vérifier si l'utilisateur est membre du groupe
        const members = await storage.getGroupMembers(groupId);
        const isMember = members.some(
          (member) => member.userId === req.user!.id
        );

        if (!isMember && group.isPrivate) {
          return res.status(403).json({
            message: "Vous n'êtes pas autorisé à accéder à ce groupe",
          });
        }

        res.json(group);
      } catch (error) {
        res.status(500).json({
          message: "Erreur lors de la récupération du groupe d'étude",
        });
      }
    }
  );

  // Membres des groupes
  app.get(
    "/api/study-groups/:id/members",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const groupId = parseInt(req.params.id);
        const members = await storage.getGroupMembers(groupId);

        // Récupérer les détails des utilisateurs
        const memberDetails = await Promise.all(
          members.map(async (member) => {
            const user = await storage.getUser(member.userId);
            return {
              ...member,
              user: user
                ? {
                    id: user.id,
                    username: user.username,
                    displayName: user.displayName,
                    avatar: user.avatar,
                  }
                : null,
            };
          })
        );

        res.json(memberDetails);
      } catch (error) {
        res.status(500).json({
          message: "Erreur lors de la récupération des membres du groupe",
        });
      }
    }
  );

  app.post(
    "/api/study-groups/:id/members",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const groupId = parseInt(req.params.id);
        const { userId, role = "member" } = req.body;

        if (!userId) {
          return res.status(400).json({ message: "userId est requis" });
        }

        // Vérifier si le groupe existe
        const group = await storage.getStudyGroup(groupId);
        if (!group) {
          return res.status(404).json({ message: "Groupe d'étude non trouvé" });
        }

        // Vérifier si l'utilisateur actuel est l'administrateur du groupe
        const members = await storage.getGroupMembers(groupId);
        const currentUserMember = members.find(
          (member) => member.userId === req.user!.id
        );

        if (
          !currentUserMember ||
          (currentUserMember.role !== "admin" &&
            group.creatorId !== req.user!.id)
        ) {
          return res.status(403).json({
            message: "Vous n'êtes pas autorisé à ajouter des membres",
          });
        }

        // Ajouter le membre
        const member = await storage.addGroupMember({
          groupId,
          userId,
          role,
        });

        res.status(201).json(member);
      } catch (error) {
        res.status(500).json({ message: "Erreur lors de l'ajout du membre" });
      }
    }
  );

  // Notes partagées
  app.get(
    "/api/study-groups/:id/shared-notes",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const groupId = parseInt(req.params.id);

        // Vérifier si l'utilisateur est membre du groupe
        const members = await storage.getGroupMembers(groupId);
        const isMember = members.some(
          (member) => member.userId === req.user!.id
        );

        if (!isMember) {
          return res.status(403).json({
            message:
              "Vous n'êtes pas autorisé à accéder aux notes de ce groupe",
          });
        }

        const sharedNotes = await storage.getSharedNotes(groupId);

        // Récupérer les détails des notes
        const notesWithDetails = await Promise.all(
          sharedNotes.map(async (shared) => {
            const note = await storage.getNote(shared.noteId);
            const user = await storage.getUser(shared.sharedBy);

            return {
              ...shared,
              note: note
                ? {
                    id: note.id,
                    title: note.title,
                    content: note.content,
                    summary: note.summary,
                    createdAt: note.createdAt,
                  }
                : null,
              sharedByUser: user
                ? {
                    id: user.id,
                    username: user.username,
                    displayName: user.displayName,
                  }
                : null,
            };
          })
        );

        res.json(notesWithDetails);
      } catch (error) {
        res.status(500).json({
          message: "Erreur lors de la récupération des notes partagées",
        });
      }
    }
  );

  app.post(
    "/api/study-groups/:id/shared-notes",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const groupId = parseInt(req.params.id);
        const { noteId, permissions = "read" } = req.body;

        if (!noteId) {
          return res.status(400).json({ message: "noteId est requis" });
        }

        // Vérifier si l'utilisateur est membre du groupe
        const members = await storage.getGroupMembers(groupId);
        const isMember = members.some(
          (member) => member.userId === req.user!.id
        );

        if (!isMember) {
          return res.status(403).json({
            message:
              "Vous n'êtes pas autorisé à partager des notes dans ce groupe",
          });
        }

        // Vérifier si la note appartient à l'utilisateur
        const note = await storage.getNote(noteId);
        if (!note) {
          return res.status(404).json({ message: "Note non trouvée" });
        }

        if (note.userId !== req.user!.id) {
          return res
            .status(403)
            .json({ message: "Vous ne pouvez partager que vos propres notes" });
        }

        // Partager la note
        const sharedNote = await storage.shareNote({
          noteId,
          groupId,
          sharedBy: req.user!.id,
          permissions,
        });

        res.status(201).json(sharedNote);
      } catch (error) {
        res.status(500).json({ message: "Erreur lors du partage de la note" });
      }
    }
  );

  // Commentaires
  app.get("/api/notes/:id/comments", async (req: Request, res: Response) => {
    try {
      const noteId = parseInt(req.params.id);
      const comments = await storage.getNoteComments(noteId);

      // Enrichir les commentaires avec les informations des utilisateurs
      const commentsWithUsers = await Promise.all(
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
              : null,
          };
        })
      );

      res.json(commentsWithUsers);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erreur lors de la récupération des commentaires" });
    }
  });

  app.post(
    "/api/notes/:id/comments",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const noteId = parseInt(req.params.id);
        const { content } = req.body;

        if (!content) {
          return res
            .status(400)
            .json({ message: "Le contenu du commentaire est requis" });
        }

        // Vérifier si l'utilisateur peut commenter (propriétaire ou note partagée)
        const note = await storage.getNote(noteId);
        if (!note) {
          return res.status(404).json({ message: "Note non trouvée" });
        }

        // Si l'utilisateur n'est pas le propriétaire, vérifier s'il a accès via un partage
        if (note.userId !== req.user!.id) {
          // Trouver tous les groupes dont l'utilisateur est membre
          const userGroups = await storage.getUserGroups(req.user!.id);
          const groupIds = userGroups.map((membership) => membership.groupId);

          // Vérifier si la note est partagée dans l'un de ces groupes
          let hasAccess = false;
          for (const groupId of groupIds) {
            const sharedNotes = await storage.getSharedNotes(groupId);
            if (sharedNotes.some((shared) => shared.noteId === noteId)) {
              hasAccess = true;
              break;
            }
          }

          if (!hasAccess) {
            return res.status(403).json({
              message: "Vous n'êtes pas autorisé à commenter cette note",
            });
          }
        }

        // Ajouter le commentaire
        const comment = await storage.addComment({
          noteId,
          userId: req.user!.id,
          content,
        });

        // Récupérer l'utilisateur pour l'inclure dans la réponse
        const user = await storage.getUser(req.user!.id);

        res.status(201).json({
          ...comment,
          user: {
            id: user!.id,
            username: user!.username,
            displayName: user!.displayName,
            avatar: user!.avatar,
          },
        });
      } catch (error) {
        res
          .status(500)
          .json({ message: "Erreur lors de l'ajout du commentaire" });
      }
    }
  );

  const httpServer = createServer(app);
  return httpServer;
}
