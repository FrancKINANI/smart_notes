import { pgTable, text, serial, integer, boolean, jsonb, timestamp, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Base tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  avatar: text("avatar"),
  bio: text("bio"),
  role: text("role").default("student"),
  isEmailVerified: boolean("is_email_verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

// User profile and preferences
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  studyPreferences: jsonb("study_preferences"),
  notificationSettings: jsonb("notification_settings"),
  lastActive: timestamp("last_active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User-subject relation (for favorites)
export const userSubjects = pgTable("user_subjects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectId: integer("subject_id").notNull(),
  isFavorite: boolean("is_favorite").default(false),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

// Collaborative features tables
export const studyGroups = pgTable("study_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  creatorId: integer("creator_id").notNull(),
  isPrivate: boolean("is_private").default(false),
  inviteCode: text("invite_code").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").default("member"), // "admin", "member"
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const sharedNotes = pgTable("shared_notes", {
  id: serial("id").primaryKey(),
  noteId: integer("note_id").notNull(),
  groupId: integer("group_id").notNull(),
  sharedBy: integer("shared_by").notNull(),
  permissions: text("permissions").default("read"), // "read", "comment", "edit"
  sharedAt: timestamp("shared_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  noteId: integer("note_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  notes: many(notes),
  quizzes: many(quizzes),
  quizResults: many(quizResults),
  flashcards: many(flashcards),
  revisionItems: many(revisionItems),
  profile: many(userProfiles),
  userSubjects: many(userSubjects),
  groupMemberships: many(groupMembers),
  sharedNotes: many(sharedNotes, { relationName: "sharedBy" }),
  comments: many(comments)
}));

export const subjectRelations = relations(subjects, ({ many }) => ({
  notes: many(notes),
  userSubjects: many(userSubjects)
}));

export const noteRelations = relations(notes, ({ one, many }) => ({
  user: one(users, {
    fields: [notes.userId],
    references: [users.id]
  }),
  subject: one(subjects, {
    fields: [notes.subjectId],
    references: [subjects.id]
  }),
  quizzes: many(quizzes),
  flashcards: many(flashcards),
  revisionItems: many(revisionItems),
  sharedNotes: many(sharedNotes),
  comments: many(comments)
}));

export const quizRelations = relations(quizzes, ({ one, many }) => ({
  note: one(notes, {
    fields: [quizzes.noteId],
    references: [notes.id]
  }),
  user: one(users, {
    fields: [quizzes.userId],
    references: [users.id]
  }),
  results: many(quizResults)
}));

export const quizResultRelations = relations(quizResults, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizResults.quizId],
    references: [quizzes.id]
  }),
  user: one(users, {
    fields: [quizResults.userId],
    references: [users.id]
  })
}));

export const flashcardRelations = relations(flashcards, ({ one }) => ({
  note: one(notes, {
    fields: [flashcards.noteId],
    references: [notes.id]
  }),
  user: one(users, {
    fields: [flashcards.userId],
    references: [users.id]
  })
}));

export const revisionItemRelations = relations(revisionItems, ({ one }) => ({
  note: one(notes, {
    fields: [revisionItems.noteId],
    references: [notes.id]
  }),
  user: one(users, {
    fields: [revisionItems.userId],
    references: [users.id]
  })
}));

export const userProfileRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id]
  })
}));

export const userSubjectRelations = relations(userSubjects, ({ one }) => ({
  user: one(users, {
    fields: [userSubjects.userId],
    references: [users.id]
  }),
  subject: one(subjects, {
    fields: [userSubjects.subjectId],
    references: [subjects.id]
  })
}));

export const studyGroupRelations = relations(studyGroups, ({ one, many }) => ({
  creator: one(users, {
    fields: [studyGroups.creatorId],
    references: [users.id]
  }),
  members: many(groupMembers),
  sharedNotes: many(sharedNotes)
}));

export const groupMemberRelations = relations(groupMembers, ({ one }) => ({
  group: one(studyGroups, {
    fields: [groupMembers.groupId],
    references: [studyGroups.id]
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id]
  })
}));

export const sharedNoteRelations = relations(sharedNotes, ({ one }) => ({
  note: one(notes, {
    fields: [sharedNotes.noteId],
    references: [notes.id]
  }),
  group: one(studyGroups, {
    fields: [sharedNotes.groupId],
    references: [studyGroups.id]
  }),
  sharedByUser: one(users, {
    fields: [sharedNotes.sharedBy],
    references: [users.id],
    relationName: "sharedBy"
  })
}));

export const commentRelations = relations(comments, ({ one }) => ({
  note: one(notes, {
    fields: [comments.noteId],
    references: [notes.id]
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id]
  })
}));

// Mettez à jour le schéma d'insertion pour l'utilisateur pour inclure les nouveaux champs
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  displayName: true,
  firstName: true,
  lastName: true,
  role: true
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
  creatorId: true,
  isPrivate: true,
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
  type: 'multiple-choice' | 'true-false' | 'short-answer';
};

// Custom validators
export const fileUploadSchema = z.object({
  file: z.instanceof(File).or(z.string()),
  subjectId: z.number(),
  title: z.string().min(1, "Title is required"),
});

// Registration and authentication
export const registerSchema = insertUserSchema.extend({
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
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

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
  newPassword: z.string().min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string().min(1, "Veuillez confirmer votre nouveau mot de passe"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});