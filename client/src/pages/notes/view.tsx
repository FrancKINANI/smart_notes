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
        title: "Cartes générées",
        description:
          "De nouvelles cartes de révision ont été créées à partir de votre note.",
      });
      navigate("/flashcards");
    },
    onError: () => {
      toast({
        title: "Échec de la génération",
        description:
          "Impossible de générer les cartes de révision. Veuillez réessayer.",
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
        `Discutons de cette note sur : ${note.title}\n\n${note.content}`
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

    // Si le contenu est une chaîne, c'est déjà du markdown ou du texte brut
    if (typeof content === "string") return content;

    // Si le contenu est un objet avec enhancedContent
    if (content.enhancedContent) {
      try {
        const parsed =
          typeof content.enhancedContent === "string"
            ? JSON.parse(content.enhancedContent)
            : content.enhancedContent;
        return convertJSONToMarkdown(parsed);
      } catch (error) {
        console.error("Erreur lors du parsing du contenu amélioré:", error);
        return content.enhancedContent?.toString() || "";
      }
    }

    let markdown = "";

    // Fonction utilitaire pour convertir un array en liste markdown
    const arrayToList = (items: any[]): string => {
      if (!Array.isArray(items)) return "";
      return items
        .filter((item) => item !== null && item !== undefined)
        .map((item) => `- ${item}\n`)
        .join("");
    };

    // Traiter chaque section du contenu amélioré
    if (content.Introduction) {
      markdown += "# Introduction\n\n";
      markdown += `${content.Introduction}\n\n`;
    }

    if (content["Concepts Fondamentaux"]) {
      markdown += "# Concepts Fondamentaux\n\n";
      const concepts = content["Concepts Fondamentaux"];

      if (concepts.Définitions?.length) {
        markdown += "## Définitions\n\n";
        markdown += arrayToList(concepts.Définitions);
        markdown += "\n";
      }

      if (concepts.Principes?.length) {
        markdown += "## Principes\n\n";
        markdown += arrayToList(concepts.Principes);
        markdown += "\n";
      }

      if (concepts.Exemples?.length) {
        markdown += "## Exemples\n\n";
        markdown += arrayToList(concepts.Exemples);
        markdown += "\n";
      }
    }

    if (content["Points Clés"]?.length) {
      markdown += "# Points Clés\n\n";
      markdown += arrayToList(content["Points Clés"]);
      markdown += "\n";
    }

    if (content.Applications?.length) {
      markdown += "# Applications\n\n";
      markdown += arrayToList(content.Applications);
      markdown += "\n";
    }

    if (content["Pour Aller Plus Loin"]) {
      markdown += "# Pour Aller Plus Loin\n\n";
      markdown += `${content["Pour Aller Plus Loin"]}\n\n`;
    }

    return markdown;
  }

  function renderEnhancedContent(content: any) {
    if (!content) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">
            Aucun contenu amélioré disponible. Cliquez sur "Améliorer avec l'IA"
            pour le générer.
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
              Le contenu amélioré semble être vide. Essayez de régénérer le
              contenu.
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
      console.error("Erreur lors du rendu du contenu amélioré:", error);
      return (
        <div className="text-red-500 p-4 rounded-lg border border-red-200 bg-red-50">
          <p className="mb-2">
            Une erreur est survenue lors de l'affichage du contenu amélioré.
          </p>
          <p className="text-sm">
            Détail de l'erreur :{" "}
            {error instanceof Error ? error.message : "Erreur inconnue"}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => enhanceMutation.mutate()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer l'amélioration
          </Button>
        </div>
      );
    }
  }

  console.log("Note data:", note);
  console.log("Enhanced content:", note?.enhancedContent);
  console.log("Note ID used in API request:", noteId); // Log pour vérifier l'ID utilisé dans la requête

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
                  ? "La note doit avoir du contenu pour générer un quiz"
                  : ""
              }
            >
              <FileQuestion className="mr-2 h-4 w-4" />
              {quizMutation.isPending
                ? "Génération en cours..."
                : "Générer un Quiz à partir de cette Note"}
            </Button>

            <Button
              variant="secondary"
              onClick={() => flashcardsMutation.mutate()}
              disabled={flashcardsMutation.isPending || !note?.content}
              title={
                !note?.content
                  ? "La note doit avoir du contenu pour générer des cartes"
                  : ""
              }
            >
              <FileQuestion className="mr-2 h-4 w-4" />
              {flashcardsMutation.isPending
                ? "Génération en cours..."
                : "Générer des Cartes de Révision"}
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
                      Aucun contenu amélioré disponible. Cliquez sur "Améliorer
                      avec l'IA" pour le générer.
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
                <h3 className="text-lg font-medium">Discuter avec l'IA</h3>
                <p className="text-sm text-muted-foreground">
                  Posez des questions sur cette note à l'IA
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
