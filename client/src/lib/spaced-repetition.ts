// Algorithme de répétition espacée optimisé basé sur SM-2 avec des améliorations

export interface SpacedRepetitionItem {
  id: number;
  interval: number; // days between reviews
  easeFactor: number; // multiplication factor
  nextReviewDate: Date | null;
  consecutiveCorrect: number;
  totalReviews: number;
  lastResponseQuality: number;
  difficulty: number;
}

export interface LearningStats {
  masteryLevel: number;
  retentionRate: number;
  averageResponseQuality: number;
  predictedDifficulty: number;
}

// Response quality from 0 to 5
// 0 - Complete blackout
// 1 - Incorrect, but recognized answer
// 2 - Incorrect, but remembered after seeing answer
// 3 - Correct with difficulty
// 4 - Correct with hesitation
// 5 - Perfect recall
export type ResponseQuality = 0 | 1 | 2 | 3 | 4 | 5;

// Processus de réponse amélioré avec plus de facteurs
export function processResponse(
  item: SpacedRepetitionItem,
  quality: ResponseQuality
): SpacedRepetitionItem {
  const updatedItem = { ...item };

  // Mise à jour des statistiques d'apprentissage
  updatedItem.totalReviews++;
  updatedItem.lastResponseQuality = quality;

  if (quality >= 3) {
    updatedItem.consecutiveCorrect++;
  } else {
    updatedItem.consecutiveCorrect = 0;
  }

  // Calcul du facteur de facilité avec adaptation dynamique
  const difficultyWeight = 0.05 * updatedItem.difficulty;
  updatedItem.easeFactor = Math.max(
    1.3,
    item.easeFactor +
      (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)) -
      difficultyWeight
  );

  // Calcul de l'intervalle avec bonus de séquence correcte
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

  // Mise à jour de la difficulté basée sur la performance
  updatedItem.difficulty = calculateDifficulty(updatedItem);

  // Calcul de la prochaine date de révision avec fenêtre optimale
  const now = new Date();
  const optimalInterval = calculateOptimalInterval(updatedItem);
  const nextDate = new Date();
  nextDate.setDate(now.getDate() + optimalInterval);
  updatedItem.nextReviewDate = nextDate;

  return updatedItem;
}

// Calcul du niveau de maîtrise amélioré
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

// Exporter les fonctions d'aide
export function calculateDifficulty(item: SpacedRepetitionItem): number {
  const recentPerformance = item.lastResponseQuality / 5;
  const historicalDifficulty = item.difficulty || 0.5;
  const learningRate = 0.2;

  return (
    historicalDifficulty * (1 - learningRate) +
    (1 - recentPerformance) * learningRate
  );
}

// Nouvelle fonction pour calculer l'intervalle optimal
export function calculateOptimalInterval(item: SpacedRepetitionItem): number {
  const baseInterval = item.interval;
  const retentionTarget = 0.9; // 90% de rétention ciblée

  // Ajustement basé sur la difficulté
  const difficultyFactor = 1 - item.difficulty * 0.5;

  // Ajustement basé sur la performance historique
  const performanceFactor =
    item.consecutiveCorrect > 0
      ? 1 + Math.log(item.consecutiveCorrect) * 0.1
      : 1;

  return Math.round(baseInterval * difficultyFactor * performanceFactor);
}

// Nouvelle fonction pour obtenir les statistiques d'apprentissage
export function getLearningStats(item: SpacedRepetitionItem): LearningStats {
  const masteryLevel = calculateMasteryLevel(item);
  const retentionRate = calculateRetentionRate(item);
  const averageResponseQuality =
    item.totalReviews > 0 ? item.lastResponseQuality / item.totalReviews : 0;
  const predictedDifficulty = item.difficulty;

  return {
    masteryLevel,
    retentionRate,
    averageResponseQuality,
    predictedDifficulty,
  };
}

// Nouvelle fonction pour calculer le taux de rétention
function calculateRetentionRate(item: SpacedRepetitionItem): number {
  if (item.totalReviews === 0) return 0;
  const correctResponses = item.consecutiveCorrect;
  return (correctResponses / item.totalReviews) * 100;
}

// Fonction pour calculer l'historique de rétention basé sur les résultats des quiz
export function calculateRetentionHistory(
  quizResults: any[]
): { date: string; retention: number }[] {
  if (!quizResults || quizResults.length === 0) return [];

  // Trier les résultats par date
  const sortedResults = [...quizResults].sort(
    (a, b) =>
      new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );

  // Grouper les résultats par jour
  const dailyResults = sortedResults.reduce(
    (acc: Record<string, number[]>, result) => {
      const date = new Date(result.completedAt).toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(result.score);
      return acc;
    },
    {}
  );

  // Calculer la moyenne de rétention par jour
  return Object.entries(dailyResults).map(([date, scores]) => ({
    date,
    retention: Math.round(
      scores.reduce((sum, score) => sum + score, 0) / scores.length
    ),
  }));
}
