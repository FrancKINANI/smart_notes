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
        title: "Quiz generated successfully",
        description:
          "A new quiz was created from your note. You will be redirected to it.",
      });

      // Navigate to the new quiz
      navigate(`/quizzes/${quiz.id}`);

      return quiz;
    } catch (error) {
      console.error("Quiz generation error:", error);

      // Show error notification with more specific message
      let errorMessage = "Unable to generate the quiz. Please try again.";

      if (error instanceof Error) {
        if (error.message.includes("content")) {
          errorMessage =
            "The note must contain content to generate a quiz.";
        } else if (error.message.includes("quality")) {
          errorMessage =
            "Unable to generate a quality quiz from this note. Try enriching the content.";
        }
      }

      toast({
        title: "Generation failed",
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
