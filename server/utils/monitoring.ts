import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { Request, Response, NextFunction } from "express";
import { performance } from "perf_hooks";

// Configure Winston logger
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta,
    });
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  defaultMeta: {
    service: "smartnotes-api",
    version: process.env.APP_VERSION || "2.0.0",
    environment: process.env.NODE_ENV || "development",
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),

    // File transport for all logs
    new DailyRotateFile({
      filename: "logs/application-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: process.env.LOG_MAX_SIZE || "20m",
      maxFiles: process.env.LOG_MAX_FILES || "14d",
      format: logFormat,
    }),

    // Separate file for errors
    new DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxSize: process.env.LOG_MAX_SIZE || "20m",
      maxFiles: process.env.LOG_MAX_FILES || "30d",
      format: logFormat,
    }),
  ],
});

// Add Sentry transport for production error tracking
if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
  const Sentry = require("@sentry/node");
  
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.APP_VERSION,
  });

  logger.add(
    new winston.transports.Console({
      level: "error",
      format: winston.format.printf((info) => {
        if (info.level === "error") {
          Sentry.captureException(new Error(info.message), {
            extra: info,
          });
        }
        return "";
      }),
    })
  );
}

// Performance monitoring middleware
export const performanceMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const startTime = performance.now();
  const startMemory = process.memoryUsage();

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any) {
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    const responseTime = endTime - startTime;
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

    // Log request details
    logger.info("HTTP Request", {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: Math.round(responseTime * 100) / 100, // Round to 2 decimal places
      memoryDelta: Math.round(memoryDelta / 1024), // Convert to KB
      userAgent: req.get("User-Agent"),
      ip: req.ip,
      userId: req.user?.id,
    });

    // Alert on slow requests
    if (responseTime > 5000) { // 5 seconds
      logger.warn("Slow request detected", {
        method: req.method,
        url: req.url,
        responseTime,
        userId: req.user?.id,
      });
    }

    // Alert on high memory usage
    if (memoryDelta > 50 * 1024 * 1024) { // 50MB
      logger.warn("High memory usage detected", {
        method: req.method,
        url: req.url,
        memoryDelta: Math.round(memoryDelta / 1024 / 1024), // Convert to MB
        userId: req.user?.id,
      });
    }

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Error tracking middleware
export const errorTracking = (error: Error, req: Request, res: Response, next: NextFunction) => {
  const errorId = generateErrorId();
  
  logger.error("Unhandled error", {
    errorId,
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === "production") {
    res.status(500).json({
      success: false,
      error: "Internal server error",
      errorId,
    });
  } else {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      errorId,
    });
  }
};

// Health check endpoint data
export const healthCheck = {
  status: "healthy",
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
  memory: process.memoryUsage(),
  version: process.env.APP_VERSION || "2.0.0",
  environment: process.env.NODE_ENV || "development",
};

// Update health check data periodically
setInterval(() => {
  healthCheck.timestamp = new Date().toISOString();
  healthCheck.uptime = process.uptime();
  healthCheck.memory = process.memoryUsage();
}, 30000); // Update every 30 seconds

// Audit logging
export const auditLog = (
  action: string,
  resource: string,
  resourceId?: number,
  userId?: number,
  details?: any,
  req?: Request
) => {
  logger.info("Audit Log", {
    type: "audit",
    action,
    resource,
    resourceId,
    userId,
    details,
    ip: req?.ip,
    userAgent: req?.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });
};

// Security event logging
export const securityLog = (
  event: string,
  severity: "low" | "medium" | "high" | "critical",
  details: any,
  req?: Request
) => {
  logger.warn("Security Event", {
    type: "security",
    event,
    severity,
    details,
    ip: req?.ip,
    userAgent: req?.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });

  // Alert on critical security events
  if (severity === "critical") {
    logger.error("Critical Security Event", {
      event,
      details,
      ip: req?.ip,
    });
  }
};

// Business metrics logging
export const businessMetrics = (
  metric: string,
  value: number,
  unit: string,
  tags?: Record<string, string>
) => {
  logger.info("Business Metric", {
    type: "business",
    metric,
    value,
    unit,
    tags,
    timestamp: new Date().toISOString(),
  });
};

// Generate unique error ID
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Metrics collection class
export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Map<string, any> = new Map();

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  increment(metric: string, value: number = 1, tags?: Record<string, string>) {
    const key = this.getMetricKey(metric, tags);
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + value);
  }

  gauge(metric: string, value: number, tags?: Record<string, string>) {
    const key = this.getMetricKey(metric, tags);
    this.metrics.set(key, value);
  }

  timing(metric: string, duration: number, tags?: Record<string, string>) {
    const key = this.getMetricKey(metric, tags);
    const timings = this.metrics.get(key) || [];
    timings.push(duration);
    this.metrics.set(key, timings);
  }

  getMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of this.metrics.entries()) {
      result[key] = value;
    }
    return result;
  }

  private getMetricKey(metric: string, tags?: Record<string, string>): string {
    if (!tags) return metric;
    const tagString = Object.entries(tags)
      .map(([key, value]) => `${key}:${value}`)
      .join(",");
    return `${metric}[${tagString}]`;
  }
}

// Export metrics instance
export const metrics = MetricsCollector.getInstance();

// Legacy middleware for backward compatibility
export const performanceMiddleware = performanceMonitoring;

// Graceful shutdown handling
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", {
    reason,
    promise: promise.toString(),
  });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});
