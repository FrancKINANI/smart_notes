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

// Timeout configuration
app.set(
  "keepAliveTimeout",
  parseInt(process.env.KEEP_ALIVE_TIMEOUT || "65000")
);
app.set("headersTimeout", parseInt(process.env.HEADERS_TIMEOUT || "66000"));

// Compression middleware
app.use(compressionWithMonitoring());

// Monitoring middleware
app.use(monitorRequest);

// Security middleware configuration
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

// CORS configuration with extended options
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

// Global rate limit with advanced configuration
const globalLimiter = rateLimit({
  windowMs:
    process.env.NODE_ENV === "development"
      ? 1000
      : parseInt(process.env.RATE_LIMIT_WINDOW || "900000"), // 1 second in dev, 15 minutes in prod
  max:
    process.env.NODE_ENV === "development"
      ? 1000
      : parseInt(process.env.RATE_LIMIT_MAX || "100"), // 1000 requests in dev, 100 in prod
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count successful requests against the rate limit
  keyGenerator: (req) => {
    // Use the real IP behind a proxy if available
    return (
      req.ip ||
      (req.headers["x-forwarded-for"] as string) ||
      req.socket.remoteAddress ||
      "unknown"
    );
  },
});

app.use(globalLimiter);

// Optimized parser configuration
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

// Authentication configuration
setupAuth(app);

// API route configuration
const apiRouter = Router();
apiRouter.use("/learning-stats", learningStatsRouter);
app.use("/api", apiRouter);

// Metrics endpoint with cache
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

// Endpoint to check the application health with detailed monitoring
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

// Error handling middleware with logging
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error("Unhandled error:", {
    error: err.message,
    stack: err.stack,
    status: err.status || 500,
  });

  const status = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "An internal error occurred"
      : err.message || "Internal Server Error";

  res.status(status).json({
    message,
    error: process.env.NODE_ENV === "development" ? err : undefined,
  });
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} signal received. Shutting down cleanly...`);

  try {
    await closeDatabase();
    logger.info("All connections closed cleanly");
    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Server startup
(async () => {
  try {
    // Initialize the database first
    await setupDatabase();
    console.log("Database initialized successfully");

    // Configure authentication after the database
    setupAuth(app);
    console.log("Authentication configuration complete");

    // API route configuration using the router
    const apiRouter = Router();
    apiRouter.use("/learning-stats", learningStatsRouter);
    app.use("/api", apiRouter);
    console.log("API routes configured");

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
      log(`Server started on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Critical error during server startup:", error);
    process.exit(1);
  }
})();
