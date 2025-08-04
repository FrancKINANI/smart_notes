import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Users,
  MessageSquare,
  Video,
  Share2,
  Crown,
  UserPlus,
  Settings,
  Bell,
  BellOff,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  ScreenShare,
  Hand,
  Clock,
  Target,
  BookOpen,
  Brain,
  Trophy,
  Star,
  Send,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  MapPin,
  Globe,
  Lock,
  Zap,
  TrendingUp,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  subject: string;
  memberCount: number;
  isPrivate: boolean;
  createdAt: Date;
  nextSession?: Date;
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  language: string;
  timezone: string;
}

interface GroupMember {
  id: string;
  name: string;
  avatar?: string;
  role: "owner" | "moderator" | "member";
  status: "online" | "away" | "busy" | "offline";
  joinedAt: Date;
  studyStreak: number;
  contributionScore: number;
}

interface StudySession {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  duration: number;
  type: "lecture" | "discussion" | "quiz" | "review" | "project";
  participants: string[];
  materials: string[];
  isRecording: boolean;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: Date;
  type: "text" | "file" | "poll" | "quiz" | "announcement";
  reactions?: { emoji: string; users: string[] }[];
}

export default function EnhancedStudyGroups() {
  const { toast } = useToast();
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [isInSession, setIsInSession] = useState(false);
  const [sessionSettings, setSessionSettings] = useState({
    micEnabled: true,
    cameraEnabled: false,
    screenShare: false,
    notifications: true
  });

  const [studyGroups] = useState<StudyGroup[]>([
    {
      id: "1",
      name: "Advanced Mathematics Study Circle",
      description: "Collaborative learning for calculus and linear algebra",
      subject: "Mathematics",
      memberCount: 24,
      isPrivate: false,
      createdAt: new Date("2024-01-15"),
      nextSession: new Date("2024-08-05T14:00:00"),
      tags: ["calculus", "linear-algebra", "problem-solving"],
      difficulty: "advanced",
      language: "English",
      timezone: "UTC"
    },
    {
      id: "2",
      name: "Computer Science Fundamentals",
      description: "Learning programming concepts together",
      subject: "Computer Science",
      memberCount: 18,
      isPrivate: false,
      createdAt: new Date("2024-02-01"),
      nextSession: new Date("2024-08-05T16:30:00"),
      tags: ["programming", "algorithms", "data-structures"],
      difficulty: "intermediate",
      language: "English",
      timezone: "UTC"
    },
    {
      id: "3",
      name: "French Language Exchange",
      description: "Practice French conversation and grammar",
      subject: "Languages",
      memberCount: 12,
      isPrivate: true,
      createdAt: new Date("2024-03-10"),
      tags: ["french", "conversation", "grammar"],
      difficulty: "beginner",
      language: "French",
      timezone: "CET"
    }
  ]);

  const [groupMembers] = useState<GroupMember[]>([
    {
      id: "1",
      name: "Alice Johnson",
      avatar: "/avatars/alice.jpg",
      role: "owner",
      status: "online",
      joinedAt: new Date("2024-01-15"),
      studyStreak: 15,
      contributionScore: 95
    },
    {
      id: "2",
      name: "Bob Smith",
      role: "moderator",
      status: "online",
      joinedAt: new Date("2024-01-20"),
      studyStreak: 8,
      contributionScore: 78
    },
    {
      id: "3",
      name: "Carol Davis",
      role: "member",
      status: "away",
      joinedAt: new Date("2024-02-01"),
      studyStreak: 12,
      contributionScore: 82
    }
  ]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      userId: "1",
      userName: "Alice Johnson",
      content: "Welcome everyone! Let's start today's session with a quick review of yesterday's topics.",
      timestamp: new Date(),
      type: "announcement"
    },
    {
      id: "2",
      userId: "2",
      userName: "Bob Smith",
      content: "Great! I have some questions about the integration techniques we covered.",
      timestamp: new Date(),
      type: "text"
    }
  ]);

  const [newMessage, setNewMessage] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const filteredGroups = studyGroups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         group.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         group.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSubject = filterSubject === "all" || group.subject === filterSubject;
    const matchesDifficulty = filterDifficulty === "all" || group.difficulty === filterDifficulty;
    
    return matchesSearch && matchesSubject && matchesDifficulty;
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      userId: "current-user",
      userName: "You",
      content: newMessage,
      timestamp: new Date(),
      type: "text"
    };

    setChatMessages(prev => [...prev, message]);
    setNewMessage("");
  };

  const startStudySession = () => {
    setIsInSession(true);
    toast({
      title: "Study session started! 🎯",
      description: "You're now in a live study session with your group.",
    });
  };

  const endStudySession = () => {
    setIsInSession(false);
    toast({
      title: "Study session ended",
      description: "Great work! Session summary will be available shortly.",
    });
  };

  const joinGroup = (groupId: string) => {
    toast({
      title: "Joined group! 🎉",
      description: "You're now a member of this study group.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "away": return "bg-yellow-500";
      case "busy": return "bg-red-500";
      default: return "bg-gray-400";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "bg-green-100 text-green-800";
      case "intermediate": return "bg-yellow-100 text-yellow-800";
      case "advanced": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (selectedGroup) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Group Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setSelectedGroup(null)}>
              ← Back to Groups
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{selectedGroup.name}</h1>
              <p className="text-gray-600 dark:text-gray-300">{selectedGroup.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isInSession ? (
              <Button onClick={endStudySession} variant="destructive">
                End Session
              </Button>
            ) : (
              <Button onClick={startStudySession} className="btn-gradient">
                <Video className="h-4 w-4 mr-2" />
                Start Session
              </Button>
            )}
            <Button variant="outline">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Session Controls (when in session) */}
        {isInSession && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge className="bg-green-500 text-white">
                    <Activity className="h-3 w-3 mr-1" />
                    Live Session
                  </Badge>
                  <span className="text-sm text-green-700 dark:text-green-300">
                    3 participants • 25:30 elapsed
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSessionSettings(prev => ({ ...prev, micEnabled: !prev.micEnabled }))}
                    className={sessionSettings.micEnabled ? "" : "bg-red-100 text-red-700"}
                  >
                    {sessionSettings.micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSessionSettings(prev => ({ ...prev, cameraEnabled: !prev.cameraEnabled }))}
                    className={sessionSettings.cameraEnabled ? "" : "bg-red-100 text-red-700"}
                  >
                    {sessionSettings.cameraEnabled ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="sm">
                    <ScreenShare className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Hand className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="materials">Materials</TabsTrigger>
                <TabsTrigger value="sessions">Sessions</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <div className="text-2xl font-bold">{selectedGroup.memberCount}</div>
                      <div className="text-sm text-gray-600">Members</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Calendar className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <div className="text-2xl font-bold">12</div>
                      <div className="text-sm text-gray-600">Sessions</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                      <div className="text-2xl font-bold">85%</div>
                      <div className="text-sm text-gray-600">Avg Score</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Group Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Subject</label>
                        <p>{selectedGroup.subject}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Difficulty</label>
                        <Badge className={getDifficultyColor(selectedGroup.difficulty)}>
                          {selectedGroup.difficulty}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Language</label>
                        <p>{selectedGroup.language}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Timezone</label>
                        <p>{selectedGroup.timezone}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Tags</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedGroup.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="chat" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Group Chat</CardTitle>
                    <CardDescription>
                      Communicate with your study group members
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea ref={chatScrollRef} className="h-96 p-4">
                      <div className="space-y-4">
                        {chatMessages.map((message) => (
                          <div key={message.id} className="flex gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={message.userAvatar} />
                              <AvatarFallback>
                                {message.userName.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{message.userName}</span>
                                <span className="text-xs text-gray-500">
                                  {message.timestamp.toLocaleTimeString()}
                                </span>
                                {message.type === "announcement" && (
                                  <Badge variant="secondary" className="text-xs">
                                    Announcement
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm mt-1">{message.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your message..."
                          onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                        />
                        <Button onClick={handleSendMessage} size="sm">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="materials">
                <Card>
                  <CardHeader>
                    <CardTitle>Study Materials</CardTitle>
                    <CardDescription>
                      Shared resources and documents
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No materials shared yet</p>
                      <Button className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Upload Material
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sessions">
                <Card>
                  <CardHeader>
                    <CardTitle>Study Sessions</CardTitle>
                    <CardDescription>
                      Scheduled and past study sessions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No sessions scheduled</p>
                      <Button className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Schedule Session
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Members */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Members ({groupMembers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {groupMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>
                          {member.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
                        getStatusColor(member.status)
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-sm truncate">{member.name}</span>
                        {member.role === "owner" && <Crown className="h-3 w-3 text-yellow-500" />}
                        {member.role === "moderator" && <Star className="h-3 w-3 text-blue-500" />}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{member.studyStreak} day streak</span>
                        <span>•</span>
                        <span>{member.contributionScore} pts</span>
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full" size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Members
                </Button>
              </CardContent>
            </Card>

            {/* Next Session */}
            {selectedGroup.nextSession && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Next Session
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">Advanced Calculus Review</p>
                    <p className="text-sm text-gray-600">
                      {selectedGroup.nextSession.toLocaleDateString()} at{" "}
                      {selectedGroup.nextSession.toLocaleTimeString()}
                    </p>
                    <Button className="w-full btn-gradient" size="sm">
                      Join Session
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Group Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Group Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Active Members</span>
                  <span className="font-medium">18/24</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Avg Session Length</span>
                  <span className="font-medium">45 min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Completion Rate</span>
                  <span className="font-medium">92%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Group Score</span>
                  <span className="font-medium">85%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Study Groups</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Join collaborative learning communities
          </p>
        </div>
        <Button onClick={() => setShowCreateGroup(true)} className="btn-gradient">
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                <SelectItem value="Mathematics">Mathematics</SelectItem>
                <SelectItem value="Computer Science">Computer Science</SelectItem>
                <SelectItem value="Languages">Languages</SelectItem>
                <SelectItem value="Science">Science</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.map((group) => (
          <Card key={group.id} className="card-elevated hover:shadow-xl transition-all duration-300 cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {group.description}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  {group.isPrivate ? (
                    <Lock className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Globe className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{group.subject}</Badge>
                <Badge className={getDifficultyColor(group.difficulty)}>
                  {group.difficulty}
                </Badge>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {group.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {group.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{group.tags.length - 3}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {group.memberCount} members
                </div>
                {group.nextSession && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Next: {group.nextSession.toLocaleDateString()}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => setSelectedGroup(group)}
                  className="flex-1"
                  variant="outline"
                >
                  View Details
                </Button>
                <Button 
                  onClick={() => joinGroup(group.id)}
                  className="flex-1 btn-gradient"
                >
                  Join Group
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredGroups.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No groups found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Try adjusting your search criteria or create a new group.
            </p>
            <Button onClick={() => setShowCreateGroup(true)} className="btn-gradient">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Group
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
