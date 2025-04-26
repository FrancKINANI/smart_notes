import winston from "winston";
import { Request, Response, NextFunction } from "express";
import { performance } from "perf_hooks";

// Configuration de Winston pour le logging
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

// Ajout du logging console en développement
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Métriques de performance
interface Metrics {
  requests: {
    total: number;
    success: number;
    errors: number;
    statusCodes: Record<number, number>;
  };
  responseTime: {
    total: number;
    count: number;
    max: number;
    min: number;
  };
  memory: {
    lastUsage: NodeJS.MemoryUsage;
    peak: NodeJS.MemoryUsage;
  };
}

const metrics: Metrics = {
  requests: {
    total: 0,
    success: 0,
    errors: 0,
    statusCodes: {},
  },
  responseTime: {
    total: 0,
    count: 0,
    max: 0,
    min: Infinity,
  },
  memory: {
    lastUsage: process.memoryUsage(),
    peak: process.memoryUsage(),
  },
};

// Middleware de monitoring
export const monitorRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = performance.now();
  const originalEnd = res.end;
  const originalWrite = res.write;
  let responseBody = "";

  // Intercepter le corps de la réponse
  res.write = function (chunk: any) {
    responseBody += chunk;
    return originalWrite.apply(res, arguments as any);
  };

  // Intercepter la fin de la réponse
  res.end = function (chunk: any) {
    const duration = performance.now() - start;
    const status = res.statusCode;

    // Mise à jour des métriques
    metrics.requests.total++;
    metrics.requests.statusCodes[status] =
      (metrics.requests.statusCodes[status] || 0) + 1;

    if (status >= 400) {
      metrics.requests.errors++;
    } else {
      metrics.requests.success++;
    }

    metrics.responseTime.total += duration;
    metrics.responseTime.count++;
    metrics.responseTime.max = Math.max(metrics.responseTime.max, duration);
    metrics.responseTime.min = Math.min(metrics.responseTime.min, duration);

    // Logging de la requête
    logger.info({
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      status,
      duration,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      responseSize: Buffer.byteLength(responseBody),
    });

    // Mise à jour des métriques de mémoire
    const memoryUsage = process.memoryUsage();
    metrics.memory.lastUsage = memoryUsage;
    Object.entries(memoryUsage).forEach(([key, value]) => {
      metrics.memory.peak[key as keyof NodeJS.MemoryUsage] = Math.max(
        value,
        metrics.memory.peak[key as keyof NodeJS.MemoryUsage]
      );
    });

    if (status >= 500) {
      logger.error({
        error: "Server Error",
        method: req.method,
        url: req.url,
        status,
        body: req.body,
        stack: new Error().stack,
      });
    }

    return originalEnd.apply(res, arguments as any);
  };

  next();
};

// Endpoint pour récupérer les métriques
export const getMetrics = () => {
  const avgResponseTime =
    metrics.responseTime.count > 0
      ? metrics.responseTime.total / metrics.responseTime.count
      : 0;

  return {
    uptime: process.uptime(),
    timestamp: Date.now(),
    metrics: {
      ...metrics,
      responseTime: {
        ...metrics.responseTime,
        average: avgResponseTime,
      },
    },
  };
};

// Fonction pour réinitialiser les métriques
export const resetMetrics = () => {
  metrics.requests = {
    total: 0,
    success: 0,
    errors: 0,
    statusCodes: {},
  };
  metrics.responseTime = {
    total: 0,
    count: 0,
    max: 0,
    min: Infinity,
  };
};

// Export du logger pour utilisation dans d'autres parties de l'application
export { logger };
