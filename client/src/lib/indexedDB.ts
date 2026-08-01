import { openDB, DBSchema, IDBPDatabase } from "idb";

interface NotesDB extends DBSchema {
  "offline-notes": {
    key: number;
    value: {
      id?: number;
      title: string;
      content: string;
      summary?: string;
      userId: number;
      subjectId: number;
      updatedAt: string;
      pendingSync: boolean;
    };
    indexes: { "by-pending": boolean };
  };
  "offline-flashcards": {
    key: number;
    value: {
      id?: number;
      front: string;
      back: string;
      noteId: number;
      userId: number;
      pendingSync: boolean;
    };
    indexes: { "by-pending": boolean };
  };
}

const DB_NAME = "smart-study-companion-offline";
const DB_VERSION = 1;

// Initialize the database
async function initDB(): Promise<IDBPDatabase<NotesDB>> {
  return openDB<NotesDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store for notes
      const notesStore = db.createObjectStore("offline-notes", {
        keyPath: "id",
        autoIncrement: true,
      });
      notesStore.createIndex("by-pending", "pendingSync");

      // Store for flashcards
      const flashcardsStore = db.createObjectStore("offline-flashcards", {
        keyPath: "id",
        autoIncrement: true,
      });
      flashcardsStore.createIndex("by-pending", "pendingSync");
    },
  });
}

// Singleton for the database connection
let dbPromise: Promise<IDBPDatabase<NotesDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<NotesDB>> {
  if (!dbPromise) {
    dbPromise = initDB();
  }
  return dbPromise;
}

// Functions for notes
export async function saveNoteOffline(note: NotesDB["offline-notes"]["value"]) {
  const db = await getDB();
  return db.put("offline-notes", {
    ...note,
    updatedAt: new Date().toISOString(),
    pendingSync: true,
  });
}

export async function getNoteOffline(id: number) {
  const db = await getDB();
  return db.get("offline-notes", id);
}

export async function getAllOfflineNotes() {
  const db = await getDB();
  return db.getAll("offline-notes");
}

export async function getPendingNotes() {
  const db = await getDB();
  return db.getAllFromIndex("offline-notes", "by-pending", true);
}

export async function deleteNoteOffline(id: number) {
  const db = await getDB();
  return db.delete("offline-notes", id);
}

export async function markNoteSynced(id: number) {
  const db = await getDB();
  const note = await db.get("offline-notes", id);
  if (note) {
    note.pendingSync = false;
    await db.put("offline-notes", note);
  }
}

// Functions for flashcards
export async function saveFlashcardOffline(
  flashcard: NotesDB["offline-flashcards"]["value"]
) {
  const db = await getDB();
  return db.put("offline-flashcards", {
    ...flashcard,
    pendingSync: true,
  });
}

export async function getFlashcardOffline(id: number) {
  const db = await getDB();
  return db.get("offline-flashcards", id);
}

export async function getAllOfflineFlashcards() {
  const db = await getDB();
  return db.getAll("offline-flashcards");
}

export async function getPendingFlashcards() {
  const db = await getDB();
  return db.getAllFromIndex("offline-flashcards", "by-pending", true);
}

export async function deleteFlashcardOffline(id: number) {
  const db = await getDB();
  return db.delete("offline-flashcards", id);
}

export async function markFlashcardSynced(id: number) {
  const db = await getDB();
  const flashcard = await db.get("offline-flashcards", id);
  if (flashcard) {
    flashcard.pendingSync = false;
    await db.put("offline-flashcards", flashcard);
  }
}

// Sync function
export async function syncOfflineChanges() {
  // Sync notes
  const pendingNotes = await getPendingNotes();
  for (const note of pendingNotes) {
    try {
      const response = await fetch("/api/notes", {
        method: note.id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(note),
      });

      if (response.ok) {
        if (note.id) {
          await markNoteSynced(note.id);
        } else {
          const syncedNote = await response.json();
          await deleteNoteOffline(note.id!);
          await saveNoteOffline({
            ...syncedNote,
            pendingSync: false,
          });
        }
      }
    } catch (error) {
      console.error("Error syncing the note:", error);
    }
  }

  // Sync flashcards
  const pendingFlashcards = await getPendingFlashcards();
  for (const flashcard of pendingFlashcards) {
    try {
      const response = await fetch("/api/flashcards", {
        method: flashcard.id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(flashcard),
      });

      if (response.ok) {
        if (flashcard.id) {
          await markFlashcardSynced(flashcard.id);
        } else {
          const syncedFlashcard = await response.json();
          await deleteFlashcardOffline(flashcard.id!);
          await saveFlashcardOffline({
            ...syncedFlashcard,
            pendingSync: false,
          });
        }
      }
    } catch (error) {
      console.error(
        "Error syncing the flashcard:",
        error
      );
    }
  }
}

// Listen for connection events for automatic sync
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    syncOfflineChanges();
  });
}
