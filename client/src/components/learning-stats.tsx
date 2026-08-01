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
  title = "Learning statistics",
}: LearningStatsCardProps) {
  // Determine the mastery level for display
  const getMasteryLevel = () => {
    if (stats.mastery.expert) return { label: "Expert", color: "text-green-600" };
    if (stats.mastery.advanced) return { label: "Advanced", color: "text-blue-600" };
    if (stats.mastery.intermediate) return { label: "Intermediate", color: "text-yellow-600" };
    return { label: "Beginner", color: "text-gray-600" };
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
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Mastery level */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Medal className="h-5 w-5 text-primary-500" />
                <span className="text-sm font-medium">Mastery level</span>
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

            {/* Retention rate */}
            <div className="flex items-center justify-between mt-4 mb-2">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary-500" />
                <span className="text-sm font-medium">Retention rate</span>
              </div>
              <span className="text-sm font-medium">
                {Math.round(stats.retentionRate)}%
              </span>
            </div>

            {/* Difficulty */}
            <div className="flex items-center justify-between mt-4 mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary-500" />
                <span className="text-sm font-medium">Estimated difficulty</span>
              </div>
              <span className="text-sm font-medium">
                {stats.predictedDifficulty < 0.3
                  ? "Easy"
                  : stats.predictedDifficulty < 0.7
                  ? "Medium"
                  : "Hard"}
              </span>
            </div>
            <Progress
              value={stats.predictedDifficulty * 100}
              className="h-2 mb-2"
            />
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Learning efficiency */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm font-medium">
                    Learning efficiency
                  </span>
                </div>
                <div className="text-lg font-bold">
                  {Math.round(stats.learningEfficiency)}%
                </div>
              </div>

              {/* Improvement rate */}
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
                    Improvement rate
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

              {/* Forgetting index */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium">Forgetting index</span>
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

              {/* Average quality */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium">Average quality</span>
                </div>
                <div className="text-lg font-bold">
                  {stats.averageResponseQuality.toFixed(1)}/5
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-4">
            {/* Optimal interval */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary-500" />
                <span className="text-sm font-medium">
                  Optimal review interval
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">
                  {stats.optimalReviewInterval} days
                </span>
                <span className="text-xs text-gray-500">
                  Recommended next review
                </span>
              </div>
            </div>

            {/* Success forecast */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <BarChart className="h-5 w-5 text-primary-500" />
                <span className="text-sm font-medium">
                  Future success probability
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

            {/* Recommendations */}
            <div className="mt-4 p-3 bg-primary-50 rounded-md">
              <h4 className="text-sm font-medium text-primary-700 mb-2">
                Recommendations
              </h4>
              <ul className="text-xs text-gray-700 space-y-2">
                {stats.mastery.beginner && (
                  <li>• Focus on the fundamental concepts</li>
                )}
                {stats.mastery.intermediate && (
                  <li>• Practice more frequently to strengthen memory</li>
                )}
                {stats.mastery.advanced && (
                  <li>• Try teaching this concept to someone else</li>
                )}
                {stats.mastery.expert && (
                  <li>• Move on to more advanced concepts</li>
                )}
                {stats.forgettingIndex > 0.4 && (
                  <li>• Review more often to reduce forgetting</li>
                )}
                {stats.improvementRate < 0 && (
                  <li>• Try a new learning approach</li>
                )}
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 