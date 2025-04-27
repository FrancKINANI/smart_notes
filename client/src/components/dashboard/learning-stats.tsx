import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, LineChart, TrendingUp, Target } from "lucide-react";
import { Chart } from "@/components/ui/chart";

interface LearningStatsProps {
  userId: number;
}

export default function LearningStats({ userId }: LearningStatsProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/learning-stats", userId],
    queryFn: async () => {
      const res = await fetch(`/api/learning-stats?userId=${userId}`);
      if (!res.ok) {
        throw new Error(
          "Erreur lors de la récupération des statistiques d'apprentissage"
        );
      }
      return res.json();
    },
  });

  if (isLoading) {
    return <Skeleton className="w-full h-[400px]" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Statistiques d'apprentissage détaillées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="mastery">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="mastery">Maîtrise</TabsTrigger>
              <TabsTrigger value="retention">Rétention</TabsTrigger>
              <TabsTrigger value="difficulty">Difficulté</TabsTrigger>
            </TabsList>

            <TabsContent value="mastery" className="space-y-4">
              <div className="mt-6">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">
                    Niveau de maîtrise global
                  </span>
                  <span className="text-sm font-medium">
                    {stats?.averageMastery || 0}%
                  </span>
                </div>
                <Progress value={stats?.averageMastery || 0} className="h-2" />
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-medium mb-4">
                  Progression par sujet
                </h4>
                <Chart
                  type="bar"
                  data={stats?.subjectMastery || []}
                  index="subject"
                  categories={["mastery"]}
                  colors={["primary"]}
                  valueFormatter={(value) => `${value}%`}
                />
              </div>
            </TabsContent>

            <TabsContent value="retention" className="space-y-4">
              <div className="grid gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          Taux de rétention moyen
                        </p>
                        <h3 className="text-2xl font-bold">
                          {stats?.averageRetention || 0}%
                        </h3>
                      </div>
                      <TrendingUp className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>

                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-4">
                    Évolution de la rétention
                  </h4>
                  <Chart
                    type="line"
                    data={stats?.retentionHistory || []}
                    index="date"
                    categories={["retention"]}
                    colors={["primary"]}
                    valueFormatter={(value) => `${value}%`}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="difficulty" className="space-y-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            Concepts maîtrisés
                          </p>
                          <h3 className="text-2xl font-bold">
                            {stats?.masteredConcepts || 0}
                          </h3>
                        </div>
                        <Target className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">À revoir</p>
                          <h3 className="text-2xl font-bold">
                            {stats?.conceptsToReview || 0}
                          </h3>
                        </div>
                        <LineChart className="h-8 w-8 text-amber-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-4">
                    Répartition par difficulté
                  </h4>
                  <Chart
                    type="pie"
                    data={stats?.difficultyDistribution || []}
                    index="level"
                    categories={["count"]}
                    colors={["green", "blue", "amber", "red"]}
                    valueFormatter={(value) => `${value} concepts`}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
