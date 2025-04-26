-- Ajout de contraintes de validation sur les emails
ALTER TABLE users
ADD CONSTRAINT check_email_format
CHECK (email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Ajout d'index pour optimiser les recherches fréquentes
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_user_username ON users(username);
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_subject_id ON notes(subject_id);
CREATE INDEX idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX idx_flashcards_next_review ON flashcards(next_review_date);
CREATE INDEX idx_quiz_results_user_id ON quiz_results(user_id);
CREATE INDEX idx_quiz_results_quiz_id ON quiz_results(quiz_id);

-- Ajout de contraintes sur les dates
ALTER TABLE notes 
ADD CONSTRAINT check_created_at_past
CHECK (created_at <= CURRENT_TIMESTAMP);

ALTER TABLE quiz_results
ADD CONSTRAINT check_completed_at_past
CHECK (completed_at <= CURRENT_TIMESTAMP);

-- Contraintes sur les scores des quiz
ALTER TABLE quiz_results
ADD CONSTRAINT check_score_range
CHECK (score >= 0 AND score <= 100);

-- Contraintes sur les valeurs des flashcards
ALTER TABLE flashcards
ADD CONSTRAINT check_interval_positive
CHECK (interval > 0),
ADD CONSTRAINT check_ease_factor_range
CHECK (ease_factor BETWEEN 130 AND 500);

-- Contraintes sur le niveau de maîtrise
ALTER TABLE revision_items
ADD CONSTRAINT check_mastery_level_range
CHECK (mastery_level BETWEEN 0 AND 5);