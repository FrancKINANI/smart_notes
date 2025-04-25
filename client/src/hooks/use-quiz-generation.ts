import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { generateQuiz } from "@/lib/openai";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

export function useQuizGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  const generateQuizFromNote = async (noteId: number, userId: number) => {
    setIsGenerating(true);

    try {
      // Call API to generate quiz
      const quiz = await generateQuiz({
        noteId,
        userId,
        questionCount: 5,
      });

      // Update cache
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });

      // Show success notification
      toast({
        title: "Quiz généré avec succès",
        description:
          "Un nouveau quiz a été créé à partir de votre note. Vous allez être redirigé vers celui-ci.",
      });

      // Navigate to the new quiz
      navigate(`/quizzes/${quiz.id}`);

      return quiz;
    } catch (error) {
      console.error("Quiz generation error:", error);

      // Show error notification with more specific message
      let errorMessage = "Impossible de générer le quiz. Veuillez réessayer.";

      if (error instanceof Error) {
        if (error.message.includes("contenu")) {
          errorMessage =
            "La note doit contenir du contenu pour générer un quiz.";
        } else if (error.message.includes("qualité")) {
          errorMessage =
            "Impossible de générer un quiz de qualité à partir de cette note. Essayez d'enrichir le contenu.";
        }
      }

      toast({
        title: "Échec de la génération",
        description: errorMessage,
        variant: "destructive",
      });

      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateQuizFromNote,
    isGenerating,
  };
}
