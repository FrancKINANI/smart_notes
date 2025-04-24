import { apiRequest } from "./queryClient";

// Note: This file contains client-side helper functions for OpenAI-related features
// The actual API calls are handled on the server side

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

export async function generateFlashcards(params: FlashcardGeneration): Promise<any> {
  const response = await apiRequest(
    "POST", 
    `/api/notes/${params.noteId}/generate-flashcards`, 
    { userId: params.userId, count: params.count || 5 }
  );
  return await response.json();
}

export interface TtsRequest {
  text: string;
}

export async function textToSpeech(params: TtsRequest): Promise<void> {
  await apiRequest("POST", "/api/tts", params);
  // In a real implementation, this would return audio data or a URL
}
