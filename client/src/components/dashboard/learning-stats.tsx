import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, LineChart, TrendingUp, Target } from "lucide-react";
import { Chart } from "@/components/ui/chart";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface LearningStatsProps {
  userId: number;
}

export default function LearningStats({ userId }: LearningStatsProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Helper fetch with timeout
  function fetchWithTimeout(
    resource: string,
    options: any = {},
    timeout = 7000
  ) {
    return Promise.race([
      fetch(resource, options),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("API request timeout")),
          timeout
        )
      ),
    ]);
  }

  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/learning-stats", userId],
    queryFn: async () => {
      try {
        const res = await fetchWithTimeout(
          `/api/learning-stats?userId=${userId}`,
          {
            credentials: "include",
          }
        );
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          if (!res.ok) {
            throw new Error(
              data.message ||
                "Error fetching learning statistics"
            );
          }
          return data;
        } catch (jsonErr) {
          // Show the received HTML if it's not JSON
          throw new Error(
            `Unexpected API response:\n${text.substring(0, 200)}`
          );
        }
      } catch (error) {
        console.error(
          "Error fetching statistics:",
          error
        );
        toast({
          variant: "destructive",
          title: "Error",
          description:
            error instanceof Error ? error.message : "An error occurred",
        });
        throw error;
      }
    },
    enabled: !!userId && !!user,
    retry: 1,
    retryDelay: 1000,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  if (isLoading) {
    return <Skeleton className="w-full h-[400px]" />;
  }

  if (error || !stats) {
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-lg">
        An error occurred while loading the statistics.
        {process.env.NODE_ENV === "development" && error instanceof Error && (
          <p className="mt-2 text-sm">{error.message}</p>
        )}
      </div>
    );
  }

  // Make sure stats exists and has the right default data
  const safeStats = {
    averageMastery: 0,
    subjectMastery: [],
    retentionHistory: [],
    averageRetention: 0,
    difficultyDistribution: [],
    masteredConcepts: 0,
    conceptsToReview: 0,
    ...stats,
  };

  // If we have no data to display, show an appropriate message
  if (!safeStats.subjectMastery.length && !safeStats.retentionHistory.length) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center p-6">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No statistics available yet
            </h3>
            <p className="text-gray-500">
              Start studying and reviewing to see your learning
              statistics appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Detailed learning statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="mastery">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="mastery">Mastery</TabsTrigger>
              <TabsTrigger value="retention">Retention</TabsTrigger>
              <TabsTrigger value="difficulty">Difficulty</TabsTrigger>
            </TabsList>

            <TabsContent value="mastery" className="space-y-4">
              <div className="mt-6">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">
                    Overall mastery level
                  </span>
                  <span className="text-sm font-medium">
                    {safeStats.averageMastery}%
                  </span>
                </div>
                <Progress value={safeStats.averageMastery} className="h-2" />
              </div>

              {safeStats.subjectMastery.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-4">
                    Progress by subject
                  </h4>
                  <Chart
                    type="bar"
                    data={safeStats.subjectMastery}
                    index="subject"
                    categories={["mastery"]}
                    colors={["primary"]}
                    valueFormatter={(value) => `${value}%`}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="retention" className="space-y-4">
              <div className="grid gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          Average retention rate
                        </p>
                        <h3 className="text-2xl font-bold">
                          {safeStats.averageRetention}%
                        </h3>
                      </div>
                      <TrendingUp className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>

                {safeStats.retentionHistory.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-4">
                      Retention over time
                    </h4>
                    <Chart
                      type="line"
                      data={safeStats.retentionHistory}
                      index="date"
                      categories={["retention"]}
                      colors={["primary"]}
                      valueFormatter={(value) => `${value}%`}
                    />
                  </div>
                )}
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
                            Mastered concepts
                          </p>
                          <h3 className="text-2xl font-bold">
                            {safeStats.masteredConcepts}
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
                          <p className="text-sm font-medium">To review</p>
                          <h3 className="text-2xl font-bold">
                            {safeStats.conceptsToReview}
                          </h3>
                        </div>
                        <LineChart className="h-8 w-8 text-amber-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {safeStats.difficultyDistribution.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-4">
                      Distribution by difficulty
                    </h4>
                    <Chart
                      type="pie"
                      data={safeStats.difficultyDistribution}
                      index="level"
                      categories={["count"]}
                      colors={["green", "blue", "amber", "red"]}
                      valueFormatter={(value) => `${value} concepts`}
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
