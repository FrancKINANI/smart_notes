import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PlusIcon, 
  UploadIcon, 
  BookOpen, 
  Brain, 
  Target, 
  TrendingUp,
  Calendar,
  Clock,
  Award,
  Users,
  Zap,
  BarChart3,
  Activity,
  Star,
  ChevronRight,
  PlayCircle,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface DashboardStats {
  totalNotes: number;
  totalFlashcards: number;
  studyStreak: number;
  weeklyGoalProgress: number;
  masteryLevel: number;
  upcomingReviews: number;
  completedQuizzes: number;
  studyTime: number;
}

interface RecentActivity {
  id: string;
  type: 'note' | 'quiz' | 'flashcard' | 'study_session';
  title: string;
  timestamp: string;
  score?: number;
  duration?: number;
}

export default function EnhancedDashboard() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats", user?.id],
    queryFn: () => fetch(`/api/dashboard/stats?userId=${user?.id}`).then(res => res.json()),
    enabled: !!user?.id,
  });

  // Fetch recent activity
  const { data: recentActivity, isLoading: activityLoading } = useQuery<RecentActivity[]>({
    queryKey: ["/api/dashboard/activity", user?.id],
    queryFn: () => fetch(`/api/dashboard/activity?userId=${user?.id}`).then(res => res.json()),
    enabled: !!user?.id,
  });

  const quickActions = [
    {
      title: "Create Note",
      description: "Start a new study note",
      icon: <PlusIcon className="h-5 w-5" />,
      href: "/notes/create",
      color: "bg-blue-500",
      gradient: "from-blue-500 to-blue-600"
    },
    {
      title: "Upload Content",
      description: "Import handwritten notes",
      icon: <UploadIcon className="h-5 w-5" />,
      href: "/notes/create?tab=upload",
      color: "bg-green-500",
      gradient: "from-green-500 to-green-600"
    },
    {
      title: "Study Session",
      description: "Start focused learning",
      icon: <PlayCircle className="h-5 w-5" />,
      href: "/study-session",
      color: "bg-purple-500",
      gradient: "from-purple-500 to-purple-600"
    },
    {
      title: "Take Quiz",
      description: "Test your knowledge",
      icon: <Brain className="h-5 w-5" />,
      href: "/quizzes",
      color: "bg-orange-500",
      gradient: "from-orange-500 to-orange-600"
    }
  ];

  const statCards = [
    {
      title: "Study Streak",
      value: stats?.studyStreak || 0,
      unit: "days",
      icon: <Zap className="h-5 w-5" />,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      change: "+2 from last week"
    },
    {
      title: "Mastery Level",
      value: stats?.masteryLevel || 0,
      unit: "%",
      icon: <Target className="h-5 w-5" />,
      color: "text-green-600",
      bgColor: "bg-green-50",
      change: "+5% this month"
    },
    {
      title: "Total Notes",
      value: stats?.totalNotes || 0,
      unit: "",
      icon: <BookOpen className="h-5 w-5" />,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      change: "+3 this week"
    },
    {
      title: "Study Time",
      value: Math.floor((stats?.studyTime || 0) / 60),
      unit: "hrs",
      icon: <Clock className="h-5 w-5" />,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      change: "+2.5hrs this week"
    }
  ];

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
            <BookOpen className="h-8 w-8 text-primary-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">Welcome to SmartNotes</h2>
          <p className="text-gray-600 max-w-md">
            Please sign in to access your personalized learning dashboard and start your study journey.
          </p>
          <Button asChild className="btn-gradient">
            <Link href="/auth">Get Started</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      {/* Header Section */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gradient">
                Welcome back, {user.displayName || user.username}! 👋
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Ready to continue your learning journey?
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule
              </Button>
              <Button className="btn-gradient">
                <Target className="h-4 w-4 mr-2" />
                Set Goal
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Quick Actions */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href}>
                <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${action.gradient} text-white shadow-lg group-hover:shadow-xl transition-shadow`}>
                        {action.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {action.description}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Stats Overview */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Progress</h2>
            <div className="flex gap-2">
              {(['week', 'month', 'year'] as const).map((period) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPeriod(period)}
                  className="capitalize"
                >
                  {period}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat, index) => (
              <Card key={index} className="card-elevated group hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                      <div className={stat.color}>
                        {stat.icon}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {statsLoading ? (
                          <div className="w-8 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        ) : (
                          <>
                            {stat.value}
                            <span className="text-sm font-normal text-gray-500 ml-1">
                              {stat.unit}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {stat.title}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        {stat.change}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Goals
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Achievements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly Goal Progress */}
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary-600" />
                    Weekly Study Goal
                  </CardTitle>
                  <CardDescription>
                    Track your progress towards this week's learning objectives
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Study Sessions</span>
                      <span className="font-medium">12/15</span>
                    </div>
                    <Progress value={80} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Notes Created</span>
                      <span className="font-medium">8/10</span>
                    </div>
                    <Progress value={80} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Quizzes Completed</span>
                      <span className="font-medium">5/7</span>
                    </div>
                    <Progress value={71} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Reviews */}
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    Upcoming Reviews
                  </CardTitle>
                  <CardDescription>
                    Flashcards and notes scheduled for review
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="font-medium">Due Now</span>
                      </div>
                      <Badge variant="secondary">{stats?.upcomingReviews || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="font-medium">Due Today</span>
                      </div>
                      <Badge variant="secondary">23</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-medium">Due Tomorrow</span>
                      </div>
                      <Badge variant="secondary">15</Badge>
                    </div>
                  </div>
                  <Button className="w-full mt-4 btn-gradient">
                    Start Review Session
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your latest learning activities and achievements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activityLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                          <div className="w-1/2 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        </div>
                      </div>
                    ))
                  ) : recentActivity?.length ? (
                    recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          activity.type === 'note' && "bg-blue-100 text-blue-600",
                          activity.type === 'quiz' && "bg-green-100 text-green-600",
                          activity.type === 'flashcard' && "bg-purple-100 text-purple-600",
                          activity.type === 'study_session' && "bg-orange-100 text-orange-600"
                        )}>
                          {activity.type === 'note' && <BookOpen className="h-5 w-5" />}
                          {activity.type === 'quiz' && <Brain className="h-5 w-5" />}
                          {activity.type === 'flashcard' && <Star className="h-5 w-5" />}
                          {activity.type === 'study_session' && <PlayCircle className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {activity.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(activity.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        {activity.score && (
                          <Badge variant={activity.score >= 80 ? "default" : "secondary"}>
                            {activity.score}%
                          </Badge>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">
                        Start studying to see your activity here
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Learning Goals</CardTitle>
                <CardDescription>
                  Set and track your learning objectives
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Goal setting feature coming soon!
                  </p>
                  <Button className="btn-gradient">
                    Set Your First Goal
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Achievements</CardTitle>
                <CardDescription>
                  Celebrate your learning milestones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Achievement system coming soon!
                  </p>
                  <Button className="btn-gradient">
                    Explore Achievements
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
