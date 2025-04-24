import {
  users, subjects, notes, quizzes, quizResults, flashcards, revisionItems,
  type User, type InsertUser, type Subject, type InsertSubject,
  type Note, type InsertNote, type Quiz, type InsertQuiz,
  type QuizResult, type InsertQuizResult, type Flashcard, type InsertFlashcard,
  type RevisionItem, type InsertRevisionItem
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Subject operations
  getSubject(id: number): Promise<Subject | undefined>;
  getSubjects(): Promise<Subject[]>;
  createSubject(subject: InsertSubject): Promise<Subject>;
  
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
  updateFlashcard(id: number, flashcard: Partial<InsertFlashcard>): Promise<Flashcard | undefined>;
  
  // Revision item operations
  getRevisionItem(id: number): Promise<RevisionItem | undefined>;
  getRevisionItemsByNote(noteId: number): Promise<RevisionItem[]>;
  getRevisionItemsByUser(userId: number): Promise<RevisionItem[]>;
  getRevisionItemsForReview(userId: number): Promise<RevisionItem[]>;
  createRevisionItem(revisionItem: InsertRevisionItem): Promise<RevisionItem>;
  updateRevisionItem(id: number, revisionItem: Partial<InsertRevisionItem>): Promise<RevisionItem | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private subjects: Map<number, Subject>;
  private notes: Map<number, Note>;
  private quizzes: Map<number, Quiz>;
  private quizResults: Map<number, QuizResult>;
  private flashcards: Map<number, Flashcard>;
  private revisionItems: Map<number, RevisionItem>;
  
  private userIdCounter: number = 1;
  private subjectIdCounter: number = 1;
  private noteIdCounter: number = 1;
  private quizIdCounter: number = 1;
  private quizResultIdCounter: number = 1;
  private flashcardIdCounter: number = 1;
  private revisionItemIdCounter: number = 1;

  constructor() {
    this.users = new Map();
    this.subjects = new Map();
    this.notes = new Map();
    this.quizzes = new Map();
    this.quizResults = new Map();
    this.flashcards = new Map();
    this.revisionItems = new Map();
    
    // Initialize with some default subjects
    this.createSubject({ name: "Mathematics", color: "#3730a3" });
    this.createSubject({ name: "Biology", color: "#059669" });
    this.createSubject({ name: "Computer Science", color: "#7c3aed" });
    this.createSubject({ name: "History", color: "#b45309" });
    this.createSubject({ name: "Physics", color: "#0369a1" });
    
    // Create a default user
    this.createUser({
      username: "student",
      password: "password123",
      displayName: "Thomas Dubois",
      role: "student"
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { id, ...insertUser };
    this.users.set(id, user);
    return user;
  }

  // Subject methods
  async getSubject(id: number): Promise<Subject | undefined> {
    return this.subjects.get(id);
  }

  async getSubjects(): Promise<Subject[]> {
    return Array.from(this.subjects.values());
  }

  async createSubject(insertSubject: InsertSubject): Promise<Subject> {
    const id = this.subjectIdCounter++;
    const subject: Subject = { id, ...insertSubject };
    this.subjects.set(id, subject);
    return subject;
  }

  // Note methods
  async getNote(id: number): Promise<Note | undefined> {
    return this.notes.get(id);
  }

  async getNotesByUser(userId: number): Promise<Note[]> {
    return Array.from(this.notes.values()).filter(note => note.userId === userId);
  }

  async getNotesBySubject(subjectId: number): Promise<Note[]> {
    return Array.from(this.notes.values()).filter(note => note.subjectId === subjectId);
  }

  async getRecentNotes(userId: number, limit: number): Promise<Note[]> {
    return Array.from(this.notes.values())
      .filter(note => note.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async createNote(insertNote: InsertNote): Promise<Note> {
    const id = this.noteIdCounter++;
    const now = new Date();
    const note: Note = {
      id,
      ...insertNote,
      createdAt: now,
      lastReviewed: null,
    };
    this.notes.set(id, note);
    return note;
  }

  async updateNote(id: number, noteUpdate: Partial<InsertNote>): Promise<Note | undefined> {
    const existingNote = this.notes.get(id);
    if (!existingNote) return undefined;

    const updatedNote = { ...existingNote, ...noteUpdate };
    this.notes.set(id, updatedNote);
    return updatedNote;
  }

  async deleteNote(id: number): Promise<boolean> {
    return this.notes.delete(id);
  }

  // Quiz methods
  async getQuiz(id: number): Promise<Quiz | undefined> {
    return this.quizzes.get(id);
  }

  async getQuizzesByNote(noteId: number): Promise<Quiz[]> {
    return Array.from(this.quizzes.values()).filter(quiz => quiz.noteId === noteId);
  }

  async getQuizzesByUser(userId: number): Promise<Quiz[]> {
    return Array.from(this.quizzes.values()).filter(quiz => quiz.userId === userId);
  }

  async createQuiz(insertQuiz: InsertQuiz): Promise<Quiz> {
    const id = this.quizIdCounter++;
    const now = new Date();
    const quiz: Quiz = { 
      id, 
      ...insertQuiz,
      createdAt: now,
    };
    this.quizzes.set(id, quiz);
    return quiz;
  }

  // Quiz Result methods
  async getQuizResult(id: number): Promise<QuizResult | undefined> {
    return this.quizResults.get(id);
  }

  async getQuizResultsByQuiz(quizId: number): Promise<QuizResult[]> {
    return Array.from(this.quizResults.values()).filter(result => result.quizId === quizId);
  }

  async getQuizResultsByUser(userId: number): Promise<QuizResult[]> {
    return Array.from(this.quizResults.values()).filter(result => result.userId === userId);
  }

  async createQuizResult(insertQuizResult: InsertQuizResult): Promise<QuizResult> {
    const id = this.quizResultIdCounter++;
    const now = new Date();
    const quizResult: QuizResult = { 
      id, 
      ...insertQuizResult,
      completedAt: now 
    };
    this.quizResults.set(id, quizResult);
    return quizResult;
  }

  // Flashcard methods
  async getFlashcard(id: number): Promise<Flashcard | undefined> {
    return this.flashcards.get(id);
  }

  async getFlashcardsByNote(noteId: number): Promise<Flashcard[]> {
    return Array.from(this.flashcards.values()).filter(card => card.noteId === noteId);
  }

  async getFlashcardsByUser(userId: number): Promise<Flashcard[]> {
    return Array.from(this.flashcards.values()).filter(card => card.userId === userId);
  }

  async getFlashcardsForReview(userId: number): Promise<Flashcard[]> {
    const now = new Date();
    return Array.from(this.flashcards.values())
      .filter(card => card.userId === userId && 
        (card.nextReviewDate === null || new Date(card.nextReviewDate) <= now));
  }

  async createFlashcard(insertFlashcard: InsertFlashcard): Promise<Flashcard> {
    const id = this.flashcardIdCounter++;
    const now = new Date();
    const flashcard: Flashcard = { 
      id, 
      ...insertFlashcard,
      createdAt: now 
    };
    this.flashcards.set(id, flashcard);
    return flashcard;
  }

  async updateFlashcard(id: number, flashcardUpdate: Partial<InsertFlashcard>): Promise<Flashcard | undefined> {
    const existingFlashcard = this.flashcards.get(id);
    if (!existingFlashcard) return undefined;

    const updatedFlashcard = { ...existingFlashcard, ...flashcardUpdate };
    this.flashcards.set(id, updatedFlashcard);
    return updatedFlashcard;
  }

  // Revision Item methods
  async getRevisionItem(id: number): Promise<RevisionItem | undefined> {
    return this.revisionItems.get(id);
  }

  async getRevisionItemsByNote(noteId: number): Promise<RevisionItem[]> {
    return Array.from(this.revisionItems.values()).filter(item => item.noteId === noteId);
  }

  async getRevisionItemsByUser(userId: number): Promise<RevisionItem[]> {
    return Array.from(this.revisionItems.values()).filter(item => item.userId === userId);
  }

  async getRevisionItemsForReview(userId: number): Promise<RevisionItem[]> {
    const now = new Date();
    return Array.from(this.revisionItems.values())
      .filter(item => item.userId === userId && 
        (item.nextReviewDate === null || new Date(item.nextReviewDate) <= now));
  }

  async createRevisionItem(insertRevisionItem: InsertRevisionItem): Promise<RevisionItem> {
    const id = this.revisionItemIdCounter++;
    const now = new Date();
    const revisionItem: RevisionItem = { 
      id, 
      ...insertRevisionItem,
      createdAt: now 
    };
    this.revisionItems.set(id, revisionItem);
    return revisionItem;
  }

  async updateRevisionItem(id: number, revisionItemUpdate: Partial<InsertRevisionItem>): Promise<RevisionItem | undefined> {
    const existingRevisionItem = this.revisionItems.get(id);
    if (!existingRevisionItem) return undefined;

    const updatedRevisionItem = { ...existingRevisionItem, ...revisionItemUpdate };
    this.revisionItems.set(id, updatedRevisionItem);
    return updatedRevisionItem;
  }
}

export const storage = new MemStorage();
