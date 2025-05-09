import { Express, Router } from "express";
import learningStatsRouter from "./learning-stats";
import chatRouter from "./chat";
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

  // Use the combined router
  app.use(router);

  return app;
}
