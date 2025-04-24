import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { processResponse, ResponseQuality } from "@/lib/spaced-repetition";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

export default function Flashcards() {
  const { toast } = useToast();
  const [selectedNoteId, setSelectedNoteId] = useState<string>("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  const userId = 1; // Default user ID for demo
  
  // Fetch all flashcards
  const { data: flashcards, isLoading: isLoadingFlashcards } = useQuery({
    queryKey: ["/api/flashcards", { userId, noteId: selectedNoteId !== "all" ? selectedNoteId : undefined }],
    queryFn: () => {
      const url = `/api/flashcards?userId=${userId}${selectedNoteId !== "all" ? `&noteId=${selectedNoteId}` : ''}`;
      return fetch(url).then(res => res.json());
    }
  });
  
  // Fetch flashcards due for review
  const { data: reviewFlashcards, isLoading: isLoadingReview } = useQuery({
    queryKey: ["/api/flashcards/review", { userId }],
    queryFn: () => fetch(`/api/flashcards/review?userId=${userId}`).then(res => res.json()),
    enabled: activeTab === "review"
  });
  
  // Fetch notes for filtering
  const { data: notes, isLoading: isLoadingNotes } = useQuery({
    queryKey: ["/api/notes", { userId }],
    queryFn: () => fetch(`/api/notes?userId=${userId}`).then(res => res.json())
  });
  
  // Update flashcard mutation
  const updateFlashcardMutation = useMutation({
    mutationFn: async ({ id, quality }: { id: number, quality: ResponseQuality }) => {
      const flashcard = flashcards.find((card: any) => card.id === id);
      
      if (!flashcard) throw new Error("Flashcard not found");
      
      // Apply spaced repetition algorithm
      const updated = processResponse(flashcard, quality);
      
      const response = await apiRequest("PUT", `/api/flashcards/${id}`, {
        interval: updated.interval,
        easeFactor: updated.easeFactor,
        nextReviewDate: updated.nextReviewDate
      });
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Progress saved",
        description: "Your flashcard review has been recorded.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/flashcards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/flashcards/review"] });
      
      // Move to next card
      handleNext();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save your progress. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Get current set of flashcards based on active tab
  const currentFlashcards = activeTab === "review" ? reviewFlashcards : flashcards;
  
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
      // Loop back to the first card if we're at the end
      setCurrentIndex(0);
      toast({
        title: "End of deck",
        description: "You've gone through all flashcards in this deck.",
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
      // Loop to the last card if we're at the beginning
      setCurrentIndex(currentFlashcards.length - 1);
    }
  };
  
  // Handle recording response quality
  const handleResponse = (quality: ResponseQuality) => {
    if (!currentFlashcards || currentFlashcards.length === 0) return;
    
    const currentCard = currentFlashcards[currentIndex];
    updateFlashcardMutation.mutate({ id: currentCard.id, quality });
  };
  
  // Render flashcard content
  const renderFlashcard = () => {
    if (!currentFlashcards || currentFlashcards.length === 0) {
      return (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500 text-center">
            {activeTab === "review" 
              ? "No flashcards due for review. Check back later!" 
              : "No flashcards available. Create some from your notes!"}
          </p>
        </div>
      );
    }
    
    const currentCard = currentFlashcards[currentIndex];
    
    return (
      <div className="flex flex-col items-center">
        <Card 
          className={`w-full max-w-md h-64 cursor-pointer transition-all duration-500 ${isFlipped ? 'bg-primary-50' : 'bg-white'}`}
          onClick={handleFlip}
        >
          <CardContent className="flex items-center justify-center h-full p-6">
            <div className="text-center">
              <p className="text-lg font-medium">
                {isFlipped ? currentCard.back : currentCard.front}
              </p>
              {!isFlipped && (
                <p className="text-sm text-gray-500 mt-4">Click to reveal answer</p>
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
              className="border-red-500 text-red-500"
            >
              Did not know
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleResponse(3)}
              className="border-yellow-500 text-yellow-500"
            >
              Difficult
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleResponse(4)}
              className="border-green-500 text-green-500"
            >
              Good
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleResponse(5)}
              className="border-primary-500 text-primary-500"
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
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <p className="text-sm text-gray-500">
            {currentIndex + 1} / {currentFlashcards.length}
          </p>
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Cartes de révision</h1>
          <Button onClick={() => setIsFlipped(false)} variant="outline" size="sm">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          setCurrentIndex(0);
          setIsFlipped(false);
        }} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">All Flashcards</TabsTrigger>
            <TabsTrigger value="review">Due for Review</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            <div className="mb-6">
              <Select 
                value={selectedNoteId} 
                onValueChange={(value) => {
                  setSelectedNoteId(value);
                  setCurrentIndex(0);
                  setIsFlipped(false);
                }}
              >
                <SelectTrigger className="w-full sm:w-[300px]">
                  <SelectValue placeholder="Filter by note" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Notes</SelectItem>
                  {isLoadingNotes ? (
                    <SelectItem value="loading" disabled>Loading notes...</SelectItem>
                  ) : notes?.map((note: any) => (
                    <SelectItem key={note.id} value={note.id.toString()}>
                      {note.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {isLoadingFlashcards ? (
              <div className="flex justify-center">
                <Skeleton className="w-full max-w-md h-64" />
              </div>
            ) : (
              renderFlashcard()
            )}
          </TabsContent>
          
          <TabsContent value="review">
            {isLoadingReview ? (
              <div className="flex justify-center">
                <Skeleton className="w-full max-w-md h-64" />
              </div>
            ) : (
              renderFlashcard()
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
