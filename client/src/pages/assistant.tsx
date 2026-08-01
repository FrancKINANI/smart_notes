import { useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Send,
  User,
  Bot,
  Brain,
  Archive,
  BookOpen,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AssistantModal from "@/components/modals/assistant-modal";
import { useModal } from "@/hooks/use-modal";
import { sendChatMessage, ChatMessage } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

export default function Assistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hello! I am your study assistant. How can I help you today?",
      sender: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const assistantModal = useModal();
  const { toast } = useToast();

  // Convert messages to chat history format
  const getChatHistory = (): ChatMessage[] => {
    return messages.map((msg) => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.content,
    }));
  };

  // Handle AI response
  const handleAIResponse = async (
    userMessage: string,
    currentMessages: Message[]
  ) => {
    try {
      setIsLoading(true);
      const history = getChatHistory();
      const response = await sendChatMessage(userMessage, history);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          content: response,
          sender: "assistant",
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Error getting AI response:", error);
      toast({
        title: "Error",
        description:
          "Unable to get a response from the assistant. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // Scroll to bottom after user message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    // Get AI response
    await handleAIResponse(inputValue, [...messages, userMessage]);
  };

  // Handle keyboard submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Open detached mode with current messages
  const openDetachedMode = () => {
    const history = messages
      .map((m) => `${m.sender === "user" ? "You" : "Assistant"}: ${m.content}`)
      .join("\n");
    assistantModal.openAssistantModal(history);
  };

  // Sample suggested questions with better organization
  const suggestedQuestions = [
    {
      category: "Mathematics",
      questions: [
        "Explain the concept of integration by parts",
        "How do you solve a differential equation?",
        "What is the Pythagorean theorem?",
      ],
    },
    {
      category: "Science",
      questions: [
        "How does photosynthesis work?",
        "Explain the theory of relativity",
        "What is the law of conservation of energy?",
      ],
    },
    {
      category: "Computer Science",
      questions: [
        "What are the different data structures?",
        "How does recursion work?",
        "Explain the concept of object-oriented programming",
      ],
    },
  ];

  // Suggested questions logic
  const handleSuggestedQuestionClick = (question: string) => {
    setInputValue(question);
    setTimeout(() => {
      document.querySelector("input")?.focus();
    }, 0);
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Study assistant
          </h1>
          <Button variant="outline" size="sm" onClick={openDetachedMode}>
            <Brain className="mr-2 h-4 w-4" />
            Detached mode
          </Button>
        </div>

        {/* Hide local chat if modal is open */}
        {!assistantModal.isOpen && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Chat section */}
            <Card className="lg:col-span-3">
              <CardHeader className="bg-primary-50">
                <CardTitle className="flex items-center text-primary-700">
                  <Brain className="mr-2 h-5 w-5" />
                  Chat with your assistant
                </CardTitle>
                <CardDescription>
                  Ask questions about your courses, request explanations,
                  or get help with your revision.
                </CardDescription>
              </CardHeader>

              <ScrollArea className="h-[400px] p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.sender === "user"
                          ? "justify-end"
                          : "justify-start"
                      )}
                    >
                      <div className="flex items-start max-w-[80%]">
                        {message.sender === "assistant" && (
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarFallback className="bg-primary-100">
                              <Bot className="h-4 w-4 text-primary-600" />
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div>
                          <div
                            className={cn(
                              "rounded-lg p-3 text-sm",
                              message.sender === "user"
                                ? "bg-blue-600 text-white rounded-tr-none" // Changed to a darker blue
                                : "bg-gray-100 text-gray-900 rounded-tl-none"
                            )}
                          >
                            {message.content.split("\n").map((line, i) => (
                              <p key={i} className={i > 0 ? "mt-2" : ""}>
                                {line}
                              </p>
                            ))}
                          </div>
                          <p
                            className={cn(
                              "mt-1 text-xs text-gray-500",
                              message.sender === "user" ? "text-right" : ""
                            )}
                          >
                            {message.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>

                        {message.sender === "user" && (
                          <Avatar className="h-8 w-8 ml-2">
                            <AvatarFallback className="bg-gray-300">
                              <User className="h-4 w-4 text-gray-600" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <CardFooter className="border-t p-4 bg-gray-50">
                <div className="flex w-full items-center space-x-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isLoading ? "Sending..." : "Send"}
                  </Button>
                </div>
              </CardFooter>
            </Card>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Suggested questions with improved and optimized style */}
              <Card className="overflow-hidden border border-gray-200">
                <CardHeader className="pb-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <HelpCircle className="h-5 w-5 text-primary-600" />
                    <CardTitle className="text-lg font-semibold">
                      Suggested questions
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Tabs
                    defaultValue={suggestedQuestions[0].category.toLowerCase()}
                    className="w-full"
                  >
                    <TabsList className="w-full h-10 bg-muted/50 grid grid-cols-3 mb-0">
                      {suggestedQuestions.map((category) => (
                        <TabsTrigger
                          key={category.category}
                          value={category.category.toLowerCase()}
                          className="text-sm font-medium data-[state=active]:bg-background"
                        >
                          {category.category}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {suggestedQuestions.map((category) => (
                      <TabsContent
                        key={category.category}
                        value={category.category.toLowerCase()}
                        className="mt-0 border-0"
                      >
                        <ScrollArea className="h-[300px] px-1">
                          <div className="space-y-1 p-2">
                            {category.questions.map((question, i) => (
                              <Button
                                key={i}
                                variant="ghost"
                                className="w-full justify-start text-left relative group hover:bg-primary-50/50 transition-colors"
                                onClick={() =>
                                  handleSuggestedQuestionClick(question)
                                }
                              >
                                <div className="flex items-start gap-3 py-1 w-full">
                                  <HelpCircle className="h-4 w-4 text-primary-500 shrink-0 mt-0.5" />
                                  <div className="flex-1 overflow-x-auto no-scrollbar">
                                    <div className="hover:cursor-pointer w-max">
                                      <span className="text-sm text-gray-600 group-hover:text-primary-700 inline-block px-1">
                                        {question}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 px-1">
                                    <Send className="h-3 w-3 text-primary-500" />
                                  </div>
                                </div>
                              </Button>
                            ))}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>

              {/* Tools */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Tools</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-1">
                  <Tabs defaultValue="help">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="help">Help</TabsTrigger>
                      <TabsTrigger value="history">History</TabsTrigger>
                      <TabsTrigger value="topics">Topics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="help" className="mt-2">
                      <div className="text-sm text-gray-500 space-y-2">
                        <p>Your assistant can help you with:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Concept explanations</li>
                          <li>Problem solving</li>
                          <li>Summary creation</li>
                          <li>Exam preparation</li>
                        </ul>
                      </div>
                    </TabsContent>

                    <TabsContent value="history" className="mt-2">
                      <div className="text-sm text-gray-500">
                        <p className="mb-2">Recent conversations:</p>
                        <div className="space-y-1">
                          {/* Recent conversations will be loaded dynamically */}
                          <p className="text-center text-gray-400 py-2">
                            No recent conversation
                          </p>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="topics" className="mt-2">
                      <div className="text-sm text-gray-500">
                        <p className="mb-2">Popular topics:</p>
                        <div className="space-y-1">
                          {suggestedQuestions.map((category) => (
                            <Button
                              key={category.category}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                            >
                              <BookOpen className="mr-2 h-3 w-3" />
                              {category.category}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* The global modal is already mounted in App.tsx */}
      <AssistantModal
        isOpen={assistantModal.isOpen}
        onClose={assistantModal.close}
      />
    </div>
  );
}
