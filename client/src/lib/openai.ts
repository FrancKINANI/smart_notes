import { apiRequest } from "./queryClient";

export interface EnhanceNoteResult {
  id: number;
  enhancedContent: string;
  summary: string;
}

export async function enhanceNote(noteId: number): Promise<EnhanceNoteResult> {
  const response = await apiRequest("POST", `/api/notes/${noteId}/enhance`, {});
  return await response.json();
}

export interface QuizGeneration {
  noteId: number;
  userId: number;
  questionCount?: number;
}

export async function generateQuiz(params: QuizGeneration): Promise<any> {
  const response = await apiRequest("POST", `/api/quizzes/generate`, params);
  return await response.json();
}

export interface FlashcardGeneration {
  noteId: number;
  userId: number;
  count?: number;
}

interface FlashcardResponse {
  id: number;
  noteId: number;
  userId: number;
  front: string;
  back: string;
  nextReviewDate: string;
  interval: number;
  easeFactor: number;
}

export async function generateFlashcards(
  params: FlashcardGeneration
): Promise<FlashcardResponse[]> {
  try {
    const response = await apiRequest(
      "POST",
      `/api/notes/${params.noteId}/generate-flashcards`,
      {
        userId: params.userId,
        count: params.count || 5,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message || "Erreur lors de la génération des flashcards"
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Erreur lors de la génération des flashcards:", error);
    throw error;
  }
}

export interface TtsRequest {
  text: string;
}

export async function textToSpeech(params: TtsRequest): Promise<void> {
  await apiRequest("POST", "/api/tts", params);
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[] = []
): Promise<string> {
  const response = await apiRequest("POST", "/api/chat", {
    message,
    history,
  });

  if (!response.ok) {
    throw new Error("Failed to get AI response");
  }

  const data = await response.json();
  return data.response;
}
