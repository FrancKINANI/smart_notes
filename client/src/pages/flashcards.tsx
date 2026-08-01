import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  processResponse, 
  ResponseQuality, 
  getLearningStats,
  generateOptimalReviewSchedule, 
  predictConceptDifficulty 
} from "@/lib/spaced-repetition";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api-client";
import { ChevronLeft, ChevronRight, RotateCcw, Clock, BarChart4, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { LearningStatsCard } from "@/components/learning-stats";

export default function Flashcards() {
  const { toast } = useToast();
  const [selectedNoteId, setSelectedNoteId] = useState<string>("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [showStats, setShowStats] = useState(false);
  const [answerStartTime, setAnswerStartTime] = useState<number | null>(null);

  const userId = 1; // Default user ID for demo

  // Fetch all flashcards
  const { data: flashcards, isLoading: isLoadingFlashcards } = useQuery({
    queryKey: [
      "/api/flashcards",
      { userId, noteId: selectedNoteId !== "all" ? selectedNoteId : undefined },
    ],
    queryFn: () => {
      const url = `/api/flashcards?userId=${userId}${
        selectedNoteId !== "all" ? `&noteId=${selectedNoteId}` : ""
      }`;
      return fetch(url).then((res) => res.json());
    },
  });

  // Fetch flashcards due for review
  const { data: reviewFlashcards, isLoading: isLoadingReview } = useQuery({
    queryKey: ["/api/flashcards/review", { userId }],
    queryFn: () =>
      fetch(`/api/flashcards/review?userId=${userId}`).then((res) =>
        res.json()
      ),
    enabled: activeTab === "review",
  });

  // Fetch notes for filtering
  const { data: notes, isLoading: isLoadingNotes } = useQuery({
    queryKey: ["/api/notes", { userId }],
    queryFn: () =>
      fetch(`/api/notes?userId=${userId}`).then((res) => res.json()),
  });

  // Start the stopwatch when the card is flipped
  useEffect(() => {
    if (isFlipped) {
      setAnswerStartTime(Date.now());
    } else {
      setAnswerStartTime(null);
    }
  }, [isFlipped]);

  // Update flashcard mutation
  const updateFlashcardMutation = useMutation({
    mutationFn: async ({
      id,
      quality,
    }: {
      id: number;
      quality: ResponseQuality;
    }) => {
      const flashcard = flashcards.find((card: any) => card.id === id);
      if (!flashcard) throw new Error("Flashcard not found");
      
      // Compute the response time in seconds
      const timeToAnswer = answerStartTime 
        ? Math.round((Date.now() - answerStartTime) / 1000) 
        : undefined;
        
      const updated = processResponse(flashcard, quality, timeToAnswer);
      const response = await apiRequest("PUT", `/api/flashcards/${id}`, {
        interval: updated.interval,
        easeFactor: updated.easeFactor,
        nextReviewDate: updated.nextReviewDate,
        responseHistory: updated.responseHistory,
        reviewDates: updated.reviewDates,
        timeToAnswer: updated.timeToAnswer,
        difficulty: updated.difficulty,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Progress saved",
        description: "Your review has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/flashcards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/flashcards/review"] });
      handleNext();
    },
    onError: () => {
      toast({
        title: "Error",
        description:
          "Unable to save your progress. Please try again.",
        variant: "destructive",
      });
    },
  });

  const currentFlashcards =
    activeTab === "review" ? reviewFlashcards : flashcards;

  // Handle flipping the card
  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  // Handle moving to next card
  const handleNext = () => {
    if (!currentFlashcards || currentFlashcards.length === 0) return;

    setIsFlipped(false);
    if (currentIndex < currentFlashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
      toast({
        title: "End of deck",
        description: "You have gone through all the cards in this deck.",
      });
    }
  };

  // Handle moving to previous card
  const handlePrevious = () => {
    if (!currentFlashcards || currentFlashcards.length === 0) return;

    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(currentFlashcards.length - 1);
    }
  };

  // Handle recording response quality
  const handleResponse = (quality: ResponseQuality) => {
    if (!currentFlashcards || currentFlashcards.length === 0) return;

    const currentCard = currentFlashcards[currentIndex];
    updateFlashcardMutation.mutate({ id: currentCard.id, quality });
  };
  
  // Compute the stats of the current card
  const getCurrentCardStats = () => {
    if (!currentFlashcards || currentFlashcards.length === 0) return null;
    
    const currentCard = currentFlashcards[currentIndex];
    if (!currentCard) return null;
    
    return getLearningStats(currentCard);
  };
  
  // Predict the concept difficulty
  const getConceptDifficulty = () => {
    if (!currentFlashcards || currentFlashcards.length === 0) return "Unknown";
    
    const currentCard = currentFlashcards[currentIndex];
    const difficulty = predictConceptDifficulty(
      currentCard.front + " " + currentCard.back, 
      flashcards
    );
    
    if (difficulty < 0.3) return "Easy";
    if (difficulty < 0.7) return "Medium";
    return "Hard";
  };

  // Toggle statistics view
  const toggleStats = () => {
    setShowStats(!showStats);
  };

  // Render flashcard content
  const renderFlashcard = () => {
    if (!currentFlashcards || currentFlashcards.length === 0) {
      return (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500 text-center">
            {activeTab === "review"
              ? "No cards to review right now. Come back later!"
              : "No cards available. Create some from your notes!"}
          </p>
        </div>
      );
    }

    const currentCard = currentFlashcards[currentIndex];
    const stats = getCurrentCardStats();
    const conceptDifficulty = getConceptDifficulty();

    return (
      <div className="flex flex-col items-center">
        {/* Estimated difficulty badge */}
        <div className="self-end mb-2">
          <span className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", 
            conceptDifficulty === "Easy" ? "bg-green-100 text-green-800" :
            conceptDifficulty === "Medium" ? "bg-yellow-100 text-yellow-800" :
            "bg-red-100 text-red-800"
          )}>
            {conceptDifficulty}
          </span>
        </div>
        
        <Card
          className={cn(
            "w-full max-w-md h-64 cursor-pointer select-none",
            "transition-all duration-500 ease-in-out transform perspective-1000",
            isFlipped && "rotate-y-180",
            "hover:shadow-lg",
            isFlipped ? "bg-primary-50" : "bg-white"
          )}
          onClick={handleFlip}
        >
          <CardContent
            className={cn(
              "flex items-center justify-center h-full p-6",
              "transition-opacity duration-300",
              isFlipped && "backface-hidden"
            )}
          >
            <div className="text-center">
              <p className="text-lg font-medium">
                {isFlipped ? currentCard.back : currentCard.front}
              </p>
              {!isFlipped && (
                <p className="text-sm text-gray-500 mt-4">
                  Click to see the answer
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {isFlipped && activeTab === "review" && (
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResponse(0)}
              className="border-red-500 text-red-500 hover:bg-red-50"
            >
              I didn't know
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResponse(3)}
              className="border-yellow-500 text-yellow-500 hover:bg-yellow-50"
            >
              Hard
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResponse(4)}
              className="border-green-500 text-green-500 hover:bg-green-50"
            >
              Good
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResponse(5)}
              className="border-primary-500 text-primary-500 hover:bg-primary-50"
            >
              Perfect
            </Button>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between w-full max-w-md">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevious}
            className="hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <p className="text-sm text-gray-500">
            Card {currentIndex + 1} of {currentFlashcards.length}
          </p>

          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            className="hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Stopwatch during review */}
        {isFlipped && answerStartTime && (
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-1" />
            <span id="timer">
              {Math.round((Date.now() - answerStartTime) / 1000)}s
            </span>
          </div>
        )}
        
        {/* Statistics display */}
        {showStats && stats && (
          <div className="mt-8 w-full max-w-md">
            <LearningStatsCard stats={stats} title="Stats for this card" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Flashcards</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleStats}
              className={cn(showStats && "bg-primary-50")}
            >
              <BarChart4 className="h-4 w-4 mr-2" />
              {showStats ? "Hide stats" : "View stats"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Reset the state
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restart
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value);
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <TabsList>
                <TabsTrigger value="all">All cards</TabsTrigger>
                <TabsTrigger value="review">To review</TabsTrigger>
              </TabsList>

              {activeTab === "all" && (
                <div className="w-full sm:w-auto">
                  <Select
                    value={selectedNoteId}
                    onValueChange={(value) => {
                      setSelectedNoteId(value);
                      setCurrentIndex(0);
                      setIsFlipped(false);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Filter by note" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All notes</SelectItem>
                      {!isLoadingNotes &&
                        notes?.map((note: any) => (
                          <SelectItem key={note.id} value={note.id.toString()}>
                            {note.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <TabsContent value="all">
              {isLoadingFlashcards ? (
                <div className="w-full max-w-md mx-auto">
                  <Skeleton className="h-64 w-full rounded-lg" />
                </div>
              ) : (
                renderFlashcard()
              )}
            </TabsContent>

            <TabsContent value="review">
              {isLoadingReview ? (
                <div className="w-full max-w-md mx-auto">
                  <Skeleton className="h-64 w-full rounded-lg" />
                </div>
              ) : (
                renderFlashcard()
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
