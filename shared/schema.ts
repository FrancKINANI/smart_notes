import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  role: text("role").default("student"),
});

export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectId: integer("subject_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary"),
  enhancedContent: text("enhanced_content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastReviewed: timestamp("last_reviewed"),
  sourceType: text("source_type").notNull(), // "text", "photo", "import"
});

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  noteId: integer("note_id").notNull(),
  userId: integer("user_id").notNull(),
  questions: jsonb("questions").notNull(), // Array of question objects
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quizResults = pgTable("quiz_results", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull(),
  userId: integer("user_id").notNull(),
  score: integer("score").notNull(),
  answers: jsonb("answers").notNull(), // User answers
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const flashcards = pgTable("flashcards", {
  id: serial("id").primaryKey(),
  noteId: integer("note_id").notNull(),
  userId: integer("user_id").notNull(),
  front: text("front").notNull(),
  back: text("back").notNull(),
  nextReviewDate: timestamp("next_review_date"),
  interval: integer("interval").default(1),
  easeFactor: integer("ease_factor").default(250),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const revisionItems = pgTable("revision_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  noteId: integer("note_id").notNull(),
  masteryLevel: integer("mastery_level").default(0), // 0-100
  nextReviewDate: timestamp("next_review_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  role: true,
});

export const insertSubjectSchema = createInsertSchema(subjects).pick({
  name: true,
  color: true,
});

export const insertNoteSchema = createInsertSchema(notes).pick({
  userId: true,
  subjectId: true,
  title: true,
  content: true,
  summary: true,
  enhancedContent: true,
  sourceType: true,
});

export const insertQuizSchema = createInsertSchema(quizzes).pick({
  noteId: true,
  userId: true,
  questions: true,
});

export const insertQuizResultSchema = createInsertSchema(quizResults).pick({
  quizId: true, 
  userId: true,
  score: true,
  answers: true,
});

export const insertFlashcardSchema = createInsertSchema(flashcards).pick({
  noteId: true,
  userId: true,
  front: true,
  back: true,
  nextReviewDate: true,
  interval: true,
  easeFactor: true,
});

export const insertRevisionItemSchema = createInsertSchema(revisionItems).pick({
  userId: true,
  noteId: true,
  masteryLevel: true,
  nextReviewDate: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjects.$inferSelect;

export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;

export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Quiz = typeof quizzes.$inferSelect;

export type InsertQuizResult = z.infer<typeof insertQuizResultSchema>;
export type QuizResult = typeof quizResults.$inferSelect;

export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type Flashcard = typeof flashcards.$inferSelect;

export type InsertRevisionItem = z.infer<typeof insertRevisionItemSchema>;
export type RevisionItem = typeof revisionItems.$inferSelect;

// Question type for quiz
export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
};

// Custom validators
export const fileUploadSchema = z.object({
  file: z.instanceof(File).or(z.string()),
  subjectId: z.number(),
  title: z.string().min(1, "Title is required"),
});
