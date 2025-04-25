import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mic, Send, Image, Paperclip, X, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { sendChatMessage, ChatMessage } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

interface AssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent?: string;
}

export default function AssistantModal({
  isOpen,
  onClose,
  initialContent,
}: AssistantModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Initialize messages with initial content
  useEffect(() => {
    if (isOpen) {
      const initialMessages: Message[] = [
        {
          id: "1",
          content:
            "Bonjour ! Je suis votre assistant d'étude. Comment puis-je vous aider aujourd'hui ?",
          sender: "assistant",
          timestamp: new Date(),
        },
      ];

      if (initialContent) {
        initialMessages.push({
          id: "2",
          content: initialContent,
          sender: "user",
          timestamp: new Date(),
        });
      }

      setMessages(initialMessages);

      if (initialContent) {
        // Respond to initial content
        handleAIResponse(initialContent, initialMessages);
      }
    }
  }, [isOpen, initialContent]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

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
        title: "Erreur",
        description:
          "Impossible d'obtenir une réponse de l'assistant. Veuillez réessayer.",
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 h-[80vh] max-h-[600px] flex flex-col overflow-hidden">
        <DialogHeader className="bg-primary-700 px-4 py-3 sm:px-6 text-white">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white">Assistant d'étude</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-primary-200 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.sender === "user" ? "justify-end" : "justify-start"
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
                          ? "bg-blue-600 text-white rounded-tr-none"
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

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tapez votre message..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
            >
              <Send className="h-4 w-4 mr-1" />
              <span className="sr-only md:not-sr-only md:ml-1">
                {isLoading ? "Envoi..." : "Envoyer"}
              </span>
            </Button>
          </div>

          <div className="mt-2 flex space-x-2">
            <Button variant="outline" size="sm" disabled>
              <Mic className="h-4 w-4 mr-1" /> Audio
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Image className="h-4 w-4 mr-1" /> Image
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Paperclip className="h-4 w-4 mr-1" /> Fichier
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
