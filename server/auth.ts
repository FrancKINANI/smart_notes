import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import { User, registerSchema, loginSchema } from "@shared/schema";
import { z } from "zod";

// Définir un type pour Express.User qui correspond à notre type User
declare global {
  namespace Express {
    interface User extends User {}
  }
}

export function setupAuth(app: Express) {
  // Configuration de la session
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dev-secret-key",
      resave: false,
      saveUninitialized: false,
      store: storage.sessionStore,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 1 jour
      },
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

  // Routes d'authentification
  // Inscription
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      // Valider les données d'inscription
      const validatedData = registerSchema.parse(req.body);
      
      // Vérifier si l'email existe déjà
      const existingUserByEmail = await storage.getUserByEmail(validatedData.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Cet email est déjà utilisé" });
      }
      
      // Vérifier si le nom d'utilisateur existe déjà
      const existingUserByUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Ce nom d'utilisateur est déjà utilisé" });
      }

      // Créer l'utilisateur
      const { confirmPassword, ...userData } = validatedData;
      const user = await storage.createUser(userData);

      // Créer un profil utilisateur
      await storage.createUserProfile({
        userId: user.id,
        studyPreferences: {},
        notificationSettings: {}
      });

      // Connexion automatique après inscription
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Erreur lors de la connexion automatique" });
        }
        return res.status(201).json({
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Données d'inscription invalides", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Erreur lors de l'inscription" });
    }
  });

  // Connexion
  app.post("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
    try {
      // Valider les données de connexion
      loginSchema.parse(req.body);
      
      passport.authenticate("local", (err, user, info) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).json({ message: info.message || "Identifiants invalides" });
        }
        req.login(user, (loginErr) => {
          if (loginErr) {
            return next(loginErr);
          }
          return res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.displayName
          });
        });
      })(req, res, next);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Données de connexion invalides", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Erreur lors de la connexion" });
    }
  });

  // Déconnexion
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Erreur lors de la déconnexion" });
      }
      res.json({ message: "Déconnecté avec succès" });
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
      role: user.role
    });
  });

  // Middleware d'authentification pour protéger les routes
  app.use("/api/protected", (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    next();
  });
}