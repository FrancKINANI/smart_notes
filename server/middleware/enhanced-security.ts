import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { createHash, randomBytes, createCipher, createDecipher } from "crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { logger } from "../utils/monitoring";

// Enhanced rate limiting with different tiers
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: options.message || "Too many requests, please try again later",
      retryAfter: Math.ceil(options.windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    keyGenerator: options.keyGenerator || ((req) => req.ip),
    handler: (req, res) => {
      logger.warn("Rate limit exceeded", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        path: req.path,
        method: req.method,
      });
      res.status(429).json({
        error: options.message || "Too many requests, please try again later",
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    },
  });
};

// Progressive delay for suspicious activity
export const createSpeedLimiter = (options: {
  windowMs: number;
  delayAfter: number;
  delayMs: number;
  maxDelayMs?: number;
}) => {
  return slowDown({
    windowMs: options.windowMs,
    delayAfter: options.delayAfter,
    delayMs: options.delayMs,
    maxDelayMs: options.maxDelayMs || 20000,
    skipSuccessfulRequests: true,
  });
};

// Enhanced input sanitization
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === "string") {
      return value
        .replace(/[<>]/g, "") // Remove potential HTML tags
        .replace(/javascript:/gi, "") // Remove javascript: protocol
        .replace(/on\w+=/gi, "") // Remove event handlers
        .trim();
    }
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    if (typeof value === "object" && value !== null) {
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitizeValue(val);
      }
      return sanitized;
    }
    return value;
  };

  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query);
  req.params = sanitizeValue(req.params);
  next();
};

// Advanced CSRF protection
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for GET requests and API endpoints with valid API keys
  if (req.method === "GET" || req.path.startsWith("/api/webhook")) {
    return next();
  }

  const token = req.headers["x-csrf-token"] as string;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    logger.warn("CSRF token validation failed", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      path: req.path,
      hasToken: !!token,
      hasSessionToken: !!sessionToken,
    });
    return res.status(403).json({ error: "Invalid CSRF token" });
  }

  next();
};

// JWT token validation
export const validateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn("JWT validation failed", {
      error: error.message,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// Enhanced permission checking with resource-based access
export const checkPermissions = (
  requiredPermission: string,
  resourceCheck?: (req: Request) => Promise<boolean>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = req.user;
    const userPermissions = user.permissions || [];
    const userRole = user.role || "user";

    // Admin has all permissions
    if (userRole === "admin") {
      return next();
    }

    // Check if user has required permission
    if (!userPermissions.includes(requiredPermission)) {
      logger.warn("Permission denied", {
        userId: user.id,
        requiredPermission,
        userPermissions,
        path: req.path,
      });
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    // Additional resource-based check if provided
    if (resourceCheck) {
      try {
        const hasAccess = await resourceCheck(req);
        if (!hasAccess) {
          return res.status(403).json({ error: "Access denied to this resource" });
        }
      } catch (error) {
        logger.error("Resource permission check failed", { error, userId: user.id });
        return res.status(500).json({ error: "Permission check failed" });
      }
    }

    next();
  };
};

// Request signature validation for webhooks
export const validateWebhookSignature = (secret: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers["x-signature-256"] as string;
    const payload = JSON.stringify(req.body);
    
    if (!signature) {
      return res.status(401).json({ error: "Missing signature" });
    }

    const expectedSignature = createHash("sha256")
      .update(payload + secret)
      .digest("hex");

    if (signature !== `sha256=${expectedSignature}`) {
      logger.warn("Webhook signature validation failed", {
        ip: req.ip,
        path: req.path,
      });
      return res.status(401).json({ error: "Invalid signature" });
    }

    next();
  };
};

// Enhanced security headers
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Basic security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // HSTS for HTTPS
  if (req.secure || req.headers["x-forwarded-proto"] === "https") {
    res.setHeader(
      "Strict-Transport-Security",
      `max-age=${process.env.HSTS_MAX_AGE || 31536000}; includeSubDomains; preload`
    );
  }

  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://api.stripe.com",
    "frame-src 'self' https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  if (process.env.CSP_REPORT_URI) {
    cspDirectives.push(`report-uri ${process.env.CSP_REPORT_URI}`);
  }

  res.setHeader("Content-Security-Policy", cspDirectives.join("; "));

  // Feature Policy
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=(self)"
  );

  next();
};

// Data encryption utilities
export const encryptSensitiveData = (data: string): string => {
  const key = process.env.ENCRYPTION_KEY!;
  const cipher = createCipher("aes-256-cbc", key);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
};

export const decryptSensitiveData = (encryptedData: string): string => {
  const key = process.env.ENCRYPTION_KEY!;
  const decipher = createDecipher("aes-256-cbc", key);
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

// Request validation with detailed error reporting
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      req.body = validated.body;
      req.query = validated.query;
      req.params = validated.params;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        }));

        logger.warn("Request validation failed", {
          errors: formattedErrors,
          path: req.path,
          method: req.method,
          ip: req.ip,
        });

        return res.status(400).json({
          error: "Validation failed",
          details: formattedErrors,
        });
      }

      logger.error("Unexpected validation error", { error });
      return res.status(500).json({ error: "Internal validation error" });
    }
  };
};

// Generate secure random tokens
export const generateSecureToken = (length: number = 32): string => {
  return randomBytes(length).toString("hex");
};

// Rate limiters for different endpoints
export const rateLimiters = {
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: "Too many authentication attempts",
    skipSuccessfulRequests: true,
  }),
  
  api: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    keyGenerator: (req) => req.user?.id || req.ip,
  }),
  
  upload: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 uploads per hour
    keyGenerator: (req) => req.user?.id || req.ip,
  }),
  
  global: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per window per IP
  }),
};

// Speed limiters for progressive delays
export const speedLimiters = {
  auth: createSpeedLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 2, // Start delaying after 2 requests
    delayMs: 500, // 500ms delay
    maxDelayMs: 10000, // Max 10 second delay
  }),
};

export {
  sanitizeInput,
  csrfProtection,
  validateJWT,
  checkPermissions,
  validateWebhookSignature,
  securityHeaders,
  validateRequest,
  generateSecureToken,
};
