CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    noteId INTEGER,
    userMessage TEXT NOT NULL,
    aiResponse TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (noteId) REFERENCES notes(id) ON DELETE CASCADE
);