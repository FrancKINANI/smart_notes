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

  // WebSocket setup
  useEffect(() => {
    // Simulate a WebSocket connection (to be replaced by a real implementation)
    const connectWebSocket = () => {
      console.log(`Connecting to WebSocket for session ${sessionId}...`);
      
      // In production, replace with the real WebSocket URL
      // webSocketRef.current = new WebSocket(`wss://your-api-url/study-sessions/${sessionId}`);
      
      // Simulate the WebSocket connection
      setTimeout(() => {
        setIsConnected(true);
        toast({
          title: "Connected to session",
          description: "You joined the real-time study session.",
        });
        
        // Add a system message
        addSystemMessage("You joined the study session");
        
        // Notify the other participants of your arrival
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
    
    // Start the session duration timer
    timerRef.current = setInterval(() => {
      setSessionDuration(prev => prev + 1);
    }, 1000);
    
    // Cleanup on disconnect
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionId, toast, user]);

  // Scroll the chat down when new messages arrive
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Function to send a message
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
    
    // Add the message locally
    setMessages(prev => [...prev, newMessage]);
    
    // Send the message via WebSocket
    broadcastMessage({
      type: "chat",
      message: newMessage,
    });
    
    // Clear the input
    setMessageInput("");
  };

  // Add a system message
  const addSystemMessage = (content: string) => {
    const systemMessage: Message = {
      id: Date.now().toString(),
      senderId: "system",
      senderName: "System",
      content,
      timestamp: new Date(),
      type: "system",
    };
    
    setMessages(prev => [...prev, systemMessage]);
  };

  // Share a resource
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
    
    // Add the resource locally
    setSharedResources(prev => [...prev, newResource]);
    
    // Notify the other participants
    broadcastMessage({
      type: "resource_shared",
      resource: newResource,
    });
    
    // Add a system message
    addSystemMessage(`${user.username} shared: ${resource.title}`);
  };

  // Simulate sending messages via WebSocket
  const broadcastMessage = (data: any) => {
    // In production, use a real WebSocket implementation
    console.log("Broadcasting message:", data);
    
    // Simulate responses based on message type
    if (data.type === "chat") {
      // No need to simulate a response, the message is already added locally
    } else if (data.type === "user_joined") {
      // Simulate adding random users in response to your connection
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
        
        // Add system messages for the random users
        addSystemMessage("Alice joined the study session");
        addSystemMessage("Bob joined the study session");
      }, 2000);
    }
  };

  // Format the duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Leave the session
  const handleLeaveSession = () => {
    // Notify the other participants
    if (user) {
      broadcastMessage({
        type: "user_left",
        userId: user.id,
        username: user.username,
      });
    }
    
    // Close the WebSocket connection
    if (webSocketRef.current) {
      webSocketRef.current.close();
    }
    
    // Stop the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Call the callback if defined
    if (onLeaveSession) {
      onLeaveSession();
    }
  };

  // Toggle audio/video controls
  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };
  
  const toggleVideo = () => {
    setIsVideoOn(prev => !prev);
  };
  
  const toggleScreenShare = () => {
    setIsScreenSharing(prev => !prev);
    
    if (!isScreenSharing) {
      addSystemMessage(`You started sharing your screen`);
    } else {
      addSystemMessage(`You stopped sharing your screen`);
    }
  };

  return (
    <div className="flex flex-col h-[80vh]">
      {/* Session header */}
      <div className="flex items-center justify-between p-4 bg-primary-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-primary-700">
            Live study session
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
            Leave
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main area (video/presentation) */}
        <div className="flex-1 bg-gray-900 p-4 flex items-center justify-center">
          {isScreenSharing ? (
            <div className="text-center">
              <div className="bg-primary-100 p-8 rounded-lg">
                <Share2 className="h-12 w-12 text-primary-500 mx-auto mb-4" />
                <p className="text-primary-700 font-medium">
                  You are sharing your screen
                </p>
              </div>
            </div>
          ) : isVideoOn ? (
            <div className="text-center">
              <div className="bg-primary-100 p-8 rounded-lg">
                <VideoIcon className="h-12 w-12 text-primary-500 mx-auto mb-4" />
                <p className="text-primary-700 font-medium">
                  Your camera is on
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center text-white">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-medium mb-2">
                Collaborative study session
              </h3>
              <p className="text-gray-400 max-w-md">
                Turn on your camera or share your screen to interact with
                the other participants.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar (chat, participants, resources) */}
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
                Resources
              </TabsTrigger>
            </TabsList>

            {/* Chat tab */}
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
                    placeholder="Send a message..."
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

            {/* Participants tab */}
            <TabsContent value="participants" className="h-full">
              <ScrollArea className="h-full p-4">
                <div className="space-y-2">
                  {/* You */}
                  <div className="flex items-center justify-between p-2 bg-primary-50 rounded-md">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary-200 text-primary-700">
                          {user?.username?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user?.username || "You"} (you)</p>
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

                  {/* Other participants */}
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

            {/* Resources tab */}
            <TabsContent value="resources" className="h-full">
              <ScrollArea className="h-full p-4">
                <div className="flex flex-col space-y-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      // Simulate sharing a note
                      shareResource({
                        type: "note",
                        title: "Notes on photosynthesis",
                      });
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Share a note
                  </Button>

                  <Separator />

                  {sharedResources.length === 0 ? (
                    <div className="text-center p-6 text-gray-500">
                      <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>No shared resources yet</p>
                      <p className="text-sm">
                        Share notes or quizzes with your study
                        partners
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
                              Shared by {resource.sharedBy.name}
                            </CardDescription>
                          </CardContent>
                          <CardFooter className="p-3 pt-0 flex justify-end">
                            <Button variant="ghost" size="sm">
                              View
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

      {/* Audio/video controls */}
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