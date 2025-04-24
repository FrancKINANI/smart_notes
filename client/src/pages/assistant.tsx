import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, User, Bot, Brain, Archive, BookOpen, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import AssistantModal from "@/components/modals/assistant-modal";
import { useModal } from "@/hooks/use-modal";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

export default function Assistant() {
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
  const assistantModal = useModal();
  
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
      
      // Scroll to bottom
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 1000);
  };
  
  // Simple assistant response logic (would be replaced with API call)
  const getAssistantResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('bonjour') || lowerQuery.includes('salut')) {
      return "Bonjour ! Comment puis-je vous aider avec vos études aujourd'hui ?";
    } else if (lowerQuery.includes('mathématiques') || lowerQuery.includes('math')) {
      return "Je peux vous aider avec les mathématiques ! Quel concept spécifique vous intéresse ? Algèbre, calcul, géométrie, probabilités ?";
    } else if (lowerQuery.includes('biologie')) {
      return "La biologie est fascinante ! Je peux vous aider sur divers sujets comme la cellule, la génétique, l'écologie, ou la physiologie humaine. Que voulez-vous explorer ?";
    } else if (lowerQuery.includes('merci')) {
      return "De rien ! N'hésitez pas si vous avez d'autres questions.";
    } else {
      return "Je ne suis pas sûr de comprendre votre question. Pourriez-vous la reformuler ou me donner plus de détails sur ce que vous cherchez à apprendre ?";
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
  
  // Sample suggested questions
  const suggestedQuestions = [
    "Explique-moi le concept d'intégration par parties",
    "Comment fonctionne la photosynthèse ?",
    "Quelles sont les différentes structures de données ?",
    "Peux-tu m'aider à comprendre la théorie de la relativité ?"
  ];
  
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Assistant d'étude</h1>
          <Button variant="outline" size="sm" onClick={assistantModal.open}>
            <Brain className="mr-2 h-4 w-4" />
            Mode détaché
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat section */}
          <Card className="lg:col-span-3">
            <CardHeader className="bg-primary-50">
              <CardTitle className="flex items-center text-primary-700">
                <Brain className="mr-2 h-5 w-5" />
                Discutez avec votre assistant
              </CardTitle>
              <CardDescription>
                Posez des questions sur vos cours, demandez des explications, ou obtenez de l'aide pour vos révisions.
              </CardDescription>
            </CardHeader>
            
            <ScrollArea className="h-[400px] p-4">
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
            
            <CardFooter className="border-t p-4 bg-gray-50">
              <div className="flex w-full items-center space-x-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tapez votre message..."
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} disabled={!inputValue.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer
                </Button>
              </div>
            </CardFooter>
          </Card>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Suggested questions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Questions suggérées</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-1">
                {suggestedQuestions.map((question, i) => (
                  <Button 
                    key={i} 
                    variant="ghost" 
                    className="justify-start h-auto py-1.5 px-2 text-left text-sm"
                    onClick={() => {
                      setInputValue(question);
                      setTimeout(() => {
                        document.querySelector('input')?.focus();
                      }, 0);
                    }}
                  >
                    <HelpCircle className="mr-2 h-4 w-4 text-primary-500" />
                    {question}
                  </Button>
                ))}
              </CardContent>
            </Card>
            
            {/* Tools */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Outils</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-1">
                <Tabs defaultValue="help">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="help">Aide</TabsTrigger>
                    <TabsTrigger value="history">Historique</TabsTrigger>
                    <TabsTrigger value="topics">Sujets</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="help" className="mt-2">
                    <div className="text-sm text-gray-500 space-y-2">
                      <p>
                        Votre assistant peut vous aider avec:
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Explications de concepts</li>
                        <li>Résolution de problèmes</li>
                        <li>Création de résumés</li>
                        <li>Préparation d'examens</li>
                      </ul>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="history" className="mt-2">
                    <div className="text-sm text-gray-500">
                      <p className="mb-2">Conversations récentes:</p>
                      <div className="space-y-1">
                        <Button variant="ghost" size="sm" className="w-full justify-start">
                          <Archive className="mr-2 h-3 w-3" />
                          Mathématiques - 15/05/2023
                        </Button>
                        <Button variant="ghost" size="sm" className="w-full justify-start">
                          <Archive className="mr-2 h-3 w-3" />
                          Biologie - 12/05/2023
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="topics" className="mt-2">
                    <div className="text-sm text-gray-500">
                      <p className="mb-2">Sujets populaires:</p>
                      <div className="space-y-1">
                        <Button variant="ghost" size="sm" className="w-full justify-start">
                          <BookOpen className="mr-2 h-3 w-3" />
                          Mathématiques
                        </Button>
                        <Button variant="ghost" size="sm" className="w-full justify-start">
                          <BookOpen className="mr-2 h-3 w-3" />
                          Sciences
                        </Button>
                        <Button variant="ghost" size="sm" className="w-full justify-start">
                          <BookOpen className="mr-2 h-3 w-3" />
                          Langues
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <AssistantModal
        isOpen={assistantModal.isOpen}
        onClose={assistantModal.close}
      />
    </div>
  );
}
