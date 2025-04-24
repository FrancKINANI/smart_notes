import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Check, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export default function TakeQuiz() {
  const params = useParams<{ id: string }>();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const quizId = parseInt(params.id);
  const userId = 1; // Default user ID for demo
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);
  
  // Fetch quiz details
  const { data: quiz, isLoading: isLoadingQuiz, error } = useQuery({
    queryKey: [`/api/quizzes/${quizId}`],
    queryFn: () => fetch(`/api/quizzes/${quizId}`).then(res => res.json())
  });
  
  // Fetch note details
  const { data: note } = useQuery({
    queryKey: [`/api/notes/${quiz?.noteId}`],
    queryFn: () => fetch(`/api/notes/${quiz?.noteId}`).then(res => res.json()),
    enabled: !!quiz?.noteId
  });
  
  // Submit quiz results mutation
  const submitQuizMutation = useMutation({
    mutationFn: async (data: { answers: Record<string, string>, score: number }) => {
      const response = await apiRequest("POST", `/api/quizzes/${quizId}/submit`, {
        userId,
        answers: data.answers,
        score: data.score
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Quiz completed",
        description: "Your quiz results have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes/results"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save quiz results. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Handle answer selection
  const handleAnswerSelect = (questionId: string, answer: string) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: answer
    });
  };
  
  // Move to next question
  const handleNextQuestion = () => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Complete the quiz
      calculateScore();
    }
  };
  
  // Move to previous question
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  // Calculate final score
  const calculateScore = () => {
    if (!quiz) return;
    
    let correctAnswers = 0;
    
    quiz.questions.forEach((question: any) => {
      if (selectedAnswers[question.id] === question.correctAnswer) {
        correctAnswers++;
      }
    });
    
    const calculatedScore = Math.round((correctAnswers / quiz.questions.length) * 100);
    setScore(calculatedScore);
    setIsQuizCompleted(true);
    
    // Submit quiz results
    submitQuizMutation.mutate({
      answers: selectedAnswers,
      score: calculatedScore
    });
  };
  
  // Get current question
  const currentQuestion = quiz?.questions[currentQuestionIndex];
  
  // Progress percentage
  const progressPercentage = quiz 
    ? ((currentQuestionIndex + 1) / quiz.questions.length) * 100 
    : 0;
  
  if (error) {
    return (
      <div className="py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load quiz. It may have been deleted or you don't have permission to view it.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button asChild>
              <Link to="/quizzes">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Quizzes
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Quiz completed view
  if (isQuizCompleted) {
    return (
      <div className="py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-center">
              <div className="inline-flex mb-6 p-4 bg-primary-50 rounded-full">
                <Check className="h-12 w-12 text-primary-500" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Quiz Completed!</h1>
              <p className="text-gray-600 mb-6">You scored {score}% on this quiz.</p>
              
              <div className="w-full max-w-md mx-auto mb-8">
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-primary-600 bg-primary-200">
                        Your Score
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-primary-600">
                        {score}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-primary-200">
                    <div style={{ width: `${score}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500"></div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button asChild variant="outline">
                  <Link to="/quizzes">
                    Back to Quizzes
                  </Link>
                </Button>
                
                {note && (
                  <Button asChild>
                    <Link to={`/notes/${note.id}`}>
                      Review Note
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Quiz header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" asChild>
            <Link to="/quizzes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Exit Quiz
            </Link>
          </Button>
          
          {note && (
            <h1 className="text-lg font-medium">Quiz on: {note.title}</h1>
          )}
          
          <div className="text-sm text-gray-500">
            Question {currentQuestionIndex + 1} of {quiz?.questions.length || '...'}
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mb-6">
          <Progress value={progressPercentage} className="h-2" />
        </div>
        
        {/* Question card */}
        {isLoadingQuiz ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-start space-x-2">
                  <Skeleton className="h-4 w-4 rounded-full mt-1" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : currentQuestion ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-start">
                <HelpCircle className="h-5 w-5 mr-2 flex-shrink-0 text-primary-500" />
                <span>{currentQuestion.question}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <RadioGroup 
                value={selectedAnswers[currentQuestion.id] || ''} 
                onValueChange={(value) => handleAnswerSelect(currentQuestion.id, value)}
              >
                {currentQuestion.options.map((option: string) => (
                  <div key={option} className="flex items-center space-x-2 mb-4">
                    <RadioGroupItem id={option} value={option} />
                    <Label htmlFor={option} className="flex-grow">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        ) : null}
        
        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <Button 
            variant="outline" 
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          
          <Button 
            onClick={handleNextQuestion}
            disabled={!selectedAnswers[currentQuestion?.id || '']}
          >
            {currentQuestionIndex === (quiz?.questions.length || 0) - 1 ? (
              <>Finish Quiz<Check className="ml-2 h-4 w-4" /></>
            ) : (
              <>Next<ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
