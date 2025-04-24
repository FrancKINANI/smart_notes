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
        questionCount: 5
      });
      
      // Update cache
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
      
      // Show success notification
      toast({
        title: "Quiz generated",
        description: "Your quiz has been created successfully.",
      });
      
      // Navigate to the new quiz
      navigate(`/quizzes/${quiz.id}`);
      
      return quiz;
    } catch (error) {
      console.error("Quiz generation error:", error);
      
      // Show error notification
      toast({
        title: "Generation failed",
        description: "We couldn't generate a quiz from this note. Please try again.",
        variant: "destructive"
      });
      
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateQuizFromNote,
    isGenerating
  };
}
