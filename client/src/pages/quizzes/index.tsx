import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { FileText, BarChart, ArrowRight } from "lucide-react";

export default function QuizIndex() {
  const [activeTab, setActiveTab] = useState("available");

  const userId = 1; // Default user ID for demo

  // Fetch quizzes
  const { data: quizzes, isLoading: isLoadingQuizzes } = useQuery({
    queryKey: ["/api/quizzes", { userId }],
    queryFn: () =>
      fetch(`/api/quizzes?userId=${userId}`).then((res) => res.json()),
  });

  // Fetch quiz results with better error handling
  const { data: quizResults = [], isLoading: isLoadingResults } = useQuery({
    queryKey: ["/api/quizzes/results", { userId }],
    queryFn: async () => {
      const response = await fetch(`/api/quizzes/results?userId=${userId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch quiz results");
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch notes for reference
  const { data: notes } = useQuery({
    queryKey: ["/api/notes", { userId }],
    queryFn: () =>
      fetch(`/api/notes?userId=${userId}`).then((res) => res.json()),
  });

  // Find note title by ID
  const getNoteTitle = (noteId: number) => {
    const note = notes?.find((n: any) => n.id === noteId);
    return note?.title || "Unknown Note";
  };

  // Render quiz list
  const renderQuizzes = () => {
    if (isLoadingQuizzes) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      );
    }

    if (!quizzes || quizzes.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            No quizzes available. Generate a quiz from your notes!
          </p>
          <Button asChild>
            <Link to="/notes">Browse Notes</Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map((quiz: any) => (
          <Card key={quiz.id}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary-500" />
                Quiz on {getNoteTitle(quiz.noteId)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                {quiz.questions.length} questions
              </p>
              <p className="text-sm text-gray-500">
                Created on {new Date(quiz.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
            <CardFooter className="justify-end">
              <Button asChild>
                <Link to={`/quizzes/${quiz.id}`}>
                  Take Quiz <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  // Render quiz results with type checking
  const renderResults = () => {
    if (isLoadingResults) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      );
    }

    if (!Array.isArray(quizResults) || quizResults.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">
            Vous n'avez pas encore effectué de quiz.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizResults.map((result: any) => {
          const quiz = quizzes?.find((q: any) => q.id === result.quizId);
          return (
            <Card key={result.id}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart className="h-5 w-5 mr-2 text-primary-500" />
                  {quiz
                    ? `Quiz sur ${getNoteTitle(quiz.noteId)}`
                    : "Résultat du Quiz"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center mb-4">
                  <div className="relative">
                    <svg className="w-24 h-24">
                      <circle
                        className="text-gray-200"
                        strokeWidth="5"
                        stroke="currentColor"
                        fill="transparent"
                        r="45"
                        cx="50%"
                        cy="50%"
                      />
                      <circle
                        className="text-primary-500"
                        strokeWidth="5"
                        strokeDasharray={45 * 2 * Math.PI}
                        strokeDashoffset={
                          45 * 2 * Math.PI * (1 - (result.score || 0) / 100)
                        }
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="45"
                        cx="50%"
                        cy="50%"
                      />
                    </svg>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <span className="text-xl font-bold">
                        {result.score || 0}%
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 text-center">
                  Complété le{" "}
                  {new Date(result.completedAt).toLocaleDateString()}
                </p>
              </CardContent>
              <CardFooter className="justify-end">
                <Button asChild variant="outline">
                  <Link to={`/quizzes/${result.quizId}`}>Refaire le quiz</Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Quiz</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="available">Available Quizzes</TabsTrigger>
            <TabsTrigger value="results">Your Results</TabsTrigger>
          </TabsList>

          <TabsContent value="available">{renderQuizzes()}</TabsContent>

          <TabsContent value="results">{renderResults()}</TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
