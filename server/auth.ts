import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import { User, registerSchema, loginSchema } from "@shared/schema";
import { z } from "zod";
import rateLimit from "express-rate-limit";

// Define a type for Express.User that matches our User type
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
      displayName?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      avatar?: string | null;
      bio?: string | null;
      role: string;
    }
  }
}

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const registerSchema = z
  .object({
    username: z.string().min(3).max(50),
    email: z.string().email(),
    password: z.string().regex(PASSWORD_REGEX, {
      message:
        "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character",
    }),
    confirmPassword: z.string(),
    displayName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export function setupAuth(app: Express) {
  // Session configuration with enhanced security
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dev-secret-key",
      resave: false,
      saveUninitialized: false,
      store: storage.sessionStore,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true, // XSS protection
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax", // CSRF protection
        domain:
          process.env.NODE_ENV === "production"
            ? process.env.COOKIE_DOMAIN
            : "localhost",
      },
      name: "sid", // Change default connect.sid name
    })
  );

  // Passport initialization
  app.use(passport.initialize());
  app.use(passport.session());

  // Local strategy configuration
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Unknown email" });
          }

          const isPasswordValid = await storage.verifyPassword(
            password,
            user.password
          );
          if (!isPasswordValid) {
            return done(null, false, { message: "Incorrect password" });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // User serialization and deserialization for sessions
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Rate limiting for brute force attack protection
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: "Too many login attempts, please try again later",
  });

  // Secure authentication routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const validatedData = registerSchema.parse(req.body);

      // Async check of email and username
      const [existingEmail, existingUsername] = await Promise.all([
        storage.getUserByEmail(validatedData.email),
        storage.getUserByUsername(validatedData.username),
      ]);

      if (existingEmail) {
        return res.status(400).json({
          message: "This email is already in use",
          field: "email",
        });
      }

      if (existingUsername) {
        return res.status(400).json({
          message: "This username is already in use",
          field: "username",
        });
      }

      const { confirmPassword, ...userData } = validatedData;
      const user = await storage.createUser(userData);

      // Create the user profile with validation
      try {
        await storage.createUserProfile({
          userId: user.id,
          studyPreferences: {},
          notificationSettings: {},
        });
      } catch (profileError) {
        // If profile creation fails, delete the user
        await storage.deleteUser(user.id);
        throw profileError;
      }

      // Automatic login after registration with error handling
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({
            message: "Error during automatic login",
            error:
              process.env.NODE_ENV === "development"
                ? loginErr.message
                : undefined,
          });
        }

        return res.status(201).json({
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid registration data",
          errors: error.errors,
        });
      }

      console.error("Error during registration:", error);
      res.status(500).json({
        message: "Error during registration",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  });

  app.post(
    "/api/auth/login",
    loginLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await loginSchema.parseAsync(req.body);

        passport.authenticate("local", (err, user, info) => {
          if (err) {
            return next(err);
          }

          if (!user) {
            return res.status(401).json({
              message: info.message || "Invalid credentials",
              field: info.field,
            });
          }

          req.login(user, (loginErr) => {
            if (loginErr) {
              return next(loginErr);
            }

            // Update last access
            storage
              .updateUserProfile(user.id, {
                lastActive: new Date(),
              })
              .catch(console.error);

            return res.json({
              id: user.id,
              username: user.username,
              email: user.email,
              displayName: user.displayName,
            });
          });
        })(req, res, next);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: "Invalid login data",
            errors: error.errors,
          });
        }
        res.status(500).json({
          message: "Error during login",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    }
  );

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const wasAuthenticated = req.isAuthenticated();

    req.logout((err) => {
      if (err) {
        return res.status(500).json({
          message: "Error during logout",
          error:
            process.env.NODE_ENV === "development" ? err.message : undefined,
        });
      }

      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error("Error while destroying the session:", sessionErr);
        }

        if (!wasAuthenticated) {
          return res.status(401).json({ message: "No active session" });
        }

        res.json({ message: "Logout successful" });
      });
    });
  });

  // Get the current user
  app.get("/api/auth/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user;
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      bio: user.bio,
      role: user.role,
    });
  });

  // Authentication middleware to protect routes
  app.use(
    "/api/protected",
    (req: Request, res: Response, next: NextFunction) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      next();
    }
  );
}
