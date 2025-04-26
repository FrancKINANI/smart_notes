import { z } from "zod";

// Regex patterns
export const PATTERNS = {
  PASSWORD:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,20}$/,
  EMAIL: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
  COLOR: /^#[0-9A-Fa-f]{6}$/,
};

// Messages d'erreur personnalisés
export const ERROR_MESSAGES = {
  required: "Ce champ est requis",
  invalidEmail: "Format d'email invalide",
  invalidPassword:
    "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial",
  passwordMismatch: "Les mots de passe ne correspondent pas",
  invalidUsername:
    "Le nom d'utilisateur doit contenir entre 3 et 20 caractères (lettres, chiffres, _ et - uniquement)",
  invalidColor: "La couleur doit être au format hexadécimal (ex: #FF0000)",
  invalidScore: "Le score doit être compris entre 0 et 100",
  invalidMasteryLevel: "Le niveau de maîtrise doit être compris entre 0 et 5",
  invalidInterval: "L'intervalle doit être supérieur à 0",
  invalidEaseFactor:
    "Le facteur de facilité doit être compris entre 130 et 500",
};

// Schémas de validation
export const validationSchemas = {
  user: z.object({
    username: z
      .string()
      .regex(PATTERNS.USERNAME, ERROR_MESSAGES.invalidUsername),
    email: z.string().email(ERROR_MESSAGES.invalidEmail),
    password: z
      .string()
      .regex(PATTERNS.PASSWORD, ERROR_MESSAGES.invalidPassword),
  }),

  note: z.object({
    title: z.string().min(1, ERROR_MESSAGES.required).max(255),
    content: z.string().min(1, ERROR_MESSAGES.required),
    subjectId: z.number().int().positive(),
    sourceType: z.string(),
  }),

  subject: z.object({
    name: z.string().min(1, ERROR_MESSAGES.required).max(255),
    color: z.string().regex(PATTERNS.COLOR, ERROR_MESSAGES.invalidColor),
  }),

  quiz: z.object({
    noteId: z.number().int().positive(),
    questions: z
      .array(
        z.object({
          question: z.string().min(1, ERROR_MESSAGES.required),
          options: z.array(z.string()).min(2),
          correctAnswer: z.string().min(1, ERROR_MESSAGES.required),
          type: z.enum(["multiple-choice", "true-false", "short-answer"]),
        })
      )
      .min(1),
  }),

  quizResult: z.object({
    quizId: z.number().int().positive(),
    score: z.number().min(0).max(100),
    answers: z.record(z.string()),
  }),

  flashcard: z.object({
    noteId: z.number().int().positive(),
    front: z.string().min(1, ERROR_MESSAGES.required),
    back: z.string().min(1, ERROR_MESSAGES.required),
    interval: z.number().int().positive(),
    easeFactor: z.number().min(130).max(500),
  }),

  revisionItem: z.object({
    noteId: z.number().int().positive(),
    masteryLevel: z.number().min(0).max(5),
    nextReviewDate: z.date().optional(),
  }),

  studyGroup: z.object({
    name: z.string().min(1, ERROR_MESSAGES.required).max(255),
    description: z.string().optional(),
  }),
};

// Types dérivés des schémas
export type ValidationSchemas = typeof validationSchemas;
export type ValidationTypes = {
  [K in keyof ValidationSchemas]: z.infer<ValidationSchemas[K]>;
};
