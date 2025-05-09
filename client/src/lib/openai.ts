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
    console.error('Erreur lors de la communication avec l\'API OpenAI:', error);
    throw new Error("Impossible de générer une réponse. Veuillez réessayer.");
  }
}

export async function generateContextualExplanation(
  concept: string,
  userContext: UserContext,
  options: GenerationOptions = {}
): Promise<string> {
  const systemPrompt = `Tu es un assistant pédagogique expert. Explique le concept suivant en 
  l'adaptant au niveau et au style d'apprentissage de l'utilisateur. Utilise des exemples pertinents
  par rapport à ses intérêts et domaines d'études. Concentre-toi particulièrement sur les liens
  avec ce qu'il connaît déjà et ce qu'il trouve difficile.`;

  const contextSummary = createUserContextSummary(userContext);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Concept à expliquer: ${concept}\n\nContexte de l'utilisateur: ${contextSummary}` }
  ];

  try {
    const response = await axios.post('/api/ai/generate', {
      messages,
      options: { ...options, temperature: options.temperature || 0.5 }
    });

    return response.data.content;
  } catch (error) {
    console.error('Erreur lors de la génération d\'explication contextuelle:', error);
    throw new Error("Impossible de générer une explication. Veuillez réessayer.");
  }
}

export async function generatePersonalizedSummary(
  noteContent: string,
  userContext: UserContext,
  options: GenerationOptions = {}
): Promise<string> {
  const systemPrompt = `Tu es un assistant spécialisé dans les résumés personnalisés. 
  Crée un résumé concis mais complet du contenu fourni. Adapte ton résumé aux forces, 
  faiblesses et préférences d'apprentissage de l'utilisateur. Souligne les points clés qui 
  correspondent aux centres d'intérêt de l'utilisateur et simplifie les concepts qu'il trouve 
  habituellement difficiles.`;

  const contextSummary = createUserContextSummary(userContext);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Contenu à résumer: ${noteContent}\n\nContexte de l'utilisateur: ${contextSummary}` }
  ];

  try {
    const response = await axios.post('/api/ai/generate', {
      messages,
      options: { ...options, temperature: options.temperature || 0.3 }
    });

    return response.data.content;
  } catch (error) {
    console.error('Erreur lors de la génération du résumé personnalisé:', error);
    throw new Error("Impossible de générer un résumé. Veuillez réessayer.");
  }
}

export async function generateStudyPlan(
  topic: string,
  duration: string,
  userContext: UserContext,
  options: GenerationOptions = {}
): Promise<any> {
  const systemPrompt = `Tu es un expert en plans d'étude personnalisés. Crée un plan d'étude 
  détaillé pour le sujet demandé, adapté au profil d'apprentissage, aux forces et aux faiblesses 
  de l'utilisateur. Le plan doit inclure des ressources recommandées, des exercices pratiques, 
  et un calendrier réaliste sur la durée spécifiée. Prends en compte les contraintes de temps 
  et le niveau de connaissance actuel de l'utilisateur.`;

  const contextSummary = createUserContextSummary(userContext);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Sujet: ${topic}\nDurée: ${duration}\n\nContexte de l'utilisateur: ${contextSummary}` }
  ];

  try {
    const response = await axios.post('/api/ai/generate', {
      messages,
      options: { ...options, temperature: options.temperature || 0.4 }
    });

    return {
      title: `Plan d'étude: ${topic}`,
      duration: duration,
      content: response.data.content,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Erreur lors de la génération du plan d\'étude:', error);
    throw new Error("Impossible de générer un plan d'étude. Veuillez réessayer.");
  }
}

function createUserContextSummary(context: UserContext): string {
  let summary = "Profil de l'utilisateur:\n";

  if (context.learningPreferences) {
    summary += "- Préférences d'apprentissage: ";
    if (context.learningPreferences.preferredLearningStyle) {
      summary += `Style préféré: ${context.learningPreferences.preferredLearningStyle}. `;
    }
    if (context.learningPreferences.difficultyPreference) {
      summary += `Préfère les défis: ${context.learningPreferences.difficultyPreference}. `;
    }
    if (context.learningPreferences.focusAreas && context.learningPreferences.focusAreas.length > 0) {
      summary += `Domaines d'intérêt: ${context.learningPreferences.focusAreas.join(', ')}.`;
    }
    summary += "\n";
  }

  if (context.performanceMetrics) {
    summary += "- Performances: ";
    if (context.performanceMetrics.strongAreas && context.performanceMetrics.strongAreas.length > 0) {
      summary += `Points forts: ${context.performanceMetrics.strongAreas.join(', ')}. `;
    }
    if (context.performanceMetrics.weakAreas && context.performanceMetrics.weakAreas.length > 0) {
      summary += `Points à améliorer: ${context.performanceMetrics.weakAreas.join(', ')}.`;
    }
    summary += "\n";
  }

  if (context.notes && context.notes.length > 0) {
    summary += "- Notes récentes: ";
    const recentNotes = context.notes.slice(0, 3).map(note => note.title);
    summary += recentNotes.join(', ');
    summary += "\n";
  }

  if (context.quizResults && context.quizResults.length > 0) {
    summary += "- Performances récentes aux quiz: ";
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
  const systemPrompt = `Tu es un expert en analyse de contenu éducatif. Identifie et liste 
  les concepts clés présents dans le texte fourni. Concentre-toi uniquement sur les concepts 
  importants, les théories, les termes techniques, et les idées principales. Retourne le résultat 
  sous forme de liste de concepts.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Analyse le contenu suivant et extrais les concepts clés:\n\n${content}` }
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
    console.error('Erreur lors de l\'extraction des concepts clés:', error);
    throw new Error("Impossible d'extraire les concepts clés. Veuillez réessayer.");
  }
}

export async function generateComprehensionQuestions(
  content: string,
  difficulty: "easy" | "medium" | "hard" = "medium",
  count: number = 3,
  options: GenerationOptions = {}
): Promise<Array<{ question: string, answer: string }>> {
  const systemPrompt = `Tu es un expert en évaluation éducative. Génère ${count} questions de 
  compréhension de niveau "${difficulty}" basées sur le contenu fourni. Pour chaque question, 
  fournis également la réponse correcte. Les questions doivent être précises, claires et 
  directement liées au contenu.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Contenu à évaluer:\n\n${content}` }
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
    console.error('Erreur lors de la génération des questions:', error);
    throw new Error("Impossible de générer des questions. Veuillez réessayer.");
  }
}

function parseQuestionsAndAnswers(text: string): Array<{ question: string, answer: string }> {
  const result: Array<{ question: string, answer: string }> = [];
  
  const patterns = [
    /Q\d+\.\s*(.*?)\s*\n\s*R\d+\.\s*(.*?)(?=\n\s*Q\d+\.|\n\s*$|$)/gs,
    /Question\s*\d+\s*:\s*(.*?)\s*\n\s*Réponse\s*:\s*(.*?)(?=\n\s*Question\s*\d+\s*:|\n\s*$|$)/gs,
    /\d+\.\s*(.*?)\s*\n\s*Réponse\s*:\s*(.*?)(?=\n\s*\d+\.|\n\s*$|$)/gs
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
        if (answerLine.toLowerCase().includes('réponse')) {
          answer = answerLine.replace(/^.*?éponse\s*:?\s*/i, '');
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
