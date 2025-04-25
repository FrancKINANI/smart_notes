import {
  mysqlTable,
  text,
  int,
  varchar,
  boolean,
  json,
  timestamp,
  primaryKey,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Base tables
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  avatar: varchar("avatar", { length: 255 }),
  bio: text("bio"),
  role: varchar("role", { length: 50 }).default("student"),
  isEmailVerified: boolean("is_email_verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subjects = mysqlTable("subjects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 50 }).notNull(),
});

export const notes = mysqlTable("notes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  subjectId: int("subject_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  summary: text("summary"),
  enhancedContent: text("enhanced_content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastReviewed: timestamp("last_reviewed"),
  sourceType: varchar("source_type", { length: 50 }).notNull(),
});

export const quizzes = mysqlTable("quizzes", {
  id: int("id").autoincrement().primaryKey(),
  noteId: int("note_id").notNull(),
  userId: int("user_id").notNull(),
  questions: json("questions").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quizResults = mysqlTable("quiz_results", {
  id: int("id").autoincrement().primaryKey(),
  quizId: int("quiz_id").notNull(),
  userId: int("user_id").notNull(),
  score: int("score").notNull(),
  answers: json("answers").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const flashcards = mysqlTable("flashcards", {
  id: int("id").autoincrement().primaryKey(),
  noteId: int("note_id").notNull(),
  userId: int("user_id").notNull(),
  front: text("front").notNull(),
  back: text("back").notNull(),
  nextReviewDate: timestamp("next_review_date"),
  interval: int("interval").default(1),
  easeFactor: int("ease_factor").default(250),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const revisionItems = mysqlTable("revision_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  noteId: int("note_id").notNull(),
  masteryLevel: int("mastery_level").default(0),
  nextReviewDate: timestamp("next_review_date"),
});

export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique(),
  studyPreferences: json("study_preferences"),
  notificationSettings: json("notification_settings"),
  lastActive: timestamp("last_active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const studyGroups = mysqlTable("study_groups", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  creatorId: int("creator_id").notNull(),
  isPrivate: boolean("is_private").default(false),
  inviteCode: varchar("invite_code", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const groupMembers = mysqlTable("group_members", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("group_id").notNull(),
  userId: int("user_id").notNull(),
  role: varchar("role", { length: 50 }).default("member"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const sharedNotes = mysqlTable("shared_notes", {
  id: int("id").autoincrement().primaryKey(),
  noteId: int("note_id").notNull(),
  groupId: int("group_id").notNull(),
  sharedBy: int("shared_by").notNull(),
  permissions: varchar("permissions", { length: 50 }).default("read"),
  sharedAt: timestamp("shared_at").defaultNow().notNull(),
});

export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  noteId: int("note_id").notNull(),
  userId: int("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userSubjects = mysqlTable("user_subjects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  subjectId: int("subject_id").notNull(),
  isFavorite: boolean("is_favorite").default(false),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  notes: many(notes),
  quizzes: many(quizzes),
  quizResults: many(quizResults),
  flashcards: many(flashcards),
  revisionItems: many(revisionItems),
  profile: many(userProfiles),
  ownedGroups: many(studyGroups, { relationName: "owner" }),
  memberGroups: many(groupMembers),
  sharedNotes: many(sharedNotes),
  comments: many(comments),
  subjects: many(userSubjects),
}));

export const subjectRelations = relations(subjects, ({ many }) => ({
  notes: many(notes),
  userSubjects: many(userSubjects),
}));

export const noteRelations = relations(notes, ({ one, many }) => ({
  user: one(users, {
    fields: [notes.userId],
    references: [users.id],
  }),
  subject: one(subjects, {
    fields: [notes.subjectId],
    references: [subjects.id],
  }),
  quizzes: many(quizzes),
  flashcards: many(flashcards),
  revisionItems: many(revisionItems),
  sharedNotes: many(sharedNotes),
  comments: many(comments),
}));

export const quizRelations = relations(quizzes, ({ one, many }) => ({
  note: one(notes, {
    fields: [quizzes.noteId],
    references: [notes.id],
  }),
  user: one(users, {
    fields: [quizzes.userId],
    references: [users.id],
  }),
  results: many(quizResults),
}));

export const quizResultRelations = relations(quizResults, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizResults.quizId],
    references: [quizzes.id],
  }),
  user: one(users, {
    fields: [quizResults.userId],
    references: [users.id],
  }),
}));

export const flashcardRelations = relations(flashcards, ({ one }) => ({
  note: one(notes, {
    fields: [flashcards.noteId],
    references: [notes.id],
  }),
  user: one(users, {
    fields: [flashcards.userId],
    references: [users.id],
  }),
}));

export const revisionItemRelations = relations(revisionItems, ({ one }) => ({
  note: one(notes, {
    fields: [revisionItems.noteId],
    references: [notes.id],
  }),
  user: one(users, {
    fields: [revisionItems.userId],
    references: [users.id],
  }),
}));

export const userProfileRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const userSubjectRelations = relations(userSubjects, ({ one }) => ({
  user: one(users, {
    fields: [userSubjects.userId],
    references: [users.id],
  }),
  subject: one(subjects, {
    fields: [userSubjects.subjectId],
    references: [subjects.id],
  }),
}));

export const studyGroupRelations = relations(studyGroups, ({ one, many }) => ({
  owner: one(users, {
    fields: [studyGroups.creatorId],
    references: [users.id],
  }),
  members: many(groupMembers),
  sharedNotes: many(sharedNotes),
}));

export const groupMemberRelations = relations(groupMembers, ({ one }) => ({
  group: one(studyGroups, {
    fields: [groupMembers.groupId],
    references: [studyGroups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

export const sharedNoteRelations = relations(sharedNotes, ({ one }) => ({
  note: one(notes, {
    fields: [sharedNotes.noteId],
    references: [notes.id],
  }),
  group: one(studyGroups, {
    fields: [sharedNotes.groupId],
    references: [studyGroups.id],
  }),
  sharedByUser: one(users, {
    fields: [sharedNotes.sharedBy],
    references: [users.id],
    relationName: "sharedBy",
  }),
}));

export const commentRelations = relations(comments, ({ one }) => ({
  note: one(notes, {
    fields: [comments.noteId],
    references: [notes.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

// Mettez à jour le schéma d'insertion pour l'utilisateur pour inclure les nouveaux champs
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  displayName: true,
  firstName: true,
  lastName: true,
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

export const insertUserProfileSchema = createInsertSchema(userProfiles).pick({
  userId: true,
  studyPreferences: true,
  notificationSettings: true,
});

export const insertStudyGroupSchema = createInsertSchema(studyGroups).pick({
  name: true,
  description: true,
  ownerId: true,
});

export const insertGroupMemberSchema = createInsertSchema(groupMembers).pick({
  groupId: true,
  userId: true,
  role: true,
});

export const insertSharedNoteSchema = createInsertSchema(sharedNotes).pick({
  noteId: true,
  groupId: true,
  sharedBy: true,
  permissions: true,
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  noteId: true,
  userId: true,
  content: true,
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

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

export type InsertStudyGroup = z.infer<typeof insertStudyGroupSchema>;
export type StudyGroup = typeof studyGroups.$inferSelect;

export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type GroupMember = typeof groupMembers.$inferSelect;

export type InsertSharedNote = z.infer<typeof insertSharedNoteSchema>;
export type SharedNote = typeof sharedNotes.$inferSelect;

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

// Question type for quiz
export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  type: "multiple-choice" | "true-false" | "short-answer";
};

// Custom validators
export const fileUploadSchema = z.object({
  file: z.instanceof(File).or(z.string()),
  subjectId: z.number(),
  title: z.string().min(1, "Title is required"),
});

// Registration and authentication
export const registerSchema = insertUserSchema
  .extend({
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Veuillez fournir une adresse email valide"),
  password: z.string().min(1, "Veuillez entrer votre mot de passe"),
});

export const updateUserSchema = createInsertSchema(users).partial().pick({
  displayName: true,
  firstName: true,
  lastName: true,
  avatar: true,
  bio: true,
});

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
    newPassword: z
      .string()
      .min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères"),
    confirmPassword: z
      .string()
      .min(1, "Veuillez confirmer votre nouveau mot de passe"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });
