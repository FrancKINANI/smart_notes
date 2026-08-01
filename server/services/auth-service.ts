import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "crypto";
import { db } from "../db";
import { users, emailVerifications, passwordResets, userSessions } from "../db/schema";
import { eq, and, gt } from "drizzle-orm";
import { logger } from "../utils/monitoring";
import { EmailService } from "./email-service";
import { generateSecureToken } from "../middleware/enhanced-security";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserPayload {
  id: number;
  email: string;
  username: string;
  role: string;
  permissions: string[];
  emailVerified: boolean;
  tenantId?: string;
}

export class AuthService {
  private static readonly ACCESS_TOKEN_EXPIRY = "15m";
  private static readonly REFRESH_TOKEN_EXPIRY = "7d";
  private static readonly EMAIL_VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly PASSWORD_RESET_EXPIRY = 60 * 60 * 1000; // 1 hour
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Register a new user with email verification
   */
  async register(userData: {
    email: string;
    username: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{ user: UserPayload; message: string }> {
    try {
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (existingUser.length > 0) {
        throw new Error("User already exists with this email");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(
        userData.password,
        parseInt(process.env.BCRYPT_ROUNDS || "12")
      );

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          email: userData.email,
          username: userData.username,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: "user",
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Generate email verification token
      const verificationToken = generateSecureToken(32);
      const expiresAt = new Date(Date.now() + this.EMAIL_VERIFICATION_EXPIRY);

      await db.insert(emailVerifications).values({
        userId: newUser.id,
        token: verificationToken,
        expiresAt,
        createdAt: new Date(),
      });

      // Send verification email
      await this.emailService.sendEmailVerification(
        userData.email,
        userData.username,
        verificationToken
      );

      const userPayload: UserPayload = {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        permissions: this.getUserPermissions(newUser.role),
        emailVerified: false,
      };

      logger.info("User registered successfully", {
        userId: newUser.id,
        email: userData.email,
      });

      return {
        user: userPayload,
        message: "Registration successful. Please check your email to verify your account.",
      };
    } catch (error) {
      logger.error("Registration failed", { error, email: userData.email });
      throw error;
    }
  }

  /**
   * Login user with enhanced security
   */
  async login(
    email: string,
    password: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{ user: UserPayload; tokens: AuthTokens }> {
    try {
      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        throw new Error("Invalid credentials");
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const remainingTime = Math.ceil(
          (user.lockedUntil.getTime() - Date.now()) / 60000
        );
        throw new Error(`Account locked. Try again in ${remainingTime} minutes.`);
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        await this.handleFailedLogin(user.id);
        throw new Error("Invalid credentials");
      }

      // Reset failed attempts on successful login
      if (user.failedLoginAttempts > 0) {
        await db
          .update(users)
          .set({
            failedLoginAttempts: 0,
            lockedUntil: null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
      }

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Create session record
      await this.createSession(user.id, tokens.refreshToken, ipAddress, userAgent);

      const userPayload: UserPayload = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        permissions: this.getUserPermissions(user.role),
        emailVerified: user.emailVerified,
      };

      logger.info("User logged in successfully", {
        userId: user.id,
        email: user.email,
        ipAddress,
      });

      return { user: userPayload, tokens };
    } catch (error) {
      logger.error("Login failed", { error, email, ipAddress });
      throw error;
    }
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    try {
      const [verification] = await db
        .select()
        .from(emailVerifications)
        .where(eq(emailVerifications.token, token))
        .limit(1);

      if (!verification) {
        throw new Error("Invalid verification token");
      }

      if (verification.expiresAt < new Date()) {
        throw new Error("Verification token has expired");
      }

      // Update user as verified
      await db
        .update(users)
        .set({
          emailVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, verification.userId));

      // Delete verification record
      await db
        .delete(emailVerifications)
        .where(eq(emailVerifications.id, verification.id));

      logger.info("Email verified successfully", {
        userId: verification.userId,
      });

      return { message: "Email verified successfully" };
    } catch (error) {
      logger.error("Email verification failed", { error, token });
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        // Don't reveal if email exists
        return { message: "If the email exists, a reset link has been sent." };
      }

      // Generate reset token
      const resetToken = generateSecureToken(32);
      const expiresAt = new Date(Date.now() + this.PASSWORD_RESET_EXPIRY);

      // Delete any existing reset tokens
      await db
        .delete(passwordResets)
        .where(eq(passwordResets.userId, user.id));

      // Create new reset token
      await db.insert(passwordResets).values({
        userId: user.id,
        token: resetToken,
        expiresAt,
        createdAt: new Date(),
      });

      // Send reset email
      await this.emailService.sendPasswordReset(
        user.email,
        user.username,
        resetToken
      );

      logger.info("Password reset requested", {
        userId: user.id,
        email: user.email,
      });

      return { message: "If the email exists, a reset link has been sent." };
    } catch (error) {
      logger.error("Password reset request failed", { error, email });
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ message: string }> {
    try {
      const [reset] = await db
        .select()
        .from(passwordResets)
        .where(eq(passwordResets.token, token))
        .limit(1);

      if (!reset) {
        throw new Error("Invalid reset token");
      }

      if (reset.expiresAt < new Date()) {
        throw new Error("Reset token has expired");
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(
        newPassword,
        parseInt(process.env.BCRYPT_ROUNDS || "12")
      );

      // Update user password
      await db
        .update(users)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, reset.userId));

      // Delete reset token
      await db
        .delete(passwordResets)
        .where(eq(passwordResets.id, reset.id));

      // Invalidate all user sessions
      await db
        .delete(userSessions)
        .where(eq(userSessions.userId, reset.userId));

      logger.info("Password reset successfully", {
        userId: reset.userId,
      });

      return { message: "Password reset successfully" };
    } catch (error) {
      logger.error("Password reset failed", { error, token });
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET!
      ) as any;

      // Check if session exists
      const [session] = await db
        .select()
        .from(userSessions)
        .where(
          and(
            eq(userSessions.userId, decoded.userId),
            eq(userSessions.refreshToken, refreshToken),
            gt(userSessions.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!session) {
        throw new Error("Invalid refresh token");
      }

      // Get user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);

      if (!user) {
        throw new Error("User not found");
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Update session with new refresh token
      await db
        .update(userSessions)
        .set({
          refreshToken: tokens.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          updatedAt: new Date(),
        })
        .where(eq(userSessions.id, session.id));

      return tokens;
    } catch (error) {
      logger.error("Token refresh failed", { error });
      throw new Error("Invalid refresh token");
    }
  }

  /**
   * Logout user and invalidate session
   */
  async logout(refreshToken: string): Promise<{ message: string }> {
    try {
      await db
        .delete(userSessions)
        .where(eq(userSessions.refreshToken, refreshToken));

      return { message: "Logged out successfully" };
    } catch (error) {
      logger.error("Logout failed", { error });
      throw error;
    }
  }

  /**
   * Generate JWT tokens
   */
  private async generateTokens(user: any): Promise<AuthTokens> {
    const payload: UserPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      permissions: this.getUserPermissions(user.role),
      emailVerified: user.emailVerified,
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET!,
      {
        expiresIn: this.REFRESH_TOKEN_EXPIRY,
      }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  /**
   * Create user session
   */
  private async createSession(
    userId: number,
    refreshToken: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    await db.insert(userSessions).values({
      userId,
      refreshToken,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Handle failed login attempts
   */
  private async handleFailedLogin(userId: number): Promise<void> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return;

    const failedAttempts = (user.failedLoginAttempts || 0) + 1;
    const updateData: any = {
      failedLoginAttempts: failedAttempts,
      updatedAt: new Date(),
    };

    // Lock account after max attempts
    if (failedAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      updateData.lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION);
    }

    await db.update(users).set(updateData).where(eq(users.id, userId));
  }

  /**
   * Get user permissions based on role
   */
  private getUserPermissions(role: string): string[] {
    const permissions: Record<string, string[]> = {
      admin: [
        "read:all",
        "write:all",
        "delete:all",
        "manage:users",
        "manage:system",
      ],
      moderator: ["read:all", "write:own", "moderate:content"],
      user: ["read:own", "write:own"],
    };

    return permissions[role] || permissions.user;
  }
}

export const authService = new AuthService();
