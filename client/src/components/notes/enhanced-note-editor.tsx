import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Image,
  Table,
  Heading1,
  Heading2,
  Heading3,
  Type,
  Palette,
  Save,
  Share2,
  Download,
  Upload,
  Eye,
  Edit,
  Mic,
  MicOff,
  Camera,
  FileText,
  Brain,
  Lightbulb,
  Target,
  Clock,
  Users,
  MessageSquare,
  Zap,
  Sparkles,
  MoreVertical,
  Plus,
  Minus,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Move,
  Square,
  Circle,
  Triangle,
  ArrowRight,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category: "academic" | "meeting" | "research" | "creative" | "project";
  tags: string[];
}

interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  size: "small" | "medium" | "large";
  shape: "circle" | "rectangle" | "diamond";
  children: string[];
  parent?: string;
}

interface Collaborator {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  cursor?: { x: number; y: number };
  isActive: boolean;
}

export default function EnhancedNoteEditor() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("editor");
  const [editorMode, setEditorMode] = useState<"rich" | "markdown" | "mindmap">("rich");
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [mindMapNodes, setMindMapNodes] = useState<MindMapNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [mindMapZoom, setMindMapZoom] = useState(100);
  const [collaborators] = useState<Collaborator[]>([
    {
      id: "1",
      name: "Alice Johnson",
      color: "#3B82F6",
      isActive: true
    },
    {
      id: "2",
      name: "Bob Smith",
      color: "#10B981",
      isActive: true
    }
  ]);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const mindMapRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const noteTemplates: NoteTemplate[] = [
    {
      id: "cornell",
      name: "Cornell Notes",
      description: "Structured note-taking with cues, notes, and summary sections",
      content: "# Cornell Notes\n\n## Cues\n- \n\n## Notes\n\n\n## Summary\n",
      category: "academic",
      tags: ["structured", "study", "review"]
    },
    {
      id: "meeting",
      name: "Meeting Notes",
      description: "Template for meeting documentation",
      content: "# Meeting Notes\n\n**Date:** \n**Attendees:** \n**Agenda:** \n\n## Discussion Points\n\n## Action Items\n- [ ] \n\n## Next Steps\n",
      category: "meeting",
      tags: ["meeting", "action-items", "collaboration"]
    },
    {
      id: "research",
      name: "Research Notes",
      description: "Academic research documentation",
      content: "# Research Notes\n\n**Topic:** \n**Source:** \n**Date:** \n\n## Key Findings\n\n## Methodology\n\n## Quotes & Citations\n\n## Personal Insights\n",
      category: "research",
      tags: ["research", "academic", "citations"]
    },
    {
      id: "project",
      name: "Project Planning",
      description: "Project planning and tracking template",
      content: "# Project Plan\n\n**Project:** \n**Timeline:** \n**Team:** \n\n## Objectives\n\n## Milestones\n- [ ] \n\n## Resources Needed\n\n## Risks & Mitigation\n",
      category: "project",
      tags: ["project", "planning", "timeline"]
    }
  ];

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setContent(prev => prev + transcript);
      };

      recognitionRef.current.onerror = () => {
        setIsRecording(false);
        toast({
          title: "Speech recognition error",
          description: "Please try again or continue typing.",
          variant: "destructive"
        });
      };
    }
  }, []);

  // Update word count and reading time
  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0).length;
    setWordCount(words);
    setReadingTime(Math.ceil(words / 200)); // Average reading speed: 200 words per minute
  }, [content]);

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && content) {
      const timer = setTimeout(() => {
        // Auto-save logic here
        console.log("Auto-saving...");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [content, autoSave]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Speech recognition not supported",
        description: "Your browser doesn't support speech recognition.",
        variant: "destructive"
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const applyTemplate = (templateId: string) => {
    const template = noteTemplates.find(t => t.id === templateId);
    if (template) {
      setContent(template.content);
      setTitle(template.name);
      toast({
        title: "Template applied",
        description: `${template.name} template has been applied to your note.`,
      });
    }
  };

  const formatText = (format: string) => {
    if (!editorRef.current) return;

    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    let formattedText = selectedText;
    let prefix = "";
    let suffix = "";

    switch (format) {
      case "bold":
        prefix = "**";
        suffix = "**";
        break;
      case "italic":
        prefix = "*";
        suffix = "*";
        break;
      case "underline":
        prefix = "<u>";
        suffix = "</u>";
        break;
      case "strikethrough":
        prefix = "~~";
        suffix = "~~";
        break;
      case "code":
        prefix = "`";
        suffix = "`";
        break;
      case "h1":
        prefix = "# ";
        break;
      case "h2":
        prefix = "## ";
        break;
      case "h3":
        prefix = "### ";
        break;
      case "quote":
        prefix = "> ";
        break;
      case "list":
        prefix = "- ";
        break;
      case "ordered-list":
        prefix = "1. ";
        break;
    }

    const newText = content.substring(0, start) + prefix + selectedText + suffix + content.substring(end);
    setContent(newText);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const addMindMapNode = (x: number, y: number) => {
    const newNode: MindMapNode = {
      id: Date.now().toString(),
      text: "New Idea",
      x,
      y,
      color: "#3B82F6",
      size: "medium",
      shape: "circle",
      children: [],
      parent: selectedNode || undefined
    };

    setMindMapNodes(prev => [...prev, newNode]);
    
    // If there's a selected node, add this as a child
    if (selectedNode) {
      setMindMapNodes(prev => prev.map(node => 
        node.id === selectedNode 
          ? { ...node, children: [...node.children, newNode.id] }
          : node
      ));
    }
  };

  const updateNodeText = (nodeId: string, text: string) => {
    setMindMapNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, text } : node
    ));
  };

  const deleteNode = (nodeId: string) => {
    setMindMapNodes(prev => prev.filter(node => node.id !== nodeId));
    // Remove references from parent nodes
    setMindMapNodes(prev => prev.map(node => ({
      ...node,
      children: node.children.filter(childId => childId !== nodeId)
    })));
  };

  const exportNote = (format: "md" | "pdf" | "docx") => {
    toast({
      title: "Exporting note",
      description: `Your note is being exported as ${format.toUpperCase()}.`,
    });
  };

  const shareNote = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Share link copied",
      description: "The note share link has been copied to your clipboard.",
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Note"
            className="text-2xl font-bold border-none px-0 focus-visible:ring-0"
          />
        </div>
        <div className="flex items-center gap-2">
          {isCollaborative && (
            <div className="flex items-center gap-1">
              {collaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: collaborator.color }}
                  title={collaborator.name}
                >
                  {collaborator.name.substring(0, 2).toUpperCase()}
                </div>
              ))}
            </div>
          )}
          <Button variant="outline" onClick={shareNote}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button className="btn-gradient">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Mode Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Tabs value={editorMode} onValueChange={(value) => setEditorMode(value as any)}>
              <TabsList>
                <TabsTrigger value="rich" className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Rich Text
                </TabsTrigger>
                <TabsTrigger value="markdown" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Markdown
                </TabsTrigger>
                <TabsTrigger value="mindmap" className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Mind Map
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="collaborative"
                  checked={isCollaborative}
                  onCheckedChange={setIsCollaborative}
                />
                <Label htmlFor="collaborative" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Collaborative
                </Label>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-save"
                  checked={autoSave}
                  onCheckedChange={setAutoSave}
                />
                <Label htmlFor="auto-save" className="flex items-center gap-1">
                  <Save className="h-4 w-4" />
                  Auto-save
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-3 space-y-4">
          {/* Toolbar */}
          {(editorMode === "rich" || editorMode === "markdown") && (
            <Card>
              <CardContent className="p-3">
                <div className="flex flex-wrap items-center gap-1">
                  {/* Text Formatting */}
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => formatText("bold")}>
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => formatText("italic")}>
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => formatText("underline")}>
                      <Underline className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => formatText("strikethrough")}>
                      <Strikethrough className="h-4 w-4" />
                    </Button>
                  </div>

                  <Separator orientation="vertical" className="h-6" />

                  {/* Headings */}
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => formatText("h1")}>
                      <Heading1 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => formatText("h2")}>
                      <Heading2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => formatText("h3")}>
                      <Heading3 className="h-4 w-4" />
                    </Button>
                  </div>

                  <Separator orientation="vertical" className="h-6" />

                  {/* Lists */}
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => formatText("list")}>
                      <List className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => formatText("ordered-list")}>
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => formatText("quote")}>
                      <Quote className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => formatText("code")}>
                      <Code className="h-4 w-4" />
                    </Button>
                  </div>

                  <Separator orientation="vertical" className="h-6" />

                  {/* Media */}
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm">
                      <Link className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Image className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Table className="h-4 w-4" />
                    </Button>
                  </div>

                  <Separator orientation="vertical" className="h-6" />

                  {/* Voice Input */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleRecording}
                    className={cn(isRecording && "bg-red-100 text-red-600")}
                  >
                    {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Editor Content */}
          <Card className="min-h-[500px]">
            <CardContent className="p-0">
              {editorMode === "mindmap" ? (
                <div className="relative h-[500px] bg-gray-50 dark:bg-gray-900">
                  {/* Mind Map Controls */}
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setMindMapZoom(prev => Math.min(prev + 10, 200))}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">{mindMapZoom}%</span>
                    <Button variant="outline" size="sm" onClick={() => setMindMapZoom(prev => Math.max(prev - 10, 50))}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <Button variant="outline" size="sm">
                      <Square className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Circle className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Triangle className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Mind Map Canvas */}
                  <div
                    ref={mindMapRef}
                    className="w-full h-full cursor-crosshair"
                    style={{ transform: `scale(${mindMapZoom / 100})` }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = (e.clientX - rect.left) / (mindMapZoom / 100);
                      const y = (e.clientY - rect.top) / (mindMapZoom / 100);
                      addMindMapNode(x, y);
                    }}
                  >
                    {/* Render connections */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      {mindMapNodes.map(node => 
                        node.children.map(childId => {
                          const child = mindMapNodes.find(n => n.id === childId);
                          if (!child) return null;
                          return (
                            <line
                              key={`${node.id}-${childId}`}
                              x1={node.x}
                              y1={node.y}
                              x2={child.x}
                              y2={child.y}
                              stroke="#6B7280"
                              strokeWidth="2"
                            />
                          );
                        })
                      )}
                    </svg>

                    {/* Render nodes */}
                    {mindMapNodes.map(node => (
                      <div
                        key={node.id}
                        className={cn(
                          "absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move",
                          "bg-white border-2 rounded-lg p-2 shadow-lg min-w-[100px] text-center",
                          selectedNode === node.id && "ring-2 ring-primary-500"
                        )}
                        style={{
                          left: node.x,
                          top: node.y,
                          borderColor: node.color
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNode(node.id);
                        }}
                      >
                        <input
                          type="text"
                          value={node.text}
                          onChange={(e) => updateNodeText(node.id, e.target.value)}
                          className="w-full bg-transparent border-none outline-none text-center text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute -top-2 -right-2 w-6 h-6 p-0 bg-red-500 text-white rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNode(node.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {mindMapNodes.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">Click anywhere to add your first idea</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Textarea
                  ref={editorRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Start writing your note..."
                  className="min-h-[500px] border-none resize-none focus-visible:ring-0 text-base leading-relaxed"
                />
              )}
            </CardContent>
          </Card>

          {/* Status Bar */}
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span>{wordCount} words</span>
              <span>{readingTime} min read</span>
              {autoSave && <span className="text-green-600">Auto-saved</span>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => exportNote("md")}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Templates
              </CardTitle>
              <CardDescription>
                Quick start with pre-made templates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {noteTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <Button 
                  onClick={() => applyTemplate(selectedTemplate)}
                  className="w-full"
                  size="sm"
                >
                  Apply Template
                </Button>
              )}
            </CardContent>
          </Card>

          {/* AI Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Lightbulb className="h-4 w-4 mr-2" />
                Improve Writing
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Brain className="h-4 w-4 mr-2" />
                Generate Summary
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Target className="h-4 w-4 mr-2" />
                Create Quiz
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Zap className="h-4 w-4 mr-2" />
                Key Points
              </Button>
            </CardContent>
          </Card>

          {/* Note Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Note Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Characters</span>
                <span className="font-medium">{content.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Words</span>
                <span className="font-medium">{wordCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Reading Time</span>
                <span className="font-medium">{readingTime} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Last Edited</span>
                <span className="font-medium">Just now</span>
              </div>
            </CardContent>
          </Card>

          {/* Comments (if collaborative) */}
          {isCollaborative && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No comments yet</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Add Comment
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
