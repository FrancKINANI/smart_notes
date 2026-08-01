import { apiRequest } from "./api-client";
import axios from 'axios';

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
    console.error("Error generating flashcards:", error);
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
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface UserContext {
  notes?: Array<{
    title: string;
    content: string;
    tags?: string[];
    createdAt: Date;
  }>;
  quizResults?: Array<{
    score: number;
    topic: string;
    date: Date;
  }>;
  learningPreferences?: {
    preferredLearningStyle?: "visual" | "auditory" | "reading" | "kinesthetic";
    difficultyPreference?: "easy" | "medium" | "hard";
    focusAreas?: string[];
  };
  performanceMetrics?: {
    strongAreas: string[];
    weakAreas: string[];
  };
}

export async function sendChatMessage(
  userMessage: string,
  history: ChatMessage[],
  options: GenerationOptions = {}
): Promise<string> {
  const defaultOptions = {
    temperature: 0.7,
    maxTokens: 1000,
    model: "gpt-3.5-turbo",
  };

  const settings = { ...defaultOptions, ...options };

  try {
    const response = await axios.post('/api/ai/chat', {
      message: userMessage,
      history,
      options: settings
    });

    return response.data.reply;
  } catch (error) {
    console.error('Error communicating with the OpenAI API:', error);
    throw new Error("Unable to generate a response. Please try again.");
  }
}

export async function generateContextualExplanation(
  concept: string,
  userContext: UserContext,
  options: GenerationOptions = {}
): Promise<string> {
  const systemPrompt = `You are an expert educational assistant. Explain the following concept by 
  adapting it to the user's level and learning style. Use examples that are relevant
  to their interests and fields of study. Focus especially on the connections
  with what they already know and what they find difficult.`;

  const contextSummary = createUserContextSummary(userContext);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Concept to explain: ${concept}\n\nUser context: ${contextSummary}` }
  ];

  try {
    const response = await axios.post('/api/ai/generate', {
      messages,
      options: { ...options, temperature: options.temperature || 0.5 }
    });

    return response.data.content;
  } catch (error) {
    console.error('Error generating contextual explanation:', error);
    throw new Error("Unable to generate an explanation. Please try again.");
  }
}

export async function generatePersonalizedSummary(
  noteContent: string,
  userContext: UserContext,
  options: GenerationOptions = {}
): Promise<string> {
  const systemPrompt = `You are an assistant specialized in personalized summaries. 
  Create a concise but complete summary of the provided content. Adapt your summary to the user's 
  strengths, weaknesses and learning preferences. Highlight the key points that 
  match the user's interests and simplify the concepts they usually find difficult.`;

  const contextSummary = createUserContextSummary(userContext);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Content to summarize: ${noteContent}\n\nUser context: ${contextSummary}` }
  ];

  try {
    const response = await axios.post('/api/ai/generate', {
      messages,
      options: { ...options, temperature: options.temperature || 0.3 }
    });

    return response.data.content;
  } catch (error) {
    console.error('Error generating personalized summary:', error);
    throw new Error("Unable to generate a summary. Please try again.");
  }
}

export async function generateStudyPlan(
  topic: string,
  duration: string,
  userContext: UserContext,
  options: GenerationOptions = {}
): Promise<any> {
  const systemPrompt = `You are an expert in personalized study plans. Create a detailed study plan 
  for the requested topic, tailored to the user's learning profile, strengths and weaknesses. 
  The plan must include recommended resources, practical exercises, 
  and a realistic schedule over the specified duration. Take into account the user's time 
  constraints and current level of knowledge.`;

  const contextSummary = createUserContextSummary(userContext);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Topic: ${topic}\nDuration: ${duration}\n\nUser context: ${contextSummary}` }
  ];

  try {
    const response = await axios.post('/api/ai/generate', {
      messages,
      options: { ...options, temperature: options.temperature || 0.4 }
    });

    return {
      title: `Study plan: ${topic}`,
      duration: duration,
      content: response.data.content,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating study plan:', error);
    throw new Error("Unable to generate a study plan. Please try again.");
  }
}

function createUserContextSummary(context: UserContext): string {
  let summary = "User profile:\n";

  if (context.learningPreferences) {
    summary += "- Learning preferences: ";
    if (context.learningPreferences.preferredLearningStyle) {
      summary += `Preferred style: ${context.learningPreferences.preferredLearningStyle}. `;
    }
    if (context.learningPreferences.difficultyPreference) {
      summary += `Prefers challenges: ${context.learningPreferences.difficultyPreference}. `;
    }
    if (context.learningPreferences.focusAreas && context.learningPreferences.focusAreas.length > 0) {
      summary += `Areas of interest: ${context.learningPreferences.focusAreas.join(', ')}.`;
    }
    summary += "\n";
  }

  if (context.performanceMetrics) {
    summary += "- Performance: ";
    if (context.performanceMetrics.strongAreas && context.performanceMetrics.strongAreas.length > 0) {
      summary += `Strengths: ${context.performanceMetrics.strongAreas.join(', ')}. `;
    }
    if (context.performanceMetrics.weakAreas && context.performanceMetrics.weakAreas.length > 0) {
      summary += `Areas to improve: ${context.performanceMetrics.weakAreas.join(', ')}.`;
    }
    summary += "\n";
  }

  if (context.notes && context.notes.length > 0) {
    summary += "- Recent notes: ";
    const recentNotes = context.notes.slice(0, 3).map(note => note.title);
    summary += recentNotes.join(', ');
    summary += "\n";
  }

  if (context.quizResults && context.quizResults.length > 0) {
    summary += "- Recent quiz results: ";
    const recentQuizzes = context.quizResults.slice(0, 3).map(quiz => 
      `${quiz.topic} (${quiz.score}%)`
    );
    summary += recentQuizzes.join(', ');
    summary += "\n";
  }

  return summary;
}

export async function extractKeyConcepts(
  content: string,
  options: GenerationOptions = {}
): Promise<string[]> {
  const systemPrompt = `You are an expert in educational content analysis. Identify and list 
  the key concepts present in the provided text. Focus only on the important concepts, 
  theories, technical terms, and main ideas. Return the result 
  as a list of concepts.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Analyze the following content and extract the key concepts:\n\n${content}` }
  ];

  try {
    const response = await axios.post('/api/ai/generate', {
      messages,
      options: { ...options, temperature: 0.3 }
    });

    const conceptsText = response.data.content;
    const concepts = conceptsText
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^[-•*]\s*/, '').trim());

    return concepts;
  } catch (error) {
    console.error('Error extracting key concepts:', error);
    throw new Error("Unable to extract the key concepts. Please try again.");
  }
}

export async function generateComprehensionQuestions(
  content: string,
  difficulty: "easy" | "medium" | "hard" = "medium",
  count: number = 3,
  options: GenerationOptions = {}
): Promise<Array<{ question: string, answer: string }>> {
  const systemPrompt = `You are an expert in educational assessment. Generate ${count} comprehension 
  questions at "${difficulty}" level based on the provided content. For each question, 
  also provide the correct answer. The questions must be precise, clear and 
  directly related to the content.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Content to assess:\n\n${content}` }
  ];

  try {
    const response = await axios.post('/api/ai/generate', {
      messages,
      options: { ...options, temperature: 0.5 }
    });

    const text = response.data.content;
    const questionsAndAnswers = parseQuestionsAndAnswers(text);
    
    return questionsAndAnswers.slice(0, count);
  } catch (error) {
    console.error('Error generating questions:', error);
    throw new Error("Unable to generate questions. Please try again.");
  }
}

function parseQuestionsAndAnswers(text: string): Array<{ question: string, answer: string }> {
  const result: Array<{ question: string, answer: string }> = [];
  
  const patterns = [
    /Q\d+\.\s*(.*?)\s*\n\s*A\d+\.\s*(.*?)(?=\n\s*Q\d+\.|\n\s*$|$)/gs,
    /Question\s*\d+\s*:\s*(.*?)\s*\n\s*Answer\s*:\s*(.*?)(?=\n\s*Question\s*\d+\s*:|\n\s*$|$)/gs,
    /\d+\.\s*(.*?)\s*\n\s*Answer\s*:\s*(.*?)(?=\n\s*\d+\.|\n\s*$|$)/gs
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1] && match[2]) {
        result.push({
          question: match[1].trim(),
          answer: match[2].trim()
        });
      }
    }
    
    if (result.length > 0) {
      break;
    }
  }
  
  if (result.length === 0) {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    for (let i = 0; i < lines.length - 1; i += 2) {
      const questionLine = lines[i];
      const answerLine = lines[i + 1] || "";
      
      if (questionLine.includes('?') || 
          questionLine.match(/^\d+\./) || 
          questionLine.toLowerCase().includes('question')) {
        let answer = answerLine;
        if (answerLine.toLowerCase().includes('answer')) {
          answer = answerLine.replace(/^.*?answer\s*:?\s*/i, '');
        }
        
        result.push({
          question: questionLine.replace(/^\d+\.\s*/, '').trim(),
          answer: answer.trim()
        });
      }
    }
  }
  
  return result;
}
