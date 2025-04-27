import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
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
import { processResponse, ResponseQuality } from "@/lib/spaced-repetition";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api-client";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Flashcards() {
  const { toast } = useToast();
  const [selectedNoteId, setSelectedNoteId] = useState<string>("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

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
      const updated = processResponse(flashcard, quality);
      const response = await apiRequest("PUT", `/api/flashcards/${id}`, {
        interval: updated.interval,
        easeFactor: updated.easeFactor,
        nextReviewDate: updated.nextReviewDate,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Progrès enregistré",
        description: "Votre révision a été enregistrée.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/flashcards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/flashcards/review"] });
      handleNext();
    },
    onError: () => {
      toast({
        title: "Erreur",
        description:
          "Impossible d'enregistrer votre progression. Veuillez réessayer.",
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
        title: "Fin du paquet",
        description: "Vous avez parcouru toutes les cartes de ce paquet.",
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

  // Render flashcard content
  const renderFlashcard = () => {
    if (!currentFlashcards || currentFlashcards.length === 0) {
      return (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500 text-center">
            {activeTab === "review"
              ? "Aucune carte à réviser pour le moment. Revenez plus tard !"
              : "Aucune carte disponible. Créez-en à partir de vos notes !"}
          </p>
        </div>
      );
    }

    const currentCard = currentFlashcards[currentIndex];

    return (
      <div className="flex flex-col items-center">
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
                  Cliquez pour voir la réponse
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
              Je ne savais pas
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResponse(3)}
              className="border-yellow-500 text-yellow-500 hover:bg-yellow-50"
            >
              Difficile
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResponse(4)}
              className="border-green-500 text-green-500 hover:bg-green-50"
            >
              Bien
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResponse(5)}
              className="border-primary-500 text-primary-500 hover:bg-primary-50"
            >
              Parfait
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
            Carte {currentIndex + 1} sur {currentFlashcards.length}
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
      </div>
    );
  };

  return (
    <div className="py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Cartes de révision
          </h1>
          <Button
            onClick={() => setIsFlipped(false)}
            variant="outline"
            size="sm"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Réinitialiser
          </Button>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            setCurrentIndex(0);
            setIsFlipped(false);
          }}
          className="mb-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">Toutes les cartes</TabsTrigger>
            <TabsTrigger value="review">À réviser</TabsTrigger>
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
                  <SelectValue placeholder="Filtrer par note" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les notes</SelectItem>
                  {isLoadingNotes ? (
                    <SelectItem value="loading" disabled>
                      Chargement des notes...
                    </SelectItem>
                  ) : (
                    notes?.map((note: any) => (
                      <SelectItem key={note.id} value={note.id.toString()}>
                        {note.title}
                      </SelectItem>
                    ))
                  )}
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
