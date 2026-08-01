import { Request, Response, NextFunction } from "express";
import { rateLimit } from "express-rate-limit";
import { PATTERNS } from "@shared/validation";

// Per-IP rate limiting for sensitive routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: "Too many attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Protection against injections
export const sanitizeInput = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const sanitize = (obj: any) => {
    if (typeof obj !== "object" || obj === null) return obj;

    const sanitized: any = Array.isArray(obj) ? [] : {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        // Escape HTML special characters
        sanitized[key] = value
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\"/g, "&quot;")
          .replace(/'/g, "&#x27;")
          .replace(/\\/g, "&#x5C;");
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);
  next();
};

// Request parameter validation
export const validateParams = (schema: any) => {
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
      res.status(400).json({
        message: "Invalid data",
        errors: error.errors,
      });
    }
  };
};

// Permission checks
export const checkPermissions = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user.role !== requiredRole && req.user.role !== "admin") {
      return res.status(403).json({ message: "Permission denied" });
    }

    next();
  };
};

// CSRF attack protection
export const csrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers["x-csrf-token"] || req.body._csrf;
  if (!token || token !== req.session?.csrfToken) {
    return res.status(403).json({ message: "Invalid CSRF token" });
  }
  next();
};

// Additional security headers
export const securityHeaders = (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Feature-Policy",
    "geolocation 'none'; microphone 'none'; camera 'none'"
  );
  next();
};

// Sensitive data validation
export const validateSensitiveData = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password, username } = req.body;

  if (email && !PATTERNS.EMAIL.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  if (password && !PATTERNS.PASSWORD.test(password)) {
    return res.status(400).json({ message: "Invalid password format" });
  }

  if (username && !PATTERNS.USERNAME.test(username)) {
    return res
      .status(400)
      .json({ message: "Invalid username format" });
  }

  next();
};
