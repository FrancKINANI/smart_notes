import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { LearningStats } from "@/lib/spaced-repetition";
import {
  BarChart,
  Calendar,
  Check,
  Clock,
  Medal,
  TrendingUp,
  Zap,
  AlertTriangle,
  Brain,
} from "lucide-react";

interface LearningStatsCardProps {
  stats: LearningStats;
  title?: string;
}

export function LearningStatsCard({
  stats,
  title = "Statistiques d'apprentissage",
}: LearningStatsCardProps) {
  // Déterminer le niveau de maîtrise pour l'affichage
  const getMasteryLevel = () => {
    if (stats.mastery.expert) return { label: "Expert", color: "text-green-600" };
    if (stats.mastery.advanced) return { label: "Avancé", color: "text-blue-600" };
    if (stats.mastery.intermediate) return { label: "Intermédiaire", color: "text-yellow-600" };
    return { label: "Débutant", color: "text-gray-600" };
  };

  const masteryInfo = getMasteryLevel();

  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="overview">Aperçu</TabsTrigger>
            <TabsTrigger value="details">Détails</TabsTrigger>
            <TabsTrigger value="predictions">Prédictions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Niveau de maîtrise */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Medal className="h-5 w-5 text-primary-500" />
                <span className="text-sm font-medium">Niveau de maîtrise</span>
              </div>
              <div className="flex items-center">
                <span className={`text-sm font-semibold ${masteryInfo.color}`}>
                  {masteryInfo.label}
                </span>
              </div>
            </div>
            <Progress value={stats.masteryLevel} className="h-2 mb-2" />
            <div className="text-xs text-gray-500 text-right">
              {stats.masteryLevel}%
            </div>

            {/* Taux de rétention */}
            <div className="flex items-center justify-between mt-4 mb-2">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary-500" />
                <span className="text-sm font-medium">Taux de rétention</span>
              </div>
              <span className="text-sm font-medium">
                {Math.round(stats.retentionRate)}%
              </span>
            </div>

            {/* Difficulté */}
            <div className="flex items-center justify-between mt-4 mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary-500" />
                <span className="text-sm font-medium">Difficulté estimée</span>
              </div>
              <span className="text-sm font-medium">
                {stats.predictedDifficulty < 0.3
                  ? "Facile"
                  : stats.predictedDifficulty < 0.7
                  ? "Moyen"
                  : "Difficile"}
              </span>
            </div>
            <Progress
              value={stats.predictedDifficulty * 100}
              className="h-2 mb-2"
            />
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Efficacité d'apprentissage */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm font-medium">
                    Efficacité d'apprentissage
                  </span>
                </div>
                <div className="text-lg font-bold">
                  {Math.round(stats.learningEfficiency)}%
                </div>
              </div>

              {/* Taux d'amélioration */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp
                    className={`h-5 w-5 ${
                      stats.improvementRate >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  />
                  <span className="text-sm font-medium">
                    Taux d'amélioration
                  </span>
                </div>
                <div
                  className={`text-lg font-bold ${
                    stats.improvementRate >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {stats.improvementRate > 0 ? "+" : ""}
                  {Math.round(stats.improvementRate)}%
                </div>
              </div>

              {/* Indice d'oubli */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium">Indice d'oubli</span>
                </div>
                <div
                  className={`text-lg font-bold ${
                    stats.forgettingIndex < 0.3
                      ? "text-green-600"
                      : stats.forgettingIndex < 0.6
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {(stats.forgettingIndex * 100).toFixed(0)}%
                </div>
              </div>

              {/* Qualité moyenne */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium">Qualité moyenne</span>
                </div>
                <div className="text-lg font-bold">
                  {stats.averageResponseQuality.toFixed(1)}/5
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-4">
            {/* Intervalle optimal */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary-500" />
                <span className="text-sm font-medium">
                  Intervalle optimal de révision
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">
                  {stats.optimalReviewInterval} jours
                </span>
                <span className="text-xs text-gray-500">
                  Prochaine révision recommandée
                </span>
              </div>
            </div>

            {/* Prévision de réussite */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <BarChart className="h-5 w-5 text-primary-500" />
                <span className="text-sm font-medium">
                  Probabilité de réussite future
                </span>
              </div>
              <Progress
                value={stats.retentionRate}
                className="h-3"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Recommandations */}
            <div className="mt-4 p-3 bg-primary-50 rounded-md">
              <h4 className="text-sm font-medium text-primary-700 mb-2">
                Recommandations
              </h4>
              <ul className="text-xs text-gray-700 space-y-2">
                {stats.mastery.beginner && (
                  <li>• Concentrez-vous sur les concepts fondamentaux</li>
                )}
                {stats.mastery.intermediate && (
                  <li>• Pratiquez plus fréquemment pour renforcer la mémoire</li>
                )}
                {stats.mastery.advanced && (
                  <li>• Essayez d'enseigner ce concept à quelqu'un d'autre</li>
                )}
                {stats.mastery.expert && (
                  <li>• Passez à des concepts plus avancés</li>
                )}
                {stats.forgettingIndex > 0.4 && (
                  <li>• Révisez plus fréquemment pour réduire l'oubli</li>
                )}
                {stats.improvementRate < 0 && (
                  <li>• Essayez une nouvelle approche d'apprentissage</li>
                )}
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 