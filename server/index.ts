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
import { db, checkDatabaseHealth, closeDatabase } from "./db";
import { monitorRequest, getMetrics, logger } from "./utils/monitoring";
import { checkPermissions } from "./middleware/security";

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
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: true,
    dnsPrefetchControl: true,
    frameguard: true,
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: true,
    xssFilter: true,
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
    maxAge: 600, // 10 minutes
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
    type: "application/json",
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf.toString());
      } catch (e) {
        res.status(400).json({ message: "Invalid JSON" });
        throw new Error("Invalid JSON");
      }
    },
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

// Middleware de timeout pour les requêtes
app.use((req, res, next) => {
  const timeout = parseInt(process.env.REQUEST_TIMEOUT || "30000");
  req.setTimeout(timeout, () => {
    res.status(408).json({ message: "Request Timeout" });
  });
  next();
});

// Logging des requêtes en développement
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      let logLine = `${req.method} ${req.url} ${res.statusCode} ${duration}ms`;

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    });
    next();
  });
}

// Configuration de l'authentification
setupAuth(app);

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

(async () => {
  const server = await registerRoutes(app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen(port, "localhost", () => {
    log(`serving on port ${port}`);
  });
})();
