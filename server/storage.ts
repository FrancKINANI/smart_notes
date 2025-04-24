import {
  users,
  subjects,
  notes,
  quizzes,
  quizResults,
  flashcards,
  revisionItems,
  userProfiles,
  studyGroups,
  groupMembers,
  sharedNotes,
  comments,
  userSubjects,
  type User,
  type InsertUser,
  type Subject,
  type InsertSubject,
  type Note,
  type InsertNote,
  type Quiz,
  type InsertQuiz,
  type QuizResult,
  type InsertQuizResult,
  type Flashcard,
  type InsertFlashcard,
  type RevisionItem,
  type InsertRevisionItem,
  type UserProfile,
  type InsertUserProfile,
  type StudyGroup,
  type InsertStudyGroup,
  type GroupMember,
  type InsertGroupMember,
  type SharedNote,
  type InsertSharedNote,
  type Comment,
  type InsertComment,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, lte, gte, or, sql } from "drizzle-orm";
import session from "express-session";
import MySQLStore from "express-mysql-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  verifyPassword(
    suppliedPassword: string,
    storedPassword: string
  ): Promise<boolean>;
  hashPassword(password: string): Promise<string>;

  // User profile operations
  getUserProfile(userId: number): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(
    userId: number,
    profile: Partial<InsertUserProfile>
  ): Promise<UserProfile | undefined>;

  // Subject operations
  getSubject(id: number): Promise<Subject | undefined>;
  getSubjects(): Promise<Subject[]>;
  getUserSubjects(userId: number): Promise<Subject[]>;
  createSubject(subject: InsertSubject): Promise<Subject>;
  addUserSubject(
    userId: number,
    subjectId: number,
    isFavorite?: boolean
  ): Promise<void>;
  updateUserSubjectFavorite(
    userId: number,
    subjectId: number,
    isFavorite: boolean
  ): Promise<void>;

  // Note operations
  getNote(id: number): Promise<Note | undefined>;
  getNotesByUser(userId: number): Promise<Note[]>;
  getNotesBySubject(subjectId: number): Promise<Note[]>;
  getRecentNotes(userId: number, limit: number): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: number, note: Partial<InsertNote>): Promise<Note | undefined>;
  deleteNote(id: number): Promise<boolean>;

  // Quiz operations
  getQuiz(id: number): Promise<Quiz | undefined>;
  getQuizzesByNote(noteId: number): Promise<Quiz[]>;
  getQuizzesByUser(userId: number): Promise<Quiz[]>;
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;

  // Quiz result operations
  getQuizResult(id: number): Promise<QuizResult | undefined>;
  getQuizResultsByQuiz(quizId: number): Promise<QuizResult[]>;
  getQuizResultsByUser(userId: number): Promise<QuizResult[]>;
  createQuizResult(quizResult: InsertQuizResult): Promise<QuizResult>;

  // Flashcard operations
  getFlashcard(id: number): Promise<Flashcard | undefined>;
  getFlashcardsByNote(noteId: number): Promise<Flashcard[]>;
  getFlashcardsByUser(userId: number): Promise<Flashcard[]>;
  getFlashcardsForReview(userId: number): Promise<Flashcard[]>;
  createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard>;
  updateFlashcard(
    id: number,
    flashcard: Partial<InsertFlashcard>
  ): Promise<Flashcard | undefined>;

  // Revision item operations
  getRevisionItem(id: number): Promise<RevisionItem | undefined>;
  getRevisionItemsByNote(noteId: number): Promise<RevisionItem[]>;
  getRevisionItemsByUser(userId: number): Promise<RevisionItem[]>;
  getRevisionItemsForReview(userId: number): Promise<RevisionItem[]>;
  createRevisionItem(revisionItem: InsertRevisionItem): Promise<RevisionItem>;
  updateRevisionItem(
    id: number,
    revisionItem: Partial<InsertRevisionItem>
  ): Promise<RevisionItem | undefined>;

  // Collaborative features
  createStudyGroup(group: InsertStudyGroup): Promise<StudyGroup>;
  getStudyGroup(id: number): Promise<StudyGroup | undefined>;
  getStudyGroupsByUser(userId: number): Promise<StudyGroup[]>;
  updateStudyGroup(
    id: number,
    group: Partial<InsertStudyGroup>
  ): Promise<StudyGroup | undefined>;
  addGroupMember(member: InsertGroupMember): Promise<GroupMember>;
  getGroupMembers(groupId: number): Promise<GroupMember[]>;
  getUserGroups(userId: number): Promise<GroupMember[]>;
  shareNote(shared: InsertSharedNote): Promise<SharedNote>;
  getSharedNotes(groupId: number): Promise<SharedNote[]>;
  addComment(comment: InsertComment): Promise<Comment>;
  getNoteComments(noteId: number): Promise<Comment[]>;

  // Session store
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  private sessionStore: any;

  constructor() {
    // Configure MySQL session store
    const options = {
      host: "localhost",
      port: 3306,
      user: "root",
      password: "Justine@2227",
      database: "smart_notes",
    };

    const SessionStore = MySQLStore(session);
    this.sessionStore = new SessionStore(options);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash the password before saving
    const hashedPassword = await this.hashPassword(insertUser.password);

    const result = await db.insert(users).values({
      ...insertUser,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    // MySQL: récupérer l'id inséré
    const insertId = result.insertId || (result[0] && result[0].insertId);
    if (!insertId) {
      throw new Error(
        "Erreur lors de la création de l'utilisateur (insertId manquant)"
      );
    }
    // Récupérer l'utilisateur inséré
    const [user] = await db.select().from(users).where(eq(users.id, insertId));
    if (!user) {
      throw new Error("Utilisateur non trouvé après insertion");
    }
    return user;
  }

  async updateUser(
    id: number,
    userUpdate: Partial<InsertUser>
  ): Promise<User | undefined> {
    // Hash password if it's included in the update
    if (userUpdate.password) {
      userUpdate.password = await this.hashPassword(userUpdate.password);
    }

    await db
      .update(users)
      .set({
        ...userUpdate,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
    const [updatedUser] = await db.select().from(users).where(eq(users.id, id));
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }

  async verifyPassword(
    suppliedPassword: string,
    storedPassword: string
  ): Promise<boolean> {
    try {
      const [hashed, salt] = storedPassword.split(".");
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = (await scryptAsync(
        suppliedPassword,
        salt,
        64
      )) as Buffer;
      return timingSafeEqual(hashedBuf, suppliedBuf);
    } catch (error) {
      console.error("Password verification error:", error);
      return false;
    }
  }

  // User profile methods
  async getUserProfile(userId: number): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return profile;
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const result = await db.insert(userProfiles).values({
      ...profile,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const insertId = result.insertId || (result[0] && result[0].insertId);
    if (!insertId) {
      throw new Error(
        "Erreur lors de la création du profil utilisateur (insertId manquant)"
      );
    }
    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, insertId));
    if (!userProfile) {
      throw new Error("Profil utilisateur non trouvé après insertion");
    }
    return userProfile;
  }

  async updateUserProfile(
    userId: number,
    profileUpdate: Partial<InsertUserProfile>
  ): Promise<UserProfile | undefined> {
    await db
      .update(userProfiles)
      .set({
        ...profileUpdate,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, userId));
    const [updatedProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return updatedProfile;
  }

  // Subject methods
  async getSubject(id: number): Promise<Subject | undefined> {
    const [subject] = await db
      .select()
      .from(subjects)
      .where(eq(subjects.id, id));
    return subject;
  }

  async getSubjects(): Promise<Subject[]> {
    return db.select().from(subjects);
  }

  async getUserSubjects(userId: number): Promise<Subject[]> {
    const result = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        color: subjects.color,
        isFavorite: userSubjects.isFavorite,
      })
      .from(subjects)
      .innerJoin(
        userSubjects,
        and(
          eq(subjects.id, userSubjects.subjectId),
          eq(userSubjects.userId, userId)
        )
      );

    return result;
  }

  async createSubject(insertSubject: InsertSubject): Promise<Subject> {
    const result = await db.insert(subjects).values(insertSubject);
    const insertId = result.insertId || (result[0] && result[0].insertId);
    if (!insertId)
      throw new Error(
        "Erreur lors de la création du sujet (insertId manquant)"
      );
    const [subject] = await db
      .select()
      .from(subjects)
      .where(eq(subjects.id, insertId));
    if (!subject) throw new Error("Sujet non trouvé après insertion");
    return subject;
  }

  async addUserSubject(
    userId: number,
    subjectId: number,
    isFavorite: boolean = false
  ): Promise<void> {
    await db
      .insert(userSubjects)
      .values({
        userId,
        subjectId,
        isFavorite,
        addedAt: new Date(),
      })
      .onConflictDoNothing();
  }

  async updateUserSubjectFavorite(
    userId: number,
    subjectId: number,
    isFavorite: boolean
  ): Promise<void> {
    await db
      .update(userSubjects)
      .set({ isFavorite })
      .where(
        and(
          eq(userSubjects.userId, userId),
          eq(userSubjects.subjectId, subjectId)
        )
      );
  }

  // Note methods
  async getNote(id: number): Promise<Note | undefined> {
    const [note] = await db.select().from(notes).where(eq(notes.id, id));
    return note;
  }

  async getNotesByUser(userId: number): Promise<Note[]> {
    return db.select().from(notes).where(eq(notes.userId, userId));
  }

  async getNotesBySubject(subjectId: number): Promise<Note[]> {
    return db.select().from(notes).where(eq(notes.subjectId, subjectId));
  }

  async getRecentNotes(userId: number, limit: number): Promise<Note[]> {
    return db
      .select()
      .from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(desc(notes.createdAt))
      .limit(limit);
  }

  async createNote(insertNote: InsertNote): Promise<Note> {
    const result = await db.insert(notes).values({
      ...insertNote,
      createdAt: new Date(),
    });
    const insertId = result.insertId || (result[0] && result[0].insertId);
    if (!insertId)
      throw new Error(
        "Erreur lors de la création de la note (insertId manquant)"
      );
    const [note] = await db.select().from(notes).where(eq(notes.id, insertId));
    if (!note) throw new Error("Note non trouvée après insertion");
    return note;
  }

  async updateNote(
    id: number,
    noteUpdate: Partial<InsertNote>
  ): Promise<Note | undefined> {
    await db.update(notes).set(noteUpdate).where(eq(notes.id, id));
    const [updatedNote] = await db.select().from(notes).where(eq(notes.id, id));
    return updatedNote;
  }

  async deleteNote(id: number): Promise<boolean> {
    const result = await db.delete(notes).where(eq(notes.id, id));
    return result.rowCount > 0;
  }

  // Quiz methods
  async getQuiz(id: number): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    return quiz;
  }

  async getQuizzesByNote(noteId: number): Promise<Quiz[]> {
    return db.select().from(quizzes).where(eq(quizzes.noteId, noteId));
  }

  async getQuizzesByUser(userId: number): Promise<Quiz[]> {
    return db.select().from(quizzes).where(eq(quizzes.userId, userId));
  }

  async createQuiz(insertQuiz: InsertQuiz): Promise<Quiz> {
    const result = await db.insert(quizzes).values({
      ...insertQuiz,
      createdAt: new Date(),
    });
    const insertId = result.insertId || (result[0] && result[0].insertId);
    if (!insertId)
      throw new Error("Erreur lors de la création du quiz (insertId manquant)");
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, insertId));
    if (!quiz) throw new Error("Quiz non trouvé après insertion");
    return quiz;
  }

  async updateQuiz(
    id: number,
    quizUpdate: Partial<InsertQuiz>
  ): Promise<Quiz | undefined> {
    await db.update(quizzes).set(quizUpdate).where(eq(quizzes.id, id));
    const [updatedQuiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, id));
    return updatedQuiz;
  }

  // Quiz Result methods
  async getQuizResult(id: number): Promise<QuizResult | undefined> {
    const [result] = await db
      .select()
      .from(quizResults)
      .where(eq(quizResults.id, id));
    return result;
  }

  async getQuizResultsByQuiz(quizId: number): Promise<QuizResult[]> {
    return db.select().from(quizResults).where(eq(quizResults.quizId, quizId));
  }

  async getQuizResultsByUser(userId: number): Promise<QuizResult[]> {
    return db.select().from(quizResults).where(eq(quizResults.userId, userId));
  }

  async createQuizResult(
    insertQuizResult: InsertQuizResult
  ): Promise<QuizResult> {
    const result = await db.insert(quizResults).values({
      ...insertQuizResult,
      completedAt: new Date(),
    });
    const insertId = result.insertId || (result[0] && result[0].insertId);
    if (!insertId)
      throw new Error(
        "Erreur lors de la création du résultat de quiz (insertId manquant)"
      );
    const [quizResult] = await db
      .select()
      .from(quizResults)
      .where(eq(quizResults.id, insertId));
    if (!quizResult)
      throw new Error("Résultat de quiz non trouvé après insertion");
    return quizResult;
  }

  // Flashcard methods
  async getFlashcard(id: number): Promise<Flashcard | undefined> {
    const [flashcard] = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.id, id));
    return flashcard;
  }

  async getFlashcardsByNote(noteId: number): Promise<Flashcard[]> {
    return db.select().from(flashcards).where(eq(flashcards.noteId, noteId));
  }

  async getFlashcardsByUser(userId: number): Promise<Flashcard[]> {
    return db.select().from(flashcards).where(eq(flashcards.userId, userId));
  }

  async getFlashcardsForReview(userId: number): Promise<Flashcard[]> {
    const now = new Date();
    return db
      .select()
      .from(flashcards)
      .where(
        and(
          eq(flashcards.userId, userId),
          or(
            sql`${flashcards.nextReviewDate} IS NULL`,
            lte(flashcards.nextReviewDate, now)
          )
        )
      );
  }

  async createFlashcard(insertFlashcard: InsertFlashcard): Promise<Flashcard> {
    const result = await db.insert(flashcards).values({
      ...insertFlashcard,
      createdAt: new Date(),
    });
    const insertId = result.insertId || (result[0] && result[0].insertId);
    if (!insertId)
      throw new Error(
        "Erreur lors de la création de la flashcard (insertId manquant)"
      );
    const [flashcard] = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.id, insertId));
    if (!flashcard) throw new Error("Flashcard non trouvée après insertion");
    return flashcard;
  }

  async updateFlashcard(
    id: number,
    flashcardUpdate: Partial<InsertFlashcard>
  ): Promise<Flashcard | undefined> {
    await db
      .update(flashcards)
      .set(flashcardUpdate)
      .where(eq(flashcards.id, id));
    const [updatedFlashcard] = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.id, id));
    return updatedFlashcard;
  }

  // Revision Item methods
  async getRevisionItem(id: number): Promise<RevisionItem | undefined> {
    const [item] = await db
      .select()
      .from(revisionItems)
      .where(eq(revisionItems.id, id));
    return item;
  }

  async getRevisionItemsByNote(noteId: number): Promise<RevisionItem[]> {
    return db
      .select()
      .from(revisionItems)
      .where(eq(revisionItems.noteId, noteId));
  }

  async getRevisionItemsByUser(userId: number): Promise<RevisionItem[]> {
    return db
      .select()
      .from(revisionItems)
      .where(eq(revisionItems.userId, userId));
  }

  async getRevisionItemsForReview(userId: number): Promise<RevisionItem[]> {
    const now = new Date();
    return db
      .select()
      .from(revisionItems)
      .where(
        and(
          eq(revisionItems.userId, userId),
          or(
            sql`${revisionItems.nextReviewDate} IS NULL`,
            lte(revisionItems.nextReviewDate, now)
          )
        )
      );
  }

  async createRevisionItem(
    insertRevisionItem: InsertRevisionItem
  ): Promise<RevisionItem> {
    const result = await db.insert(revisionItems).values({
      ...insertRevisionItem,
      createdAt: new Date(),
    });
    const insertId = result.insertId || (result[0] && result[0].insertId);
    if (!insertId)
      throw new Error(
        "Erreur lors de la création de l'item de révision (insertId manquant)"
      );
    const [item] = await db
      .select()
      .from(revisionItems)
      .where(eq(revisionItems.id, insertId));
    if (!item) throw new Error("Item de révision non trouvé après insertion");
    return item;
  }

  async updateRevisionItem(
    id: number,
    revisionItemUpdate: Partial<InsertRevisionItem>
  ): Promise<RevisionItem | undefined> {
    await db
      .update(revisionItems)
      .set(revisionItemUpdate)
      .where(eq(revisionItems.id, id));
    const [updatedItem] = await db
      .select()
      .from(revisionItems)
      .where(eq(revisionItems.id, id));
    return updatedItem;
  }

  // Collaborative features
  async createStudyGroup(group: InsertStudyGroup): Promise<StudyGroup> {
    const result = await db.insert(studyGroups).values({
      ...group,
      inviteCode: this.generateInviteCode(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const insertId = result.insertId || (result[0] && result[0].insertId);
    if (!insertId)
      throw new Error(
        "Erreur lors de la création du groupe (insertId manquant)"
      );
    const [studyGroup] = await db
      .select()
      .from(studyGroups)
      .where(eq(studyGroups.id, insertId));
    if (!studyGroup) throw new Error("Groupe non trouvé après insertion");
    // Add creator as admin
    await this.addGroupMember({
      groupId: studyGroup.id,
      userId: studyGroup.creatorId,
      role: "admin",
    });
    return studyGroup;
  }

  async getStudyGroup(id: number): Promise<StudyGroup | undefined> {
    const [group] = await db
      .select()
      .from(studyGroups)
      .where(eq(studyGroups.id, id));
    return group;
  }

  async getStudyGroupsByUser(userId: number): Promise<StudyGroup[]> {
    // Correction : requête simple sans select({...}) ni alias
    const result = await db
      .select()
      .from(studyGroups)
      .innerJoin(
        groupMembers,
        and(
          eq(studyGroups.id, groupMembers.groupId),
          eq(groupMembers.userId, userId)
        )
      );
    // On ne garde que la partie studyGroups
    return result.map((row: any) => row.studyGroups);
  }

  async updateStudyGroup(
    id: number,
    groupUpdate: Partial<InsertStudyGroup>
  ): Promise<StudyGroup | undefined> {
    await db
      .update(studyGroups)
      .set({
        ...groupUpdate,
        updatedAt: new Date(),
      })
      .where(eq(studyGroups.id, id));
    const [updatedGroup] = await db
      .select()
      .from(studyGroups)
      .where(eq(studyGroups.id, id));
    return updatedGroup;
  }

  async addGroupMember(member: InsertGroupMember): Promise<GroupMember> {
    const result = await db.insert(groupMembers).values({
      ...member,
      joinedAt: new Date(),
    });
    const insertId = result.insertId || (result[0] && result[0].insertId);
    if (!insertId)
      throw new Error("Erreur lors de l'ajout du membre (insertId manquant)");
    const [groupMember] = await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.id, insertId));
    if (!groupMember) throw new Error("Membre non trouvé après insertion");
    return groupMember;
  }

  async getGroupMembers(groupId: number): Promise<GroupMember[]> {
    return db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));
  }

  async getUserGroups(userId: number): Promise<GroupMember[]> {
    return db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.userId, userId));
  }

  async shareNote(shared: InsertSharedNote): Promise<SharedNote> {
    const result = await db.insert(sharedNotes).values({
      ...shared,
      sharedAt: new Date(),
    });
    const insertId = result.insertId || (result[0] && result[0].insertId);
    if (!insertId)
      throw new Error("Erreur lors du partage de la note (insertId manquant)");
    const [sharedNote] = await db
      .select()
      .from(sharedNotes)
      .where(eq(sharedNotes.id, insertId));
    if (!sharedNote)
      throw new Error("Note partagée non trouvée après insertion");
    return sharedNote;
  }

  async getSharedNotes(groupId: number): Promise<SharedNote[]> {
    return db
      .select()
      .from(sharedNotes)
      .where(eq(sharedNotes.groupId, groupId));
  }

  async addComment(comment: InsertComment): Promise<Comment> {
    const result = await db.insert(comments).values({
      ...comment,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const insertId = result.insertId || (result[0] && result[0].insertId);
    if (!insertId)
      throw new Error(
        "Erreur lors de l'ajout du commentaire (insertId manquant)"
      );
    const [newComment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, insertId));
    if (!newComment) throw new Error("Commentaire non trouvé après insertion");
    return newComment;
  }

  async getNoteComments(noteId: number): Promise<Comment[]> {
    return db
      .select()
      .from(comments)
      .where(eq(comments.noteId, noteId))
      .orderBy(desc(comments.createdAt));
  }

  // Utility methods
  private generateInviteCode(): string {
    // Generate a random 8-character code
    return randomBytes(4).toString("hex");
  }
}

// Initialize with SQL database
export const storage = new DatabaseStorage();
