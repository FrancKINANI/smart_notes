// Simplified spaced repetition algorithm based on SuperMemo's SM-2

export interface SpacedRepetitionItem {
  id: number;
  interval: number; // days between reviews
  easeFactor: number; // multiplication factor
  nextReviewDate: Date | null;
}

// Response quality from 0 to 5
// 0 - Complete blackout
// 1 - Incorrect, but recognized answer
// 2 - Incorrect, but remembered after seeing answer
// 3 - Correct with difficulty
// 4 - Correct with hesitation
// 5 - Perfect recall
export type ResponseQuality = 0 | 1 | 2 | 3 | 4 | 5;

// Process a response and return the updated item
export function processResponse(
  item: SpacedRepetitionItem,
  quality: ResponseQuality
): SpacedRepetitionItem {
  // Clone the item to avoid mutation
  const updatedItem = { ...item };
  
  // Update ease factor
  updatedItem.easeFactor = Math.max(
    1.3, // minimum ease factor
    item.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );
  
  // Calculate new interval
  if (quality < 3) {
    // If response was poor, reset interval to 1
    updatedItem.interval = 1;
  } else {
    if (item.interval === 1) {
      updatedItem.interval = 1;
    } else if (item.interval === 1) {
      updatedItem.interval = 6;
    } else {
      updatedItem.interval = Math.round(item.interval * updatedItem.easeFactor);
    }
  }
  
  // Calculate next review date
  const now = new Date();
  const nextDate = new Date();
  nextDate.setDate(now.getDate() + updatedItem.interval);
  updatedItem.nextReviewDate = nextDate;
  
  return updatedItem;
}

// Calculate mastery level (0-100) based on interval and correct responses
export function calculateMasteryLevel(
  interval: number,
  successRate: number
): number {
  // Maximum interval for 100% mastery (arbitrary value, adjust as needed)
  const maxInterval = 30;
  
  // Calculate interval component (0-80)
  const intervalComponent = Math.min(80, Math.round((interval / maxInterval) * 80));
  
  // Calculate success rate component (0-20)
  const successComponent = Math.round(successRate * 20);
  
  return intervalComponent + successComponent;
}
