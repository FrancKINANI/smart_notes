import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { compressionWithMonitoring } from "./middleware/compression";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { setupVite, serveStatic, log } from "./vite";
import { db, checkDatabaseHealth, closeDatabase, setupDatabase } from "./db";
import { monitorRequest, getMetrics, logger } from "./utils/monitoring";
import { checkPermissions } from "./middleware/security";
import { Router } from "express";
import learningStatsRouter from "./routes/learning-stats";

const app = express();

// Configuration des timeouts
app.set(
  "keepAliveTimeout",
  parseInt(process.env.KEEP_ALIVE_TIMEOUT || "65000")
);
app.set("headersTimeout", parseInt(process.env.HEADERS_TIMEOUT || "66000"));

// Middleware de compression
app.use(compressionWithMonitoring());

// Middleware de monitoring
app.use(monitorRequest);

// Configuration des middlewares de sécurité
app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === "development"
        ? false
        : {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", "data:", "blob:"],
              connectSrc: ["'self'"],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              mediaSrc: ["'self'"],
              frameSrc: ["'self'"],
            },
          },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
  })
);

// Configuration CORS avec options étendues
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.CLIENT_URL
        : "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "X-CSRF-Token",
    ],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    maxAge: 600,
  })
);

// Limite de requêtes globale avec configuration avancée
const globalLimiter = rateLimit({
  windowMs:
    process.env.NODE_ENV === "development"
      ? 1000
      : parseInt(process.env.RATE_LIMIT_WINDOW || "900000"), // 1 seconde en dev, 15 minutes en prod
  max:
    process.env.NODE_ENV === "development"
      ? 1000
      : parseInt(process.env.RATE_LIMIT_MAX || "100"), // 1000 requêtes en dev, 100 en prod
  message: "Trop de requêtes depuis cette IP, veuillez réessayer plus tard",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count successful requests against the rate limit
  keyGenerator: (req) => {
    // Utiliser l'IP réelle derrière un proxy si disponible
    return (
      req.ip ||
      (req.headers["x-forwarded-for"] as string) ||
      req.socket.remoteAddress ||
      "unknown"
    );
  },
});

app.use(globalLimiter);

// Configuration optimisée des parsers
app.use(
  express.json({
    limit: process.env.MAX_REQUEST_SIZE || "10mb",
    strict: true,
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: process.env.MAX_REQUEST_SIZE || "10mb",
    parameterLimit: 1000,
  })
);

app.use(cookieParser(process.env.COOKIE_SECRET));

// Configuration de l'authentification
setupAuth(app);

// Configuration des routes API
const apiRouter = Router();
apiRouter.use("/learning-stats", learningStatsRouter);
app.use("/api", apiRouter);

// Endpoint pour les métriques avec cache
let cachedMetrics: any = null;
let lastMetricsUpdate = 0;

app.get("/api/metrics", checkPermissions("admin"), (_req, res) => {
  const now = Date.now();
  const metricsInterval = parseInt(process.env.METRICS_INTERVAL || "60000");

  if (!cachedMetrics || now - lastMetricsUpdate > metricsInterval) {
    cachedMetrics = getMetrics();
    lastMetricsUpdate = now;
  }

  res.json(cachedMetrics);
});

// Endpoint pour vérifier la santé de l'application avec monitoring détaillé
app.get("/api/health", async (_req, res) => {
  try {
    const startTime = process.hrtime();
    const dbHealth = await checkDatabaseHealth();
    const dbResponseTime = process.hrtime(startTime);

    if (!dbHealth) {
      throw new Error("Database health check failed");
    }

    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: "up",
          responseTime: `${(
            dbResponseTime[0] * 1000 +
            dbResponseTime[1] / 1e6
          ).toFixed(2)}ms`,
        },
        server: {
          status: "up",
          uptime: uptime,
          memory: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
          },
        },
      },
    });
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      services: {
        database: error instanceof Error ? "down" : "unknown",
        server: "up",
      },
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Middleware de gestion des erreurs avec logging
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error("Erreur non gérée:", {
    error: err.message,
    stack: err.stack,
    status: err.status || 500,
  });

  const status = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Une erreur interne s'est produite"
      : err.message || "Internal Server Error";

  res.status(status).json({
    message,
    error: process.env.NODE_ENV === "development" ? err : undefined,
  });
});

// Gestion de la fermeture propre
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} signal reçu. Fermeture propre...`);

  try {
    await closeDatabase();
    logger.info("Toutes les connexions ont été fermées proprement");
    process.exit(0);
  } catch (error) {
    logger.error("Erreur lors de la fermeture:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Démarrage du serveur
(async () => {
  try {
    // Initialiser la base de données en premier
    await setupDatabase();
    console.log("Base de données initialisée avec succès");

    // Configurer l'authentification après la base de données
    setupAuth(app);
    console.log("Configuration de l'authentification terminée");

    // Configuration des routes API en utilisant le routeur
    const apiRouter = Router();
    apiRouter.use("/learning-stats", learningStatsRouter);
    app.use("/api", apiRouter);
    console.log("Routes API configurées");

    // Register other routes
    const server = await registerRoutes(app);

    // Setup Vite or static serving last
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const port = 5000;
    server.listen(port, "localhost", () => {
      log(`Serveur démarré sur http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Erreur critique lors du démarrage du serveur:", error);
    process.exit(1);
  }
})();
