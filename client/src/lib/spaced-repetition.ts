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
  // Nouvelles propriétés pour des statistiques améliorées
  responseHistory: number[]; // Historique des qualités de réponse
  reviewDates: Date[]; // Dates des révisions précédentes
  timeToAnswer?: number; // Temps pour répondre (en secondes), facultatif
}

export interface LearningStats {
  masteryLevel: number; // 0-100
  retentionRate: number; // % de rétention
  averageResponseQuality: number; // Qualité moyenne des réponses
  predictedDifficulty: number; // 0-1 (0: facile, 1: difficile)
  // Statistiques étendues
  learningEfficiency: number; // % d'efficacité d'apprentissage
  forgettingIndex: number; // Vitesse d'oubli (plus c'est bas, mieux c'est)
  optimalReviewInterval: number; // Intervalle optimal de révision en jours
  improvementRate: number; // Taux d'amélioration sur les 5 dernières révisions
  mastery: {
    beginner: boolean; // <30% de maîtrise
    intermediate: boolean; // 30-70% de maîtrise
    advanced: boolean; // 70-90% de maîtrise
    expert: boolean; // >90% de maîtrise
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

// Traitement de la réponse de l'utilisateur et mise à jour des statistiques
export function processResponse(
  item: SpacedRepetitionItem,
  quality: ResponseQuality,
  timeToAnswer?: number
): SpacedRepetitionItem {
  const updatedItem = { ...item };
  
  // Maintien de l'historique des réponses
  updatedItem.responseHistory = updatedItem.responseHistory || [];
  updatedItem.responseHistory.push(quality);
  
  // Maintien des dates de révision
  updatedItem.reviewDates = updatedItem.reviewDates || [];
  updatedItem.reviewDates.push(new Date());
  
  // Stocker le temps de réponse si disponible
  if (timeToAnswer !== undefined) {
    updatedItem.timeToAnswer = timeToAnswer;
  }

  // Mise à jour des statistiques de base
  updatedItem.lastResponseQuality = quality;
  updatedItem.totalReviews = (item.totalReviews || 0) + 1;

  // Mise à jour des séquences correctes
  if (quality >= 3) {
    updatedItem.consecutiveCorrect = (item.consecutiveCorrect || 0) + 1;
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
  // Si nous avons un historique de réponses, utilisons-le pour une meilleure prédiction
  if (item.responseHistory && item.responseHistory.length > 0) {
    const recentResponses = item.responseHistory.slice(-5); // Prendre les 5 dernières réponses
    const recentPerformance = recentResponses.reduce((sum, quality) => sum + quality, 0) / (recentResponses.length * 5);
    
    // Intégrer le temps de réponse si disponible
    const timeWeight = item.timeToAnswer ? Math.min(0.2, item.timeToAnswer / 30) : 0;
    
    const historicalDifficulty = item.difficulty || 0.5;
    const learningRate = 0.2;
    
    return Math.min(1, Math.max(0,
      historicalDifficulty * (1 - learningRate) +
      (1 - recentPerformance) * learningRate +
      timeWeight
    ));
  } else {
    // Fallback sur la méthode existante
    const recentPerformance = item.lastResponseQuality / 5;
    const historicalDifficulty = item.difficulty || 0.5;
    const learningRate = 0.2;

    return Math.min(1, Math.max(0,
      historicalDifficulty * (1 - learningRate) +
      (1 - recentPerformance) * learningRate
    ));
  }
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
      
  // Nouveau: Ajustement basé sur l'historique complet
  let historyFactor = 1;
  if (item.responseHistory && item.responseHistory.length > 2) {
    // Analyser la tendance des dernières réponses
    const recentTrend = calculateTrend(item.responseHistory.slice(-5));
    historyFactor = 1 + recentTrend * 0.15;
  }

  return Math.round(baseInterval * difficultyFactor * performanceFactor * historyFactor);
}

// Calcule la tendance des performances (-1 à 1, négatif = en baisse, positif = en hausse)
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
  
  // Normaliser la pente entre -1 et 1
  return Math.max(-1, Math.min(1, slope / 2.5));
}

// Nouvelle fonction pour obtenir les statistiques d'apprentissage détaillées
export function getLearningStats(item: SpacedRepetitionItem): LearningStats {
  const masteryLevel = calculateMasteryLevel(item);
  const retentionRate = calculateRetentionRate(item);
  const averageResponseQuality = calculateAverageResponseQuality(item);
  const predictedDifficulty = item.difficulty;
  
  // Nouvelles statistiques
  const learningEfficiency = calculateLearningEfficiency(item);
  const forgettingIndex = calculateForgettingIndex(item);
  const optimalReviewInterval = calculateOptimalInterval(item);
  const improvementRate = calculateImprovementRate(item);
  
  // Calcul des niveaux de maîtrise
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

// Calcule le taux de rétention
function calculateRetentionRate(item: SpacedRepetitionItem): number {
  if (item.totalReviews === 0) return 0;
  
  if (item.responseHistory && item.responseHistory.length > 0) {
    // Compter les réponses considérées comme "retenues" (qualité >= 3)
    const retainedCount = item.responseHistory.filter(q => q >= 3).length;
    return (retainedCount / item.responseHistory.length) * 100;
  }
  
  // Fallback
  const correctResponses = item.consecutiveCorrect;
  return (correctResponses / item.totalReviews) * 100;
}

// Calcule la qualité moyenne des réponses
function calculateAverageResponseQuality(item: SpacedRepetitionItem): number {
  if (item.responseHistory && item.responseHistory.length > 0) {
    return item.responseHistory.reduce((sum, q) => sum + q, 0) / item.responseHistory.length;
  }
  
  // Fallback
  return item.totalReviews > 0 ? item.lastResponseQuality : 0;
}

// Calcule l'efficacité d'apprentissage (rapport entre la maîtrise et l'effort)
function calculateLearningEfficiency(item: SpacedRepetitionItem): number {
  if (item.totalReviews === 0) return 0;
  
  const masteryLevel = calculateMasteryLevel(item);
  const effortMetric = Math.log(item.totalReviews + 1) * 20; // logarithmique pour éviter les valeurs extrêmes
  
  return Math.min(100, (masteryLevel / effortMetric) * 100);
}

// Calcule l'indice d'oubli (vitesse à laquelle l'information est oubliée)
function calculateForgettingIndex(item: SpacedRepetitionItem): number {
  if (!item.responseHistory || item.responseHistory.length < 3) return 0.5;
  
  // Analyse les régressions (après une bonne réponse, une mauvaise suit)
  let regressions = 0;
  for (let i = 1; i < item.responseHistory.length; i++) {
    if (item.responseHistory[i-1] >= 4 && item.responseHistory[i] <= 2) {
      regressions++;
    }
  }
  
  return regressions / (item.responseHistory.length - 1);
}

// Calcule le taux d'amélioration sur les dernières révisions
function calculateImprovementRate(item: SpacedRepetitionItem): number {
  if (!item.responseHistory || item.responseHistory.length < 5) return 0;
  
  const firstHalf = item.responseHistory.slice(0, Math.floor(item.responseHistory.length / 2));
  const secondHalf = item.responseHistory.slice(Math.floor(item.responseHistory.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, q) => sum + q, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, q) => sum + q, 0) / secondHalf.length;
  
  return Math.min(100, Math.max(-100, ((secondAvg - firstAvg) / 5) * 100));
}

// Fonction pour calculer l'historique de rétention basé sur les résultats des quiz
export function calculateRetentionHistory(
  quizResults: any[]
): { date: string; retention: number }[] {
  if (!quizResults || quizResults.length === 0) return [];

  // Filtrer les résultats sans date de complétion
  const validResults = quizResults.filter(result => result.completedAt);

  if (validResults.length === 0) return [];

  const sortedResults = [...validResults].sort(
    (a, b) =>
      new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );

  // Grouper les résultats par jour
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

  // Calculer la moyenne de rétention par jour
  return Object.entries(dailyResults).map(([date, scores]) => ({
    date,
    retention: Math.round(
      scores.reduce((sum, score) => sum + score, 0) / scores.length
    )
  }));
}

// Nouvelle fonction pour prédire la difficulté d'un concept
export function predictConceptDifficulty(
  conceptText: string,
  userPerformanceData: SpacedRepetitionItem[]
): number {
  // Facteurs influençant la difficulté
  const lengthFactor = Math.min(1, conceptText.length / 500) * 0.2; // Plus long = plus difficile
  const complexityFactor = calculateTextComplexity(conceptText) * 0.3; // Complexité linguistique
  
  // Analyse des performances antérieures de l'utilisateur sur des concepts similaires
  let performanceFactor = 0.5; // Valeur par défaut
  
  if (userPerformanceData && userPerformanceData.length > 0) {
    // Calculer la difficulté moyenne des éléments précédents
    const avgDifficulty = userPerformanceData.reduce(
      (sum, item) => sum + item.difficulty, 
      0
    ) / userPerformanceData.length;
    
    performanceFactor = avgDifficulty * 0.5;
  }
  
  // Combinaison des facteurs pour prédire la difficulté globale (0-1)
  return Math.min(1, Math.max(0, lengthFactor + complexityFactor + performanceFactor));
}

// Fonction auxiliaire pour calculer la complexité linguistique d'un texte
function calculateTextComplexity(text: string): number {
  // Implémentation simplifiée
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 0;
  
  // Longueur moyenne des mots (indicateur simple de complexité)
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
  
  // Nombre de mots longs (plus de 8 caractères)
  const longWords = words.filter(w => w.length > 8).length;
  const longWordRatio = longWords / words.length;
  
  // Calculer un score de complexité entre 0 et 1
  return Math.min(1, (avgWordLength / 12) * 0.5 + longWordRatio * 0.5);
}

// Nouvelle fonction pour recommander un planning de révision optimal
export function generateOptimalReviewSchedule(
  items: SpacedRepetitionItem[],
  daysAhead: number = 30
): Array<{ date: string; items: number[] }> {
  const schedule: Record<string, number[]> = {};
  const today = new Date();
  
  // Initialiser le planning pour chaque jour
  for (let i = 0; i < daysAhead; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + i);
    const dateStr = futureDate.toISOString().split('T')[0];
    schedule[dateStr] = [];
  }
  
  // Répartir les éléments dans le planning
  items.forEach(item => {
    if (!item.nextReviewDate) return;
    
    const reviewDate = new Date(item.nextReviewDate);
    const dateStr = reviewDate.toISOString().split('T')[0];
    
    // Vérifier si la date est dans notre fenêtre de planning
    if (schedule[dateStr] !== undefined) {
      schedule[dateStr].push(item.id);
    }
  });
  
  // Convertir en tableau pour faciliter l'utilisation
  return Object.entries(schedule)
    .map(([date, items]) => ({ date, items }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
