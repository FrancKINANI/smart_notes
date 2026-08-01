import { Router } from "express";
import { z } from "zod";
import { authService } from "../services/auth-service";
import { 
  rateLimiters, 
  speedLimiters, 
  validateRequest, 
  sanitizeInput,
  generateSecureToken 
} from "../middleware/enhanced-security";
import { logger } from "../utils/monitoring";

const router = Router();

// Validation schemas
const registerSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format").toLowerCase(),
    username: z.string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be less than 30 characters")
      .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),
    firstName: z.string().min(1, "First name is required").max(50).optional(),
    lastName: z.string().min(1, "Last name is required").max(50).optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format").toLowerCase(),
    password: z.string().min(1, "Password is required"),
    rememberMe: z.boolean().optional(),
  }),
});

const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Verification token is required"),
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format").toLowerCase(),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Reset token is required"),
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),
  }),
});

const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "Refresh token is required"),
  }),
});

// Apply security middleware to all auth routes
router.use(sanitizeInput);

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post(
  "/register",
  rateLimiters.auth,
  speedLimiters.auth,
  validateRequest(registerSchema),
  async (req, res) => {
    try {
      const { email, username, password, firstName, lastName } = req.body;

      const result = await authService.register({
        email,
        username,
        password,
        firstName,
        lastName,
      });

      // Generate CSRF token for session
      const csrfToken = generateSecureToken(32);
      req.session.csrfToken = csrfToken;

      logger.info("User registration successful", {
        userId: result.user.id,
        email: result.user.email,
        ip: req.ip,
      });

      res.status(201).json({
        success: true,
        message: result.message,
        user: result.user,
        csrfToken,
      });
    } catch (error) {
      logger.error("Registration failed", {
        error: error.message,
        email: req.body.email,
        ip: req.ip,
      });

      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post(
  "/login",
  rateLimiters.auth,
  speedLimiters.auth,
  validateRequest(loginSchema),
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get("User-Agent") || "";

      const result = await authService.login(email, password, ipAddress, userAgent);

      // Generate CSRF token for session
      const csrfToken = generateSecureToken(32);
      req.session.csrfToken = csrfToken;
      req.session.userId = result.user.id;

      // Set secure HTTP-only cookie for refresh token
      res.cookie("refreshToken", result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      logger.info("User login successful", {
        userId: result.user.id,
        email: result.user.email,
        ip: ipAddress,
      });

      res.json({
        success: true,
        message: "Login successful",
        user: result.user,
        accessToken: result.tokens.accessToken,
        expiresIn: result.tokens.expiresIn,
        csrfToken,
      });
    } catch (error) {
      logger.error("Login failed", {
        error: error.message,
        email: req.body.email,
        ip: req.ip,
      });

      res.status(401).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * @route POST /api/auth/verify-email
 * @desc Verify user email address
 * @access Public
 */
router.post(
  "/verify-email",
  rateLimiters.auth,
  validateRequest(verifyEmailSchema),
  async (req, res) => {
    try {
      const { token } = req.body;

      const result = await authService.verifyEmail(token);

      logger.info("Email verification successful", {
        token: token.substring(0, 8) + "...",
        ip: req.ip,
      });

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      logger.error("Email verification failed", {
        error: error.message,
        token: req.body.token?.substring(0, 8) + "...",
        ip: req.ip,
      });

      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * @route POST /api/auth/forgot-password
 * @desc Request password reset
 * @access Public
 */
router.post(
  "/forgot-password",
  rateLimiters.auth,
  validateRequest(forgotPasswordSchema),
  async (req, res) => {
    try {
      const { email } = req.body;

      const result = await authService.requestPasswordReset(email);

      logger.info("Password reset requested", {
        email,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      logger.error("Password reset request failed", {
        error: error.message,
        email: req.body.email,
        ip: req.ip,
      });

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: "If the email exists, a reset link has been sent.",
      });
    }
  }
);

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password with token
 * @access Public
 */
router.post(
  "/reset-password",
  rateLimiters.auth,
  validateRequest(resetPasswordSchema),
  async (req, res) => {
    try {
      const { token, password } = req.body;

      const result = await authService.resetPassword(token, password);

      logger.info("Password reset successful", {
        token: token.substring(0, 8) + "...",
        ip: req.ip,
      });

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      logger.error("Password reset failed", {
        error: error.message,
        token: req.body.token?.substring(0, 8) + "...",
        ip: req.ip,
      });

      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post(
  "/refresh",
  rateLimiters.api,
  validateRequest(refreshTokenSchema),
  async (req, res) => {
    try {
      const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: "Refresh token required",
        });
      }

      const tokens = await authService.refreshToken(refreshToken);

      // Update refresh token cookie
      res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        success: true,
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      });
    } catch (error) {
      logger.error("Token refresh failed", {
        error: error.message,
        ip: req.ip,
      });

      res.status(401).json({
        success: false,
        error: "Invalid refresh token",
      });
    }
  }
);

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post("/logout", async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    // Clear session and cookies
    req.session.destroy((err) => {
      if (err) {
        logger.error("Session destruction failed", { error: err });
      }
    });

    res.clearCookie("refreshToken");
    res.clearCookie("connect.sid");

    logger.info("User logout successful", {
      userId: req.user?.id,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    logger.error("Logout failed", {
      error: error.message,
      userId: req.user?.id,
      ip: req.ip,
    });

    res.status(500).json({
      success: false,
      error: "Logout failed",
    });
  }
});

/**
 * @route GET /api/auth/me
 * @desc Get current user info
 * @access Private
 */
router.get("/me", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated",
      });
    }

    res.json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    logger.error("Get user info failed", {
      error: error.message,
      userId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      error: "Failed to get user info",
    });
  }
});

export default router;
