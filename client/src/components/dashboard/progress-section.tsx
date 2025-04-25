import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, CheckCircle, Clock, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function ProgressSection() {
  const { user } = useAuth();

  // Fetch user progress stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/user/stats"],
    queryFn: async () => {
      const res = await fetch("/api/user/stats", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Erreur lors de la récupération des statistiques");
      }
      return res.json();
    },
    enabled: !!user, // Only fetch if user is logged in
  });

  // Format study time
  const formatStudyTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="mb-10">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Notes prises",
      value: stats?.notesCount || 0,
      icon: <BookOpen className="text-xl text-primary-600" />,
      bgColor: "bg-primary-100",
    },
    {
      title: "Quiz complétés",
      value: stats?.quizzesCompleted || 0,
      icon: <CheckCircle className="text-xl text-green-600" />,
      bgColor: "bg-green-100",
    },
    {
      title: "Temps d'étude",
      value: formatStudyTime(stats?.studyTimeMinutes || 0),
      icon: <Clock className="text-xl text-amber-600" />,
      bgColor: "bg-amber-100",
    },
    {
      title: "Score moyen",
      value: `${stats?.averageScore || 0}%`,
      icon: <Trophy className="text-xl text-purple-600" />,
      bgColor: "bg-purple-100",
    },
  ];

  return (
    <div className="mb-10">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Mes progrès</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${card.bgColor} rounded-md p-3`}>
                  {card.icon}
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {card.title}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {card.value}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
