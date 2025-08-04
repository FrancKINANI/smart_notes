import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  Bot,
  User,
  Lightbulb,
  BookOpen,
  Target,
  TrendingUp,
  Brain,
  Sparkles,
  MessageSquare,
  FileText,
  HelpCircle,
  Zap,
  Clock,
  Star,
  ChevronDown,
  Mic,
  MicOff,
  Volume2,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "text" | "suggestion" | "explanation" | "quiz" | "summary";
  metadata?: {
    confidence?: number;
    sources?: string[];
    relatedTopics?: string[];
    difficulty?: "beginner" | "intermediate" | "advanced";
  };
}

interface LearningContext {
  currentSubject?: string;
  recentNotes?: string[];
  learningGoals?: string[];
  difficultyLevel?: "beginner" | "intermediate" | "advanced";
  preferredLearningStyle?: "visual" | "auditory" | "kinesthetic" | "reading";
}

interface Suggestion {
  id: string;
  type: "study_plan" | "concept_explanation" | "practice_quiz" | "resource" | "break_reminder";
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  estimatedTime?: number;
  action?: () => void;
}

export default function AdvancedLearningAssistant() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your AI learning assistant. I'm here to help you study more effectively, answer questions, and provide personalized learning recommendations. How can I help you today?",
      timestamp: new Date(),
      type: "text"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"chat" | "tutor" | "quiz" | "explain">("chat");
  const [learningContext, setLearningContext] = useState<LearningContext>({
    difficultyLevel: "intermediate",
    preferredLearningStyle: "visual"
  });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast({
          title: "Speech recognition error",
          description: "Please try again or type your message.",
          variant: "destructive"
        });
      };
    }

    synthesisRef.current = window.speechSynthesis;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current;
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }, [messages]);

  // Generate suggestions based on context
  useEffect(() => {
    generateSuggestions();
  }, [messages, learningContext]);

  const generateSuggestions = () => {
    const newSuggestions: Suggestion[] = [
      {
        id: "study-plan",
        type: "study_plan",
        title: "Create Study Plan",
        description: "Generate a personalized study schedule based on your goals",
        priority: "high",
        estimatedTime: 30
      },
      {
        id: "practice-quiz",
        type: "practice_quiz",
        title: "Practice Quiz",
        description: "Test your knowledge with AI-generated questions",
        priority: "medium",
        estimatedTime: 15
      },
      {
        id: "concept-review",
        type: "concept_explanation",
        title: "Review Key Concepts",
        description: "Get explanations for challenging topics",
        priority: "medium",
        estimatedTime: 10
      }
    ];

    // Add break reminder if user has been studying for a while
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && new Date().getTime() - lastMessage.timestamp.getTime() > 45 * 60 * 1000) {
      newSuggestions.push({
        id: "break-reminder",
        type: "break_reminder",
        title: "Take a Break",
        description: "You've been studying for a while. Time for a short break!",
        priority: "high",
        estimatedTime: 5
      });
    }

    setSuggestions(newSuggestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
      type: "text"
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          context: learningContext,
          mode: selectedMode,
          history: messages.slice(-10) // Send last 10 messages for context
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: Date.now().toString() + "_assistant",
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        type: data.type || "text",
        metadata: data.metadata
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Speak response if enabled
      if (data.shouldSpeak && synthesisRef.current) {
        const utterance = new SpeechSynthesisUtterance(data.response);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        synthesisRef.current.speak(utterance);
      }

    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: Date.now().toString() + "_error",
        role: "assistant",
        content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date(),
        type: "text"
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied to clipboard",
      description: "Message content has been copied.",
    });
  };

  const provideFeedback = (messageId: string, isPositive: boolean) => {
    // Send feedback to improve AI responses
    fetch("/api/ai/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, isPositive })
    });

    toast({
      title: "Feedback received",
      description: "Thank you for helping improve the AI assistant!",
    });
  };

  const getMessageIcon = (type?: string) => {
    switch (type) {
      case "suggestion":
        return <Lightbulb className="h-4 w-4" />;
      case "explanation":
        return <BookOpen className="h-4 w-4" />;
      case "quiz":
        return <HelpCircle className="h-4 w-4" />;
      case "summary":
        return <FileText className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const quickPrompts = [
    "Explain this concept in simple terms",
    "Create a quiz on this topic",
    "Summarize my recent notes",
    "Help me create a study plan",
    "What should I focus on next?",
    "Generate practice questions"
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gradient flex items-center justify-center gap-2">
          <Brain className="h-8 w-8" />
          AI Learning Assistant
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Your personalized AI tutor for enhanced learning
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Chat Interface */}
        <div className="lg:col-span-3 space-y-4">
          {/* Mode Selector */}
          <Card className="card-elevated">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Select value={selectedMode} onValueChange={(value) => setSelectedMode(value as any)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chat">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Chat
                        </div>
                      </SelectItem>
                      <SelectItem value="tutor">
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4" />
                          Tutor
                        </div>
                      </SelectItem>
                      <SelectItem value="quiz">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="h-4 w-4" />
                          Quiz
                        </div>
                      </SelectItem>
                      <SelectItem value="explain">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="h-4 w-4" />
                          Explain
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {learningContext.difficultyLevel}
                  </Badge>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                  <ChevronDown className={cn("h-4 w-4 ml-2 transition-transform", showAdvancedOptions && "rotate-180")} />
                </Button>
              </div>

              {showAdvancedOptions && (
                <div className="mt-4 pt-4 border-t space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Difficulty Level</label>
                      <Select 
                        value={learningContext.difficultyLevel} 
                        onValueChange={(value) => setLearningContext(prev => ({ ...prev, difficultyLevel: value as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Learning Style</label>
                      <Select 
                        value={learningContext.preferredLearningStyle} 
                        onValueChange={(value) => setLearningContext(prev => ({ ...prev, preferredLearningStyle: value as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="visual">Visual</SelectItem>
                          <SelectItem value="auditory">Auditory</SelectItem>
                          <SelectItem value="kinesthetic">Kinesthetic</SelectItem>
                          <SelectItem value="reading">Reading/Writing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat Messages */}
          <Card className="card-elevated">
            <CardContent className="p-0">
              <ScrollArea ref={scrollAreaRef} className="h-96 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-4 w-4 text-primary-600" />
                        </div>
                      )}
                      
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg p-3 space-y-2",
                          message.role === "user"
                            ? "bg-primary-500 text-white"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            {message.type && message.type !== "text" && (
                              <div className="flex items-center gap-1 mb-2">
                                {getMessageIcon(message.type)}
                                <span className="text-xs font-medium capitalize">
                                  {message.type.replace("_", " ")}
                                </span>
                              </div>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>

                        {message.metadata && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {message.metadata.confidence && (
                              <Badge variant="outline" className="text-xs">
                                {Math.round(message.metadata.confidence * 100)}% confident
                              </Badge>
                            )}
                            {message.metadata.difficulty && (
                              <Badge variant="outline" className="text-xs">
                                {message.metadata.difficulty}
                              </Badge>
                            )}
                          </div>
                        )}

                        {message.role === "assistant" && (
                          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyMessage(message.content)}
                              className="h-6 px-2"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => provideFeedback(message.id, true)}
                              className="h-6 px-2"
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => provideFeedback(message.id, false)}
                              className="h-6 px-2"
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {message.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary-600" />
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Quick Prompts */}
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setInput(prompt)}
                className="text-xs"
              >
                {prompt}
              </Button>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask me anything about your studies... (${selectedMode} mode)`}
                disabled={isLoading}
                className="pr-12"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={isListening ? stopListening : startListening}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                disabled={isLoading}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4 text-red-500" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button type="submit" disabled={isLoading || !input.trim()} className="btn-gradient">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* AI Suggestions */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5" />
                Suggestions
              </CardTitle>
              <CardDescription>
                Personalized recommendations for your learning
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                  onClick={suggestion.action}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{suggestion.title}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {suggestion.description}
                      </p>
                      {suggestion.estimatedTime && (
                        <div className="flex items-center gap-1 mt-2">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {suggestion.estimatedTime}m
                          </span>
                        </div>
                      )}
                    </div>
                    <Badge
                      variant={suggestion.priority === "high" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {suggestion.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Learning Progress */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Today's Goal</span>
                  <span>75%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-primary-500 h-2 rounded-full" style={{ width: "75%" }}></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Weekly Streak</span>
                  <span>5 days</span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-4 h-4 rounded-full",
                        i < 5 ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                      )}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Summarize Notes
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <HelpCircle className="h-4 w-4 mr-2" />
                Generate Quiz
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Target className="h-4 w-4 mr-2" />
                Set Study Goal
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Review Schedule
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
