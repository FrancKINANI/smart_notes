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
import {
  FileText,
  BarChart,
  ArrowRight,
  Eye,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function QuizIndex() {
  const [activeTab, setActiveTab] = useState("available");

  // Fetch quizzes with notes info
  const { data: quizzes, isLoading: isLoadingQuizzes } = useQuery({
    queryKey: ["/api/quizzes"],
    queryFn: async () => {
      const response = await fetch("/api/quizzes", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch quizzes");
      }
      return response.json();
    },
  });

  // Fetch quiz results with better error handling
  const { data: quizResults = [], isLoading: isLoadingResults } = useQuery({
    queryKey: ["/api/quizzes/results"],
    queryFn: async () => {
      const response = await fetch("/api/quizzes/results", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch quiz results");
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

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
            No quiz available. Generate a quiz from your notes!
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
                Quiz on: {quiz.note?.title || "Deleted note"}
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
                  Take the Quiz <ArrowRight className="ml-2 h-4 w-4" />
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
            You have not taken any quiz yet.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizResults.map((result: any) => {
          const quiz = quizzes?.find((q: any) => q.id === result.quizId);
          return (
            <Card key={result.id} className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart className="h-5 w-5 mr-2 text-primary-500" />
                  {quiz?.note?.title
                    ? `Quiz on: ${quiz.note.title}`
                    : "Quiz on a deleted note"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="relative inline-block">
                    <svg className="w-24 h-24 transform -rotate-90">
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

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="answers">
                    <AccordionTrigger className="text-sm">
                      View the answers
                    </AccordionTrigger>
                    <AccordionContent>
                      {quiz?.questions.map((question: any, index: number) => {
                        const userAnswer = result.answers[question.id];
                        const isCorrect = userAnswer === question.correctAnswer;
                        return (
                          <div key={question.id} className="mb-4 text-sm">
                            <div className="flex items-start gap-2">
                              {isCorrect ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500 mt-1 flex-shrink-0" />
                              )}
                              <div>
                                <p className="font-medium">
                                  Q{index + 1}: {question.question}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Your answer: {userAnswer}
                                </p>
                                {!isCorrect && (
                                  <p className="text-sm text-green-600">
                                    Correct answer: {question.correctAnswer}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <p className="text-sm text-gray-500 text-center mt-4">
                  Completed on{" "}
                  {new Date(result.completedAt).toLocaleDateString()}
                </p>
              </CardContent>
              <CardFooter className="justify-end">
                <Button asChild variant="outline">
                  <Link to={`/quizzes/${result.quizId}`}>Retake the quiz</Link>
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
