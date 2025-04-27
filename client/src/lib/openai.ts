import { apiRequest } from "./api-client";

export interface EnhanceNoteResult {
  id: number;
  enhancedContent: string;
  summary: string;
}

export async function enhanceNote(noteId: number): Promise<EnhanceNoteResult> {
  const response = await apiRequest(`/api/notes/${noteId}/enhance`, {
    method: "POST",
  });
  return response;
}

export interface QuizGeneration {
  noteId: number;
  userId: number;
  questionCount?: number;
}

export async function generateQuiz(params: QuizGeneration): Promise<any> {
  const response = await apiRequest(`/api/quizzes/generate`, {
    method: "POST",
    body: JSON.stringify(params),
  });
  return response;
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
      `/api/notes/${params.noteId}/generate-flashcards`,
      {
        method: "POST",
        body: JSON.stringify({
          userId: params.userId,
          count: params.count || 5,
        }),
      }
    );
    return response;
  } catch (error) {
    console.error("Erreur lors de la génération des flashcards:", error);
    throw error;
  }
}

export interface TtsRequest {
  text: string;
}

export async function textToSpeech(params: TtsRequest): Promise<void> {
  await apiRequest("/api/tts", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[] = []
): Promise<string> {
  const response = await apiRequest("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
  return response.response;
}
