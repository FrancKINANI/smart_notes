import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Play,
  Pause,
  Square,
  SkipForward,
  RotateCcw,
  Timer,
  Brain,
  Target,
  Zap,
  Volume2,
  VolumeX,
  Settings,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Coffee,
  BookOpen,
  Lightbulb,
  Focus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface StudySessionProps {
  noteId?: number;
  flashcardIds?: number[];
  mode?: 'pomodoro' | 'flashcards' | 'reading' | 'mixed';
}

interface PomodoroSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
}

interface StudyStats {
  totalTime: number;
  completedSessions: number;
  correctAnswers: number;
  totalAnswers: number;
  focusScore: number;
}

export default function EnhancedStudySession({ 
  noteId, 
  flashcardIds = [], 
  mode = 'pomodoro' 
}: StudySessionProps) {
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes default
  const [currentSession, setCurrentSession] = useState(1);
  const [sessionType, setSessionType] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoStartBreaks, setAutoStartBreaks] = useState(false);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);
  const [studyMode, setStudyMode] = useState<'focus' | 'active' | 'review'>(mode === 'pomodoro' ? 'focus' : 'active');
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettings>({
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsUntilLongBreak: 4
  });

  const [studyStats, setStudyStats] = useState<StudyStats>({
    totalTime: 0,
    completedSessions: 0,
    correctAnswers: 0,
    totalAnswers: 0,
    focusScore: 85
  });

  // Timer logic
  useEffect(() => {
    if (isActive && !isPaused && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            handleSessionComplete();
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isPaused, timeLeft]);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('/sounds/notification.mp3');
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const playNotificationSound = () => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  };

  const handleSessionComplete = () => {
    playNotificationSound();
    setIsActive(false);
    setIsPaused(false);
    
    if (sessionType === 'work') {
      setCompletedPomodoros(prev => prev + 1);
      setStudyStats(prev => ({
        ...prev,
        completedSessions: prev.completedSessions + 1,
        totalTime: prev.totalTime + pomodoroSettings.workDuration * 60
      }));
      
      // Determine next session type
      const nextSessionType = (completedPomodoros + 1) % pomodoroSettings.sessionsUntilLongBreak === 0 
        ? 'longBreak' 
        : 'shortBreak';
      
      setSessionType(nextSessionType);
      setTimeLeft(nextSessionType === 'longBreak' 
        ? pomodoroSettings.longBreakDuration * 60 
        : pomodoroSettings.shortBreakDuration * 60
      );
      
      toast({
        title: "Work session completed! 🎉",
        description: `Time for a ${nextSessionType === 'longBreak' ? 'long' : 'short'} break.`,
      });
      
      if (autoStartBreaks) {
        setIsActive(true);
      }
    } else {
      // Break completed
      setSessionType('work');
      setTimeLeft(pomodoroSettings.workDuration * 60);
      setCurrentSession(prev => prev + 1);
      
      toast({
        title: "Break completed! 💪",
        description: "Ready for another focused work session?",
      });
    }
  };

  const startTimer = () => {
    setIsActive(true);
    setIsPaused(false);
  };

  const pauseTimer = () => {
    setIsPaused(!isPaused);
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsPaused(false);
    const duration = sessionType === 'work' 
      ? pomodoroSettings.workDuration 
      : sessionType === 'shortBreak' 
        ? pomodoroSettings.shortBreakDuration 
        : pomodoroSettings.longBreakDuration;
    setTimeLeft(duration * 60);
  };

  const skipSession = () => {
    handleSessionComplete();
  };

  const handleFlashcardAnswer = (isCorrect: boolean) => {
    setStudyStats(prev => ({
      ...prev,
      correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
      totalAnswers: prev.totalAnswers + 1
    }));
    
    // Move to next flashcard
    if (currentFlashcardIndex < flashcardIds.length - 1) {
      setCurrentFlashcardIndex(prev => prev + 1);
      setIsFlashcardFlipped(false);
    } else {
      toast({
        title: "Flashcard session completed! 🎉",
        description: `You got ${studyStats.correctAnswers + (isCorrect ? 1 : 0)} out of ${studyStats.totalAnswers + 1} correct.`,
      });
    }
  };

  const getSessionTypeColor = () => {
    switch (sessionType) {
      case 'work':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'shortBreak':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'longBreak':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getProgressPercentage = () => {
    const totalDuration = sessionType === 'work' 
      ? pomodoroSettings.workDuration * 60
      : sessionType === 'shortBreak' 
        ? pomodoroSettings.shortBreakDuration * 60 
        : pomodoroSettings.longBreakDuration * 60;
    return ((totalDuration - timeLeft) / totalDuration) * 100;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gradient">Study Session</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Stay focused and maximize your learning potential
        </p>
      </div>

      {/* Mode Selector */}
      <div className="flex justify-center">
        <Tabs value={studyMode} onValueChange={(value) => setStudyMode(value as any)} className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="focus" className="flex items-center gap-2">
              <Focus className="h-4 w-4" />
              Focus
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Active
            </TabsTrigger>
            <TabsTrigger value="review" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Review
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Timer */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="card-elevated">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Badge className={cn("px-3 py-1", getSessionTypeColor())}>
                  {sessionType === 'work' && <Target className="h-4 w-4 mr-1" />}
                  {sessionType === 'shortBreak' && <Coffee className="h-4 w-4 mr-1" />}
                  {sessionType === 'longBreak' && <Coffee className="h-4 w-4 mr-1" />}
                  {sessionType === 'work' ? 'Focus Time' : 
                   sessionType === 'shortBreak' ? 'Short Break' : 'Long Break'}
                </Badge>
              </div>
              <CardTitle className="text-6xl font-mono font-bold text-center">
                {formatTime(timeLeft)}
              </CardTitle>
              <CardDescription>
                Session {currentSession} • {completedPomodoros} completed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Progress value={getProgressPercentage()} className="h-3" />
              
              <div className="flex justify-center gap-3">
                {!isActive ? (
                  <Button onClick={startTimer} className="btn-gradient px-8">
                    <Play className="h-5 w-5 mr-2" />
                    Start
                  </Button>
                ) : (
                  <Button onClick={pauseTimer} variant="outline" className="px-8">
                    {isPaused ? <Play className="h-5 w-5 mr-2" /> : <Pause className="h-5 w-5 mr-2" />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                )}
                
                <Button onClick={resetTimer} variant="outline">
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Reset
                </Button>
                
                <Button onClick={skipSession} variant="outline">
                  <SkipForward className="h-5 w-5 mr-2" />
                  Skip
                </Button>
              </div>

              {/* Quick Settings */}
              <div className="flex items-center justify-center gap-6 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Switch
                    id="sound"
                    checked={soundEnabled}
                    onCheckedChange={setSoundEnabled}
                  />
                  <Label htmlFor="sound" className="flex items-center gap-1">
                    {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    Sound
                  </Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    id="auto-start"
                    checked={autoStartBreaks}
                    onCheckedChange={setAutoStartBreaks}
                  />
                  <Label htmlFor="auto-start" className="flex items-center gap-1">
                    <Timer className="h-4 w-4" />
                    Auto-start breaks
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Flashcard Section (when in active mode) */}
          {studyMode === 'active' && flashcardIds.length > 0 && (
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Flashcard Review
                </CardTitle>
                <CardDescription>
                  Card {currentFlashcardIndex + 1} of {flashcardIds.length}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flashcard" onClick={() => setIsFlashcardFlipped(!isFlashcardFlipped)}>
                  <div className={cn("flashcard-inner", isFlashcardFlipped && "flipped")}>
                    <div className="flashcard-front">
                      <div className="flex items-center justify-center h-full p-6">
                        <p className="text-lg text-center">
                          Click to reveal the answer
                        </p>
                      </div>
                    </div>
                    <div className="flashcard-back">
                      <div className="flex items-center justify-center h-full p-6">
                        <p className="text-lg text-center">
                          This is the answer side
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {isFlashcardFlipped && (
                  <div className="flex gap-3 justify-center">
                    <Button 
                      onClick={() => handleFlashcardAnswer(false)}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <XCircle className="h-4 w-4 text-red-500" />
                      Incorrect
                    </Button>
                    <Button 
                      onClick={() => handleFlashcardAnswer(true)}
                      className="btn-gradient flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Correct
                    </Button>
                  </div>
                )}
                
                <Progress 
                  value={(currentFlashcardIndex / flashcardIds.length) * 100} 
                  className="h-2" 
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Session Stats */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Session Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Completed Sessions</span>
                  <span className="font-semibold">{studyStats.completedSessions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Time</span>
                  <span className="font-semibold">{Math.floor(studyStats.totalTime / 60)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Focus Score</span>
                  <span className="font-semibold">{studyStats.focusScore}%</span>
                </div>
                {studyStats.totalAnswers > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Accuracy</span>
                    <span className="font-semibold">
                      {Math.round((studyStats.correctAnswers / studyStats.totalAnswers) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Study Tips */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Study Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Stay Hydrated 💧
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    Keep a water bottle nearby to maintain focus.
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="font-medium text-green-900 dark:text-green-100">
                    Take Notes ✍️
                  </p>
                  <p className="text-green-700 dark:text-green-300">
                    Active note-taking improves retention.
                  </p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="font-medium text-purple-900 dark:text-purple-100">
                    Minimize Distractions 🔕
                  </p>
                  <p className="text-purple-700 dark:text-purple-300">
                    Put your phone in another room.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Timer Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Work Duration</Label>
                  <Slider
                    value={[pomodoroSettings.workDuration]}
                    onValueChange={([value]) => 
                      setPomodoroSettings(prev => ({ ...prev, workDuration: value }))
                    }
                    max={60}
                    min={15}
                    step={5}
                    className="mt-2"
                  />
                  <span className="text-xs text-gray-500">{pomodoroSettings.workDuration} minutes</span>
                </div>
                
                <div>
                  <Label className="text-sm">Short Break</Label>
                  <Slider
                    value={[pomodoroSettings.shortBreakDuration]}
                    onValueChange={([value]) => 
                      setPomodoroSettings(prev => ({ ...prev, shortBreakDuration: value }))
                    }
                    max={15}
                    min={3}
                    step={1}
                    className="mt-2"
                  />
                  <span className="text-xs text-gray-500">{pomodoroSettings.shortBreakDuration} minutes</span>
                </div>
                
                <div>
                  <Label className="text-sm">Long Break</Label>
                  <Slider
                    value={[pomodoroSettings.longBreakDuration]}
                    onValueChange={([value]) => 
                      setPomodoroSettings(prev => ({ ...prev, longBreakDuration: value }))
                    }
                    max={30}
                    min={10}
                    step={5}
                    className="mt-2"
                  />
                  <span className="text-xs text-gray-500">{pomodoroSettings.longBreakDuration} minutes</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
