import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  enhanceNote,
  generateQuiz,
  generateFlashcards,
  textToSpeech,
} from "@/lib/openai";
import { speak, stopSpeaking } from "@/lib/speech";
import {
  Edit,
  Play,
  Square,
  Brain,
  FileQuestion,
  Trash2,
  ArrowLeft,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useModal } from "@/hooks/use-modal";
import { useState, useEffect } from "react";
import { Note, Subject } from "@shared/schema";
import { Link } from "wouter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AIChat } from "@/components/ai/ai-chat";

export default function ViewNote() {
  const params = useParams<{ id: string }>();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { openAssistantModal } = useModal();
  const noteId = parseInt(params.id);
  const userId = 1; // Default user ID for demo

  const [activeTab, setActiveTab] = useState("original");
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Fetch note details
  const {
    data: note,
    isLoading: isLoadingNote,
    error,
  } = useQuery({
    queryKey: [`/api/notes/${noteId}`],
    queryFn: () => fetch(`/api/notes/${noteId}`).then((res) => res.json()),
  });

  // Fetch subject
  const { data: subjects } = useQuery({
    queryKey: ["/api/subjects"],
    queryFn: () => fetch("/api/subjects").then((res) => res.json()),
    enabled: !!note,
  });

  const subject = subjects?.find((s: Subject) => s.id === note?.subjectId);

  // AI Enhancement mutation
  const enhanceMutation = useMutation({
    mutationFn: () => enhanceNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/notes/${noteId}`] });
      toast({
        title: "Note enhanced",
        description: "Your note has been enhanced with AI assistance.",
      });
      setActiveTab("enhanced");
    },
    onError: () => {
      toast({
        title: "Enhancement failed",
        description: "Failed to enhance the note. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate Quiz mutation
  const quizMutation = useMutation({
    mutationFn: () => generateQuiz({ noteId, userId }),
    onSuccess: (data) => {
      toast({
        title: "Quiz generated",
        description: "A new quiz has been created based on your note.",
      });
      // Navigate to the generated quiz
      navigate(`/quizzes/${data.id}`);
    },
    onError: () => {
      toast({
        title: "Quiz generation failed",
        description: "Failed to generate a quiz. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate Flashcards mutation
  const flashcardsMutation = useMutation({
    mutationFn: () => generateFlashcards({ noteId, userId }),
    onSuccess: () => {
      toast({
        title: "Cards generated",
        description:
          "New revision cards have been created from your note.",
      });
      navigate("/flashcards");
    },
    onError: () => {
      toast({
        title: "Generation failed",
        description:
          "Unable to generate the revision cards. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete note mutation
  const deleteMutation = useMutation({
    mutationFn: () => {
      return fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
        credentials: "include",
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to delete note");
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "Note deleted",
        description: "Your note has been permanently deleted.",
      });
      navigate("/notes");
    },
    onError: () => {
      toast({
        title: "Deletion failed",
        description: "Failed to delete the note. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle text-to-speech playback
  const handlePlayback = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      const textToRead =
        activeTab === "enhanced" && note.enhancedContent
          ? note.enhancedContent
          : note?.content || "";

      if (textToRead) {
        speak(textToRead);
        setIsSpeaking(true);
      }
    }
  };

  const handleDiscussWithAI = () => {
    if (note?.content) {
      openAssistantModal(
        `Let's discuss this note about: ${note.title}\n\n${note.content}`
      );
    }
  };

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  if (error) {
    return (
      <div className="py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load note. It may have been deleted or you don't have
              permission to view it.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button asChild>
              <Link to="/notes">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Notes
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  function convertJSONToMarkdown(content: any): string {
    if (!content) return "";

    // If the content is a string, it is already markdown or plain text
    if (typeof content === "string") return content;

    // If the content is an object with enhancedContent
    if (content.enhancedContent) {
      try {
        const parsed =
          typeof content.enhancedContent === "string"
            ? JSON.parse(content.enhancedContent)
            : content.enhancedContent;
        return convertJSONToMarkdown(parsed);
      } catch (error) {
        console.error("Error while parsing the enhanced content:", error);
        return content.enhancedContent?.toString() || "";
      }
    }

    let markdown = "";

    // Utility function to convert an array to a markdown list
    const arrayToList = (items: any[]): string => {
      if (!Array.isArray(items)) return "";
      return items
        .filter((item) => item !== null && item !== undefined)
        .map((item) => `- ${item}\n`)
        .join("");
    };

    // Process each section of the enhanced content
    if (content.Introduction) {
      markdown += "# Introduction\n\n";
      markdown += `${content.Introduction}\n\n`;
    }

    if (content["Fundamental Concepts"]) {
      markdown += "# Fundamental Concepts\n\n";
      const concepts = content["Fundamental Concepts"];

      if (concepts.Definitions?.length) {
        markdown += "## Definitions\n\n";
        markdown += arrayToList(concepts.Definitions);
        markdown += "\n";
      }

      if (concepts.Principles?.length) {
        markdown += "## Principles\n\n";
        markdown += arrayToList(concepts.Principles);
        markdown += "\n";
      }

      if (concepts.Examples?.length) {
        markdown += "## Examples\n\n";
        markdown += arrayToList(concepts.Examples);
        markdown += "\n";
      }
    }

    if (content["Key Points"]?.length) {
      markdown += "# Key Points\n\n";
      markdown += arrayToList(content["Key Points"]);
      markdown += "\n";
    }

    if (content.Applications?.length) {
      markdown += "# Applications\n\n";
      markdown += arrayToList(content.Applications);
      markdown += "\n";
    }

    if (content["To Go Further"]) {
      markdown += "# To Go Further\n\n";
      markdown += `${content["To Go Further"]}\n\n`;
    }

    return markdown;
  }

  function renderEnhancedContent(content: any) {
    if (!content) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">
            No enhanced content available. Click on "Enhance with AI"
            to generate it.
          </p>
        </div>
      );
    }

    try {
      let contentToConvert = content;

      if (typeof content === "string") {
        try {
          contentToConvert = JSON.parse(content);
        } catch {
          return (
            <div className="prose max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          );
        }
      }

      const markdownContent = convertJSONToMarkdown(contentToConvert);

      if (!markdownContent.trim()) {
        return (
          <div className="text-center py-12">
            <p className="text-gray-500">
              The enhanced content seems to be empty. Try regenerating the
              content.
            </p>
          </div>
        );
      }

      return (
        <div className="prose max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {markdownContent}
          </ReactMarkdown>
        </div>
      );
    } catch (error) {
      console.error("Error while rendering the enhanced content:", error);
      return (
        <div className="text-red-500 p-4 rounded-lg border border-red-200 bg-red-50">
          <p className="mb-2">
            An error occurred while displaying the enhanced content.
          </p>
          <p className="text-sm">
            Error details:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => enhanceMutation.mutate()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry the enhancement
          </Button>
        </div>
      );
    }
  }

  console.log("Note data:", note);
  console.log("Enhanced content:", note?.enhancedContent);
  console.log("Note ID used in API request:", noteId); // Log to verify the ID used in the request

  return (
    <div className="py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation and actions */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" asChild>
            <Link to="/notes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Notes
            </Link>
          </Button>

          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handlePlayback}>
              {isSpeaking ? (
                <Square className="h-4 w-4 mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isSpeaking ? "Stop" : "Read Aloud"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/notes/edit/${noteId}`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (
                  confirm(
                    "Are you sure you want to delete this note? This action cannot be undone."
                  )
                ) {
                  deleteMutation.mutate();
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Note header */}
        {isLoadingNote ? (
          <>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-5 w-1/4 mb-6" />
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {note?.title}
            </h1>
            <div className="flex items-center mb-6">
              {subject && (
                <span
                  className="subject-badge"
                  style={
                    {
                      "--subject-bg-color": `${subject.color}20`,
                      "--subject-text-color": subject.color,
                    } as React.CSSProperties
                  }
                  data-color
                >
                  {subject.name}
                </span>
              )}
              <span className="text-sm text-gray-500">
                {new Date(note?.createdAt).toLocaleDateString()}
              </span>
            </div>
          </>
        )}

        {/* AI enhancement options */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="default"
              onClick={() => enhanceMutation.mutate()}
              disabled={enhanceMutation.isPending}
            >
              <Brain className="mr-2 h-4 w-4" />
              {enhanceMutation.isPending ? "Enhancing..." : "Enhance with AI"}
            </Button>

            <Button
              variant="secondary"
              onClick={() => quizMutation.mutate()}
              disabled={quizMutation.isPending || !note?.content}
              title={
                !note?.content
                  ? "The note must have content to generate a quiz"
                  : ""
              }
            >
              <FileQuestion className="mr-2 h-4 w-4" />
              {quizMutation.isPending
                ? "Generating..."
                : "Generate a Quiz from this Note"}
            </Button>

            <Button
              variant="secondary"
              onClick={() => flashcardsMutation.mutate()}
              disabled={flashcardsMutation.isPending || !note?.content}
              title={
                !note?.content
                  ? "The note must have content to generate cards"
                  : ""
              }
            >
              <FileQuestion className="mr-2 h-4 w-4" />
              {flashcardsMutation.isPending
                ? "Generating..."
                : "Generate Revision Cards"}
            </Button>
          </div>
        </div>

        {/* Note content with AI Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Note content column */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="original">Original Note</TabsTrigger>
                <TabsTrigger value="enhanced" disabled={!note?.enhancedContent}>
                  Enhanced Version
                </TabsTrigger>
                {note?.summary && (
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="original">
                {isLoadingNote ? (
                  <>
                    <Skeleton className="h-5 w-full mb-2" />
                    <Skeleton className="h-5 w-full mb-2" />
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-5 w-full mb-2" />
                    <Skeleton className="h-5 w-5/6 mb-2" />
                  </>
                ) : (
                  <div className="prose max-w-none">
                    <ReactMarkdown>{note?.content || ""}</ReactMarkdown>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="enhanced">
                {isLoadingNote ? (
                  <>
                    <Skeleton className="h-5 w-full mb-2" />
                    <Skeleton className="h-5 w-full mb-2" />
                    <Skeleton className="h-5 w-3/4 mb-2" />
                  </>
                ) : note?.enhancedContent ? (
                  renderEnhancedContent(note.enhancedContent)
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">
                      No enhanced content available. Click on "Enhance
                      with AI" to generate it.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="summary">
                {note?.summary ? (
                  <div className="prose max-w-none">
                    <h3>Summary</h3>
                    {note.summary
                      .split("\n")
                      .map((paragraph: string, i: number) => (
                        <p key={i}>{paragraph}</p>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No summary available yet.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* AI Chat column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h3 className="text-lg font-medium">Chat with AI</h3>
                <p className="text-sm text-muted-foreground">
                  Ask questions about this note to the AI
                </p>
              </div>
              <div className="h-[600px]">
                <AIChat noteId={noteId} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
