import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Users,
  Send,
  VideoIcon,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageSquare,
  BookOpen,
  FileText,
  Share2,
  Clock,
  User,
} from "lucide-react";

interface Participant {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  isStreaming?: boolean;
  isMuted?: boolean;
  isSpeaking?: boolean;
  isScreenSharing?: boolean;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: "text" | "file" | "system";
}

interface SharedResource {
  id: string;
  type: "document" | "note" | "quiz" | "whiteboard";
  title: string;
  sharedBy: {
    id: string;
    name: string;
  };
  url?: string;
}

interface StudySessionProps {
  groupId: string;
  sessionId: string;
  initialParticipants?: Participant[];
  onLeaveSession?: () => void;
}

export function RealTimeStudySession({
  groupId,
  sessionId,
  initialParticipants = [],
  onLeaveSession,
}: StudySessionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [sharedResources, setSharedResources] = useState<SharedResource[]>([]);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Configuration de la websocket
  useEffect(() => {
    // Simuler une connexion WebSocket (à remplacer par une véritable implémentation)
    const connectWebSocket = () => {
      console.log(`Connecting to WebSocket for session ${sessionId}...`);
      
      // En production, remplacer par la véritable URL WebSocket
      // webSocketRef.current = new WebSocket(`wss://your-api-url/study-sessions/${sessionId}`);
      
      // Simulation de la connexion WebSocket
      setTimeout(() => {
        setIsConnected(true);
        toast({
          title: "Connecté à la session",
          description: "Vous avez rejoint la session d'étude en temps réel.",
        });
        
        // Ajouter un message système
        addSystemMessage("Vous avez rejoint la session d'étude");
        
        // Informer les autres participants de votre arrivée
        if (user) {
          broadcastMessage({
            type: "user_joined",
            userId: user.id,
            username: user.username,
          });
        }
      }, 1000);
    };
    
    connectWebSocket();
    
    // Démarrer le timer pour la durée de session
    timerRef.current = setInterval(() => {
      setSessionDuration(prev => prev + 1);
    }, 1000);
    
    // Nettoyage à la déconnexion
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionId, toast, user]);

  // Faire défiler le chat vers le bas lorsque de nouveaux messages arrivent
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Fonction pour envoyer un message
  const sendMessage = () => {
    if (!messageInput.trim() || !user) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: user.id,
      senderName: user.username,
      content: messageInput,
      timestamp: new Date(),
      type: "text",
    };
    
    // Ajouter le message localement
    setMessages(prev => [...prev, newMessage]);
    
    // Envoyer le message via WebSocket
    broadcastMessage({
      type: "chat",
      message: newMessage,
    });
    
    // Effacer l'input
    setMessageInput("");
  };

  // Ajouter un message système
  const addSystemMessage = (content: string) => {
    const systemMessage: Message = {
      id: Date.now().toString(),
      senderId: "system",
      senderName: "Système",
      content,
      timestamp: new Date(),
      type: "system",
    };
    
    setMessages(prev => [...prev, systemMessage]);
  };

  // Partager une ressource
  const shareResource = (resource: Omit<SharedResource, "id" | "sharedBy">) => {
    if (!user) return;
    
    const newResource: SharedResource = {
      id: Date.now().toString(),
      ...resource,
      sharedBy: {
        id: user.id,
        name: user.username,
      },
    };
    
    // Ajouter la ressource localement
    setSharedResources(prev => [...prev, newResource]);
    
    // Informer les autres participants
    broadcastMessage({
      type: "resource_shared",
      resource: newResource,
    });
    
    // Ajouter un message système
    addSystemMessage(`${user.username} a partagé : ${resource.title}`);
  };

  // Simuler l'envoi de messages via WebSocket
  const broadcastMessage = (data: any) => {
    // En production, utiliser une véritable implémentation WebSocket
    console.log("Broadcasting message:", data);
    
    // Simuler des réponses basées sur le type de message
    if (data.type === "chat") {
      // Pas besoin de simuler une réponse, le message est déjà ajouté localement
    } else if (data.type === "user_joined") {
      // Simuler l'ajout d'utilisateurs aléatoires en réponse à votre connexion
      setTimeout(() => {
        const randomUsers = [
          {
            id: "user1",
            username: "alice.study",
            displayName: "Alice",
            isStreaming: false,
            isMuted: true,
          },
          {
            id: "user2",
            username: "bob.learn",
            displayName: "Bob",
            isStreaming: false,
            isMuted: true,
          },
        ];
        
        setParticipants(prev => [...prev, ...randomUsers]);
        
        // Ajouter des messages système pour les utilisateurs aléatoires
        addSystemMessage("Alice a rejoint la session d'étude");
        addSystemMessage("Bob a rejoint la session d'étude");
      }, 2000);
    }
  };

  // Formater la durée
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Quitter la session
  const handleLeaveSession = () => {
    // Informer les autres participants
    if (user) {
      broadcastMessage({
        type: "user_left",
        userId: user.id,
        username: user.username,
      });
    }
    
    // Fermer la connexion WebSocket
    if (webSocketRef.current) {
      webSocketRef.current.close();
    }
    
    // Arrêter le timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Appeler le callback si défini
    if (onLeaveSession) {
      onLeaveSession();
    }
  };

  // Toggle des contrôles audio/vidéo
  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };
  
  const toggleVideo = () => {
    setIsVideoOn(prev => !prev);
  };
  
  const toggleScreenShare = () => {
    setIsScreenSharing(prev => !prev);
    
    if (!isScreenSharing) {
      addSystemMessage(`Vous avez commencé à partager votre écran`);
    } else {
      addSystemMessage(`Vous avez arrêté de partager votre écran`);
    }
  };

  return (
    <div className="flex flex-col h-[80vh]">
      {/* En-tête de session */}
      <div className="flex items-center justify-between p-4 bg-primary-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-primary-700">
            Session d'étude en direct
          </h2>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-primary-600 hidden sm:flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            <span>{formatDuration(sessionDuration)}</span>
          </div>
          <div className="text-sm text-primary-600 hidden sm:block">
            <span>{participants.length} participants</span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleLeaveSession}
          >
            <PhoneOff className="h-4 w-4 mr-2" />
            Quitter
          </Button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* Zone principale (vidéo/présentation) */}
        <div className="flex-1 bg-gray-900 p-4 flex items-center justify-center">
          {isScreenSharing ? (
            <div className="text-center">
              <div className="bg-primary-100 p-8 rounded-lg">
                <Share2 className="h-12 w-12 text-primary-500 mx-auto mb-4" />
                <p className="text-primary-700 font-medium">
                  Vous partagez votre écran
                </p>
              </div>
            </div>
          ) : isVideoOn ? (
            <div className="text-center">
              <div className="bg-primary-100 p-8 rounded-lg">
                <VideoIcon className="h-12 w-12 text-primary-500 mx-auto mb-4" />
                <p className="text-primary-700 font-medium">
                  Votre caméra est activée
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center text-white">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-medium mb-2">
                Session d'étude collaborative
              </h3>
              <p className="text-gray-400 max-w-md">
                Activez votre caméra ou partagez votre écran pour interagir avec
                les autres participants.
              </p>
            </div>
          )}
        </div>

        {/* Barre latérale (chat, participants, ressources) */}
        <div className="w-80 border-l flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="chat" className="flex-1">
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="participants" className="flex-1">
                <Users className="h-4 w-4 mr-2" />
                Participants
              </TabsTrigger>
              <TabsTrigger value="resources" className="flex-1">
                <BookOpen className="h-4 w-4 mr-2" />
                Ressources
              </TabsTrigger>
            </TabsList>

            {/* Onglet Chat */}
            <TabsContent value="chat" className="flex-1 flex flex-col h-full">
              <ScrollArea
                ref={chatAreaRef}
                className="flex-1 p-4 space-y-4"
              >
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.type === "system"
                        ? "justify-center"
                        : message.senderId === user?.id
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    {message.type === "system" ? (
                      <div className="bg-gray-100 text-gray-600 text-xs py-1 px-3 rounded-full">
                        {message.content}
                      </div>
                    ) : (
                      <div
                        className={`flex items-start max-w-[80%] ${
                          message.senderId === user?.id ? "flex-row-reverse" : ""
                        }`}
                      >
                        {message.senderId !== user?.id && (
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarFallback>
                              {message.senderName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div>
                          <div
                            className={`p-3 rounded-lg ${
                              message.senderId === user?.id
                                ? "bg-primary-500 text-white"
                                : "bg-gray-100"
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                          </div>
                          <p
                            className={`text-xs text-gray-500 mt-1 ${
                              message.senderId === user?.id ? "text-right" : ""
                            }`}
                          >
                            {message.senderId !== user?.id && (
                              <span className="font-medium mr-1">
                                {message.senderName}
                              </span>
                            )}
                            {message.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </ScrollArea>
              <div className="p-4 border-t">
                <div className="flex space-x-2">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Envoyer un message..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <Button onClick={sendMessage} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Onglet Participants */}
            <TabsContent value="participants" className="h-full">
              <ScrollArea className="h-full p-4">
                <div className="space-y-2">
                  {/* Vous */}
                  <div className="flex items-center justify-between p-2 bg-primary-50 rounded-md">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary-200 text-primary-700">
                          {user?.username?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user?.username || "Vous"} (vous)</p>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      {isScreenSharing && (
                        <div className="text-primary-600 p-1">
                          <Share2 className="h-4 w-4" />
                        </div>
                      )}
                      {isVideoOn ? (
                        <div className="text-green-600 p-1">
                          <Video className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="text-gray-400 p-1">
                          <VideoOff className="h-4 w-4" />
                        </div>
                      )}
                      {isMuted ? (
                        <div className="text-gray-400 p-1">
                          <MicOff className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="text-green-600 p-1">
                          <Mic className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Autres participants */}
                  {participants
                    .filter((p) => p.id !== user?.id)
                    .map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md"
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback>
                              {participant.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {participant.displayName || participant.username}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          {participant.isScreenSharing && (
                            <div className="text-primary-600 p-1">
                              <Share2 className="h-4 w-4" />
                            </div>
                          )}
                          {participant.isStreaming ? (
                            <div className="text-green-600 p-1">
                              <Video className="h-4 w-4" />
                            </div>
                          ) : (
                            <div className="text-gray-400 p-1">
                              <VideoOff className="h-4 w-4" />
                            </div>
                          )}
                          {participant.isMuted ? (
                            <div className="text-gray-400 p-1">
                              <MicOff className="h-4 w-4" />
                            </div>
                          ) : (
                            <div className="text-green-600 p-1">
                              <Mic className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Onglet Ressources */}
            <TabsContent value="resources" className="h-full">
              <ScrollArea className="h-full p-4">
                <div className="flex flex-col space-y-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      // Simuler le partage d'une note
                      shareResource({
                        type: "note",
                        title: "Notes sur la photosynthèse",
                      });
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Partager une note
                  </Button>

                  <Separator />

                  {sharedResources.length === 0 ? (
                    <div className="text-center p-6 text-gray-500">
                      <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>Aucune ressource partagée pour le moment</p>
                      <p className="text-sm">
                        Partagez des notes ou des quiz avec vos partenaires
                        d'étude
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sharedResources.map((resource) => (
                        <Card key={resource.id}>
                          <CardHeader className="p-3 pb-0">
                            <CardTitle className="text-sm font-medium flex items-center">
                              {resource.type === "document" && (
                                <FileText className="h-4 w-4 mr-2 text-blue-500" />
                              )}
                              {resource.type === "note" && (
                                <FileText className="h-4 w-4 mr-2 text-green-500" />
                              )}
                              {resource.type === "quiz" && (
                                <FileText className="h-4 w-4 mr-2 text-purple-500" />
                              )}
                              {resource.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-1">
                            <CardDescription className="text-xs flex items-center mt-1">
                              <User className="h-3 w-3 mr-1" />
                              Partagé par {resource.sharedBy.name}
                            </CardDescription>
                          </CardContent>
                          <CardFooter className="p-3 pt-0 flex justify-end">
                            <Button variant="ghost" size="sm">
                              Voir
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Contrôles audio/vidéo */}
      <div className="p-4 bg-white border-t flex items-center justify-center space-x-4">
        <Button
          variant={isMuted ? "outline" : "default"}
          size="icon"
          className="rounded-full h-12 w-12"
          onClick={toggleMute}
        >
          {isMuted ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>
        <Button
          variant={isVideoOn ? "default" : "outline"}
          size="icon"
          className="rounded-full h-12 w-12"
          onClick={toggleVideo}
        >
          {isVideoOn ? (
            <Video className="h-5 w-5" />
          ) : (
            <VideoOff className="h-5 w-5" />
          )}
        </Button>
        <Button
          variant={isScreenSharing ? "default" : "outline"}
          size="icon"
          className="rounded-full h-12 w-12"
          onClick={toggleScreenShare}
        >
          <Share2 className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
} 