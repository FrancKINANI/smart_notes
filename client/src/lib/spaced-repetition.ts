// Optimized spaced repetition algorithm based on SM-2 with improvements

export interface SpacedRepetitionItem {
  id: number;
  interval: number; // days between reviews
  easeFactor: number; // multiplication factor
  nextReviewDate: Date | null;
  consecutiveCorrect: number;
  totalReviews: number;
  lastResponseQuality: number;
  difficulty: number;
  // New properties for improved statistics
  responseHistory: number[]; // Response quality history
  reviewDates: Date[]; // Dates of previous reviews
  timeToAnswer?: number; // Time to answer (in seconds), optional
}

export interface LearningStats {
  masteryLevel: number; // 0-100
  retentionRate: number; // % retention
  averageResponseQuality: number; // Average response quality
  predictedDifficulty: number; // 0-1 (0: easy, 1: hard)
  // Extended statistics
  learningEfficiency: number; // % learning efficiency
  forgettingIndex: number; // Forgetting speed (lower is better)
  optimalReviewInterval: number; // Optimal review interval in days
  improvementRate: number; // Improvement rate over the last 5 reviews
  mastery: {
    beginner: boolean; // <30% mastery
    intermediate: boolean; // 30-70% mastery
    advanced: boolean; // 70-90% mastery
    expert: boolean; // >90% mastery
  };
}

// Response quality from 0 to 5
// 0 - Complete blackout
// 1 - Incorrect, but recognized answer
// 2 - Incorrect, but remembered after seeing answer
// 3 - Correct with difficulty
// 4 - Correct with hesitation
// 5 - Perfect recall
export type ResponseQuality = 0 | 1 | 2 | 3 | 4 | 5;

// Process the user's response and update statistics
export function processResponse(
  item: SpacedRepetitionItem,
  quality: ResponseQuality,
  timeToAnswer?: number
): SpacedRepetitionItem {
  const updatedItem = { ...item };
  
  // Maintain the response history
  updatedItem.responseHistory = updatedItem.responseHistory || [];
  updatedItem.responseHistory.push(quality);
  
  // Maintain the review dates
  updatedItem.reviewDates = updatedItem.reviewDates || [];
  updatedItem.reviewDates.push(new Date());
  
  // Store the response time if available
  if (timeToAnswer !== undefined) {
    updatedItem.timeToAnswer = timeToAnswer;
  }

  // Update the base statistics
  updatedItem.lastResponseQuality = quality;
  updatedItem.totalReviews = (item.totalReviews || 0) + 1;

  // Update the correct streaks
  if (quality >= 3) {
    updatedItem.consecutiveCorrect = (item.consecutiveCorrect || 0) + 1;
  } else {
    updatedItem.consecutiveCorrect = 0;
  }

  // Calculate the ease factor with dynamic adaptation
  const difficultyWeight = 0.05 * updatedItem.difficulty;
  updatedItem.easeFactor = Math.max(
    1.3,
    item.easeFactor +
      (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)) -
      difficultyWeight
  );

  // Calculate the interval with a correct-streak bonus
  if (quality < 3) {
    updatedItem.interval = Math.max(1, Math.floor(item.interval * 0.5));
  } else {
    if (item.interval === 1) {
      updatedItem.interval = 4;
    } else if (item.interval === 4) {
      updatedItem.interval = 7;
    } else {
      const bonus = Math.min(1.5, 1 + updatedItem.consecutiveCorrect * 0.1);
      updatedItem.interval = Math.round(
        item.interval * updatedItem.easeFactor * bonus
      );
    }
  }

  // Update the difficulty based on performance
  updatedItem.difficulty = calculateDifficulty(updatedItem);

  // Calculate the next review date with an optimal window
  const now = new Date();
  const optimalInterval = calculateOptimalInterval(updatedItem);
  const nextDate = new Date();
  nextDate.setDate(now.getDate() + optimalInterval);
  updatedItem.nextReviewDate = nextDate;

  return updatedItem;
}

// Calculate the improved mastery level
export function calculateMasteryLevel(item: SpacedRepetitionItem): number {
  const maxInterval = 30;
  const intervalComponent = Math.min(
    80,
    Math.round((item.interval / maxInterval) * 80)
  );
  const qualityComponent = Math.round((item.lastResponseQuality / 5) * 10);
  const streakComponent = Math.min(10, item.consecutiveCorrect);

  return intervalComponent + qualityComponent + streakComponent;
}

// Export the helper functions
export function calculateDifficulty(item: SpacedRepetitionItem): number {
  // If we have a response history, use it for a better prediction
  if (item.responseHistory && item.responseHistory.length > 0) {
    const recentResponses = item.responseHistory.slice(-5); // Take the last 5 responses
    const recentPerformance = recentResponses.reduce((sum, quality) => sum + quality, 0) / (recentResponses.length * 5);
    
    // Integrate the response time if available
    const timeWeight = item.timeToAnswer ? Math.min(0.2, item.timeToAnswer / 30) : 0;
    
    const historicalDifficulty = item.difficulty || 0.5;
    const learningRate = 0.2;
    
    return Math.min(1, Math.max(0,
      historicalDifficulty * (1 - learningRate) +
      (1 - recentPerformance) * learningRate +
      timeWeight
    ));
  } else {
    // Fallback to the existing method
    const recentPerformance = item.lastResponseQuality / 5;
    const historicalDifficulty = item.difficulty || 0.5;
    const learningRate = 0.2;

    return Math.min(1, Math.max(0,
      historicalDifficulty * (1 - learningRate) +
      (1 - recentPerformance) * learningRate
    ));
  }
}

// New function to calculate the optimal interval
export function calculateOptimalInterval(item: SpacedRepetitionItem): number {
  const baseInterval = item.interval;
  const retentionTarget = 0.9; // 90% target retention

  // Adjustment based on difficulty
  const difficultyFactor = 1 - item.difficulty * 0.5;

  // Adjustment based on historical performance
  const performanceFactor =
    item.consecutiveCorrect > 0
      ? 1 + Math.log(item.consecutiveCorrect) * 0.1
      : 1;
      
  // New: Adjustment based on the complete history
  let historyFactor = 1;
  if (item.responseHistory && item.responseHistory.length > 2) {
    // Analyze the trend of the last responses
    const recentTrend = calculateTrend(item.responseHistory.slice(-5));
    historyFactor = 1 + recentTrend * 0.15;
  }

  return Math.round(baseInterval * difficultyFactor * performanceFactor * historyFactor);
}

// Calculate the performance trend (-1 to 1, negative = declining, positive = improving)
function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0;
  
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  
  for (let i = 0; i < values.length; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  
  const n = values.length;
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  // Normalize the slope between -1 and 1
  return Math.max(-1, Math.min(1, slope / 2.5));
}

// New function to get detailed learning statistics
export function getLearningStats(item: SpacedRepetitionItem): LearningStats {
  const masteryLevel = calculateMasteryLevel(item);
  const retentionRate = calculateRetentionRate(item);
  const averageResponseQuality = calculateAverageResponseQuality(item);
  const predictedDifficulty = item.difficulty;
  
  // New statistics
  const learningEfficiency = calculateLearningEfficiency(item);
  const forgettingIndex = calculateForgettingIndex(item);
  const optimalReviewInterval = calculateOptimalInterval(item);
  const improvementRate = calculateImprovementRate(item);
  
  // Calculate the mastery levels
  const mastery = {
    beginner: masteryLevel < 30,
    intermediate: masteryLevel >= 30 && masteryLevel < 70,
    advanced: masteryLevel >= 70 && masteryLevel < 90,
    expert: masteryLevel >= 90
  };

  return {
    masteryLevel,
    retentionRate,
    averageResponseQuality,
    predictedDifficulty,
    learningEfficiency,
    forgettingIndex,
    optimalReviewInterval,
    improvementRate,
    mastery
  };
}

// Calculate the retention rate
function calculateRetentionRate(item: SpacedRepetitionItem): number {
  if (item.totalReviews === 0) return 0;
  
  if (item.responseHistory && item.responseHistory.length > 0) {
    // Count responses considered as "retained" (quality >= 3)
    const retainedCount = item.responseHistory.filter(q => q >= 3).length;
    return (retainedCount / item.responseHistory.length) * 100;
  }
  
  // Fallback
  const correctResponses = item.consecutiveCorrect;
  return (correctResponses / item.totalReviews) * 100;
}

// Calculate the average response quality
function calculateAverageResponseQuality(item: SpacedRepetitionItem): number {
  if (item.responseHistory && item.responseHistory.length > 0) {
    return item.responseHistory.reduce((sum, q) => sum + q, 0) / item.responseHistory.length;
  }
  
  // Fallback
  return item.totalReviews > 0 ? item.lastResponseQuality : 0;
}

// Calculate the learning efficiency (ratio between mastery and effort)
function calculateLearningEfficiency(item: SpacedRepetitionItem): number {
  if (item.totalReviews === 0) return 0;
  
  const masteryLevel = calculateMasteryLevel(item);
  const effortMetric = Math.log(item.totalReviews + 1) * 20; // logarithmic to avoid extreme values
  
  return Math.min(100, (masteryLevel / effortMetric) * 100);
}

// Calculate the forgetting index (speed at which information is forgotten)
function calculateForgettingIndex(item: SpacedRepetitionItem): number {
  if (!item.responseHistory || item.responseHistory.length < 3) return 0.5;
  
  // Analyze regressions (after a good response, a bad one follows)
  let regressions = 0;
  for (let i = 1; i < item.responseHistory.length; i++) {
    if (item.responseHistory[i-1] >= 4 && item.responseHistory[i] <= 2) {
      regressions++;
    }
  }
  
  return regressions / (item.responseHistory.length - 1);
}

// Calculate the improvement rate over the recent reviews
function calculateImprovementRate(item: SpacedRepetitionItem): number {
  if (!item.responseHistory || item.responseHistory.length < 5) return 0;
  
  const firstHalf = item.responseHistory.slice(0, Math.floor(item.responseHistory.length / 2));
  const secondHalf = item.responseHistory.slice(Math.floor(item.responseHistory.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, q) => sum + q, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, q) => sum + q, 0) / secondHalf.length;
  
  return Math.min(100, Math.max(-100, ((secondAvg - firstAvg) / 5) * 100));
}

// Function to calculate the retention history based on quiz results
export function calculateRetentionHistory(
  quizResults: any[]
): { date: string; retention: number }[] {
  if (!quizResults || quizResults.length === 0) return [];

  // Filter results without a completion date
  const validResults = quizResults.filter(result => result.completedAt);

  if (validResults.length === 0) return [];

  const sortedResults = [...validResults].sort(
    (a, b) =>
      new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );

  // Group the results by day
  const dailyResults = sortedResults.reduce(
    (acc: Record<string, number[]>, result) => {
      if (!result.completedAt) return acc;
      
      const date = new Date(result.completedAt).toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(result.score);
      return acc;
    },
    {}
  );

  // Calculate the average retention per day
  return Object.entries(dailyResults).map(([date, scores]) => ({
    date,
    retention: Math.round(
      scores.reduce((sum, score) => sum + score, 0) / scores.length
    )
  }));
}

// New function to predict the difficulty of a concept
export function predictConceptDifficulty(
  conceptText: string,
  userPerformanceData: SpacedRepetitionItem[]
): number {
  // Factors influencing difficulty
  const lengthFactor = Math.min(1, conceptText.length / 500) * 0.2; // Longer = harder
  const complexityFactor = calculateTextComplexity(conceptText) * 0.3; // Linguistic complexity
  
  // Analyze the user's past performance on similar concepts
  let performanceFactor = 0.5; // Default value
  
  if (userPerformanceData && userPerformanceData.length > 0) {
    // Calculate the average difficulty of previous items
    const avgDifficulty = userPerformanceData.reduce(
      (sum, item) => sum + item.difficulty, 
      0
    ) / userPerformanceData.length;
    
    performanceFactor = avgDifficulty * 0.5;
  }
  
  // Combine the factors to predict the overall difficulty (0-1)
  return Math.min(1, Math.max(0, lengthFactor + complexityFactor + performanceFactor));
}

// Helper function to calculate the linguistic complexity of a text
function calculateTextComplexity(text: string): number {
  // Simplified implementation
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 0;
  
  // Average word length (simple complexity indicator)
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
  
  // Number of long words (more than 8 characters)
  const longWords = words.filter(w => w.length > 8).length;
  const longWordRatio = longWords / words.length;
  
  // Calculate a complexity score between 0 and 1
  return Math.min(1, (avgWordLength / 12) * 0.5 + longWordRatio * 0.5);
}

// New function to recommend an optimal review schedule
export function generateOptimalReviewSchedule(
  items: SpacedRepetitionItem[],
  daysAhead: number = 30
): Array<{ date: string; items: number[] }> {
  const schedule: Record<string, number[]> = {};
  const today = new Date();
  
  // Initialize the schedule for each day
  for (let i = 0; i < daysAhead; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + i);
    const dateStr = futureDate.toISOString().split('T')[0];
    schedule[dateStr] = [];
  }
  
  // Distribute the items in the schedule
  items.forEach(item => {
    if (!item.nextReviewDate) return;
    
    const reviewDate = new Date(item.nextReviewDate);
    const dateStr = reviewDate.toISOString().split('T')[0];
    
    // Check if the date is in our schedule window
    if (schedule[dateStr] !== undefined) {
      schedule[dateStr].push(item.id);
    }
  });
  
  // Convert to an array for easier use
  return Object.entries(schedule)
    .map(([date, items]) => ({ date, items }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
