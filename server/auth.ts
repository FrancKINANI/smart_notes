import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import { User, registerSchema, loginSchema } from "@shared/schema";
import { z } from "zod";
import rateLimit from "express-rate-limit";

// Définir un type pour Express.User qui correspond à notre type User
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
        "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial",
    }),
    confirmPassword: z.string(),
    displayName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export function setupAuth(app: Express) {
  // Configuration de la session avec sécurité renforcée
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dev-secret-key",
      resave: false,
      saveUninitialized: false,
      store: storage.sessionStore,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true, // Protection XSS
        maxAge: 24 * 60 * 60 * 1000, // 1 jour
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax", // Protection CSRF
        domain:
          process.env.NODE_ENV === "production"
            ? process.env.COOKIE_DOMAIN
            : "localhost",
      },
      name: "sid", // Change default connect.sid name
    })
  );

  // Initialisation de Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configuration de la stratégie locale
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
            return done(null, false, { message: "Email inconnu" });
          }

          const isPasswordValid = await storage.verifyPassword(
            password,
            user.password
          );
          if (!isPasswordValid) {
            return done(null, false, { message: "Mot de passe incorrect" });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Sérialisation et désérialisation de l'utilisateur pour les sessions
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

  // Rate limiting pour la protection contre les attaques par force brute
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 tentatives
    message: "Trop de tentatives de connexion, veuillez réessayer plus tard",
  });

  // Routes d'authentification sécurisées
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const validatedData = registerSchema.parse(req.body);

      // Vérification asynchrone de l'email et du nom d'utilisateur
      const [existingEmail, existingUsername] = await Promise.all([
        storage.getUserByEmail(validatedData.email),
        storage.getUserByUsername(validatedData.username),
      ]);

      if (existingEmail) {
        return res.status(400).json({
          message: "Cet email est déjà utilisé",
          field: "email",
        });
      }

      if (existingUsername) {
        return res.status(400).json({
          message: "Ce nom d'utilisateur est déjà utilisé",
          field: "username",
        });
      }

      const { confirmPassword, ...userData } = validatedData;
      const user = await storage.createUser(userData);

      // Création du profil utilisateur avec validation
      try {
        await storage.createUserProfile({
          userId: user.id,
          studyPreferences: {},
          notificationSettings: {},
        });
      } catch (profileError) {
        // Si la création du profil échoue, supprimer l'utilisateur
        await storage.deleteUser(user.id);
        throw profileError;
      }

      // Connexion automatique après inscription avec gestion d'erreur
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({
            message: "Erreur lors de la connexion automatique",
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
          message: "Données d'inscription invalides",
          errors: error.errors,
        });
      }

      console.error("Erreur lors de l'inscription:", error);
      res.status(500).json({
        message: "Erreur lors de l'inscription",
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
              message: info.message || "Identifiants invalides",
              field: info.field,
            });
          }

          req.login(user, (loginErr) => {
            if (loginErr) {
              return next(loginErr);
            }

            // Mise à jour du dernier accès
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
            message: "Données de connexion invalides",
            errors: error.errors,
          });
        }
        res.status(500).json({
          message: "Erreur lors de la connexion",
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
          message: "Erreur lors de la déconnexion",
          error:
            process.env.NODE_ENV === "development" ? err.message : undefined,
        });
      }

      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error(
            "Erreur lors de la destruction de la session:",
            sessionErr
          );
        }

        if (!wasAuthenticated) {
          return res.status(401).json({ message: "Aucune session active" });
        }

        res.json({ message: "Déconnexion réussie" });
      });
    });
  });

  // Obtenir l'utilisateur actuel
  app.get("/api/auth/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Non authentifié" });
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

  // Middleware d'authentification pour protéger les routes
  app.use(
    "/api/protected",
    (req: Request, res: Response, next: NextFunction) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Non authentifié" });
      }
      next();
    }
  );
}
