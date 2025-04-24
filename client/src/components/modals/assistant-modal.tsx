import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mic, Send, Image, Paperclip, X, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface AssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AssistantModal({ isOpen, onClose }: AssistantModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Bonjour ! Je suis votre assistant d'étude. Comment puis-je vous aider aujourd'hui ?",
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);
  
  // Send message
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    // Simulate assistant response
    setTimeout(() => {
      // In a real application, this would make an API call to get a response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: getAssistantResponse(inputValue),
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 1000);
  };
  
  // Simple assistant response logic (would be replaced with API call)
  const getAssistantResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('bonjour') || lowerQuery.includes('salut')) {
      return "Bonjour ! Comment puis-je vous aider avec vos études aujourd'hui ?";
    } else if (lowerQuery.includes('intégration par parties')) {
      return "L'intégration par parties est une technique utilisée pour calculer des intégrales en transformant un produit de fonctions.\n\nLa formule est : ∫u(x)v'(x)dx = u(x)v(x) - ∫v(x)u'(x)dx\n\nCette méthode est particulièrement utile lorsqu'on a un produit de fonctions où l'une serait facile à intégrer et l'autre facile à dériver.\n\nVoulez-vous un exemple concret d'application ?";
    } else if (lowerQuery.includes('merci')) {
      return "De rien ! N'hésitez pas si vous avez d'autres questions.";
    } else {
      return "Je ne suis pas sûr de comprendre votre question. Pourriez-vous la reformuler ou me donner plus de détails ?";
    }
  };
  
  // Format timestamp
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Handle keyboard submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
                  message.sender === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div className="flex items-start max-w-[80%]">
                  {message.sender === 'assistant' && (
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
                        message.sender === 'user' 
                          ? "bg-primary-600 text-white rounded-tr-none" 
                          : "bg-primary-50 text-gray-900 rounded-tl-none"
                      )}
                    >
                      {message.content.split('\n').map((line, i) => (
                        <p key={i} className={i > 0 ? "mt-2" : ""}>{line}</p>
                      ))}
                    </div>
                    <p className={cn(
                      "mt-1 text-xs text-gray-500",
                      message.sender === 'user' ? "text-right" : ""
                    )}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                  
                  {message.sender === 'user' && (
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
            />
            <Button onClick={handleSendMessage} disabled={!inputValue.trim()}>
              <Send className="h-4 w-4 mr-1" />
              <span className="sr-only md:not-sr-only md:ml-1">Envoyer</span>
            </Button>
          </div>
          
          <div className="mt-2 flex space-x-2">
            <Button variant="outline" size="sm">
              <Mic className="h-4 w-4 mr-1" /> Audio
            </Button>
            <Button variant="outline" size="sm">
              <Image className="h-4 w-4 mr-1" /> Image
            </Button>
            <Button variant="outline" size="sm">
              <Paperclip className="h-4 w-4 mr-1" /> Fichier
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
