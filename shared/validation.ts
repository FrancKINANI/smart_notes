import { z } from "zod";

// Regex patterns
export const PATTERNS = {
  PASSWORD:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,20}$/,
  EMAIL: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
  COLOR: /^#[0-9A-Fa-f]{6}$/,
};

// Custom error messages
export const ERROR_MESSAGES = {
  required: "This field is required",
  invalidEmail: "Invalid email format",
  invalidPassword:
    "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character",
  passwordMismatch: "Passwords do not match",
  invalidUsername:
    "Username must be between 3 and 20 characters (letters, numbers, _ and - only)",
  invalidColor: "Color must be a valid hex color (e.g. #FF0000)",
  invalidScore: "Score must be between 0 and 100",
  invalidMasteryLevel: "Mastery level must be between 0 and 5",
  invalidInterval: "Interval must be greater than 0",
  invalidEaseFactor: "Ease factor must be between 130 and 500",
};

// Validation schemas
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

// Types derived from the schemas
export type ValidationSchemas = typeof validationSchemas;
export type ValidationTypes = {
  [K in keyof ValidationSchemas]: z.infer<ValidationSchemas[K]>;
};
