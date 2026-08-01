import { Express, Router } from "express";
import learningStatsRouter from "./learning-stats";
import chatRouter from "./chat";
import aiRouter from "./ai";
import notesRouter from "./notes";
import quizzesRouter from "./quizzes";
import flashcardsRouter from "./flashcards";
import subjectsRouter from "./subjects";
import studyGroupsRouter from "./study-groups";
import revisionItemsRouter from "./revision-items";
import usersRouter from "./users";
import adminRouter from "./admin";
import dashboardRouter from "./dashboard";
import ttsRouter from "./tts";
import { setupAuth } from "../auth";
import { etagMiddleware } from "../middleware/cache-control";

export function registerRoutes(app: Express): Express {
  // Configure auth
  setupAuth(app);

  const router = Router();

  // Global middleware
  router.use(etagMiddleware);

  // Mount feature-specific routers
  router.use("/api/learning-stats", learningStatsRouter);
  router.use("/api/chat", chatRouter);
  router.use("/api/ai", aiRouter);
  router.use("/api/notes", notesRouter);
  router.use("/api/quizzes", quizzesRouter);
  router.use("/api/flashcards", flashcardsRouter);
  router.use("/api/subjects", subjectsRouter);
  router.use("/api/study-groups", studyGroupsRouter);
  router.use("/api/revision-items", revisionItemsRouter);
  router.use("/api/users", usersRouter);
  router.use("/api/admin", adminRouter); // /api/admin/llm-settings (GET/PUT/test)
  router.use("/api", dashboardRouter); // /api/user/stats, /api/dashboard/*
  router.use("/api/tts", ttsRouter);

  // Use the combined router
  app.use(router);

  return app;
}
