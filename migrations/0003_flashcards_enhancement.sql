-- Update the flashcards table with the new fields
ALTER TABLE flashcards
ADD COLUMN consecutive_correct INT DEFAULT 0,
ADD COLUMN total_reviews INT DEFAULT 0,
ADD COLUMN last_response_quality INT DEFAULT 0,
ADD COLUMN difficulty INT DEFAULT 50;

-- Update default values for existing fields
UPDATE flashcards
SET ease_factor = 250
WHERE ease_factor IS NULL;

UPDATE flashcards
SET interval = 1
WHERE interval IS NULL;