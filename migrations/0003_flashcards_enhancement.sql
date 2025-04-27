-- Mise à jour de la table flashcards avec les nouveaux champs
ALTER TABLE flashcards
ADD COLUMN consecutive_correct INT DEFAULT 0,
ADD COLUMN total_reviews INT DEFAULT 0,
ADD COLUMN last_response_quality INT DEFAULT 0,
ADD COLUMN difficulty INT DEFAULT 50;

-- Mise à jour des valeurs par défaut pour les champs existants
UPDATE flashcards
SET ease_factor = 250
WHERE ease_factor IS NULL;

UPDATE flashcards
SET interval = 1
WHERE interval IS NULL;