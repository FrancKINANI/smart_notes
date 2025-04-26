CREATE TABLE conversations (
    id int AUTO_INCREMENT NOT NULL,
    noteId int,
    userMessage text NOT NULL,
    aiResponse text NOT NULL,
    createdAt timestamp NOT NULL DEFAULT (now()),
    PRIMARY KEY (id),
    FOREIGN KEY (noteId) REFERENCES notes(id) ON DELETE CASCADE
);