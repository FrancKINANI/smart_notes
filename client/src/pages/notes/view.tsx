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
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Note, Subject } from "@shared/schema";
import { Link } from "wouter";
import ReactMarkdown from "react-markdown";

export default function ViewNote() {
  const params = useParams<{ id: string }>();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
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
        title: "Flashcards generated",
        description: "New flashcards have been created based on your note.",
      });
      navigate("/flashcards");
    },
    onError: () => {
      toast({
        title: "Flashcard generation failed",
        description: "Failed to generate flashcards. Please try again.",
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

  function renderEnhancedContent(content: any) {
    if (!content) return null;

    return (
      <div className="prose prose-lg max-w-none">
        {content.title && <h1>{content.title}</h1>}
        {content.introduction && (
          <section>
            <h2>Introduction</h2>
            <p>{content.introduction.definition}</p>
          </section>
        )}
        {content.fundamentalConcepts && (
          <section>
            <h2>Concepts Fondamentaux</h2>
            {content.fundamentalConcepts.vectorsAndVectorSpaces && (
              <div>
                <h3>Vecteurs et Espaces Vectoriels</h3>
                <p>
                  {
                    content.fundamentalConcepts.vectorsAndVectorSpaces
                      .vectorDefinition
                  }
                </p>
                <p>
                  {
                    content.fundamentalConcepts.vectorsAndVectorSpaces
                      .vectorSpaceDefinition
                  }
                </p>
                <ul>
                  {content.fundamentalConcepts.vectorsAndVectorSpaces.properties.map(
                    (prop: string, i: number) => (
                      <li key={i}>{prop}</li>
                    )
                  )}
                </ul>
              </div>
            )}
            {content.fundamentalConcepts.linearTransformations && (
              <div>
                <h3>Transformations Linéaires</h3>
                <p>
                  {content.fundamentalConcepts.linearTransformations.definition}
                </p>
                <p>
                  {
                    content.fundamentalConcepts.linearTransformations
                      .matrixRepresentation
                  }
                </p>
                <ul>
                  {content.fundamentalConcepts.linearTransformations.examples.map(
                    (example: string, i: number) => (
                      <li key={i}>{example}</li>
                    )
                  )}
                </ul>
              </div>
            )}
            {content.fundamentalConcepts.systemsOfLinearEquations && (
              <div>
                <h3>Systèmes d'Équations Linéaires</h3>
                <p>
                  {
                    content.fundamentalConcepts.systemsOfLinearEquations
                      .definition
                  }
                </p>
                <p>
                  {
                    content.fundamentalConcepts.systemsOfLinearEquations
                      .importance
                  }
                </p>
                <ul>
                  {content.fundamentalConcepts.systemsOfLinearEquations.methodsOfSolution.map(
                    (method: string, i: number) => (
                      <li key={i}>{method}</li>
                    )
                  )}
                </ul>
              </div>
            )}
          </section>
        )}
        {content.applications && (
          <section>
            <h2>Applications</h2>
            <ul>
              {content.applications.fields.map((field: string, i: number) => (
                <li key={i}>{field}</li>
              ))}
            </ul>
            <p>{content.applications.role}</p>
          </section>
        )}
      </div>
    );
  }

  function renderEnhancedContentFromJSON(jsonContent: any) {
    if (!jsonContent || typeof jsonContent !== "object") {
      return <p className="text-red-500">Invalid content format</p>;
    }

    const renderObject = (obj: any) => {
      return Object.entries(obj).map(([key, value], index) => {
        if (typeof value === "string") {
          return (
            <p key={index}>
              <strong>{key}:</strong> {value}
            </p>
          );
        } else if (Array.isArray(value)) {
          return (
            <div key={index}>
              <h3>{key}</h3>
              <ul>
                {value.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          );
        } else if (typeof value === "object") {
          return (
            <div key={index}>
              <h3>{key}</h3>
              {renderObject(value)}
            </div>
          );
        }
        return null;
      });
    };

    return (
      <div className="prose prose-lg max-w-none">
        {renderObject(jsonContent)}
      </div>
    );
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
                  className={`subject-badge`}
                  style={{
                    backgroundColor: `${subject.color}20`,
                    color: subject.color,
                  }}
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
              disabled={quizMutation.isPending}
            >
              <FileQuestion className="mr-2 h-4 w-4" />
              {quizMutation.isPending ? "Generating..." : "Generate Quiz"}
            </Button>

            <Button
              variant="secondary"
              onClick={() => flashcardsMutation.mutate()}
              disabled={flashcardsMutation.isPending}
            >
              <FileQuestion className="mr-2 h-4 w-4" />
              {flashcardsMutation.isPending
                ? "Generating..."
                : "Generate Flashcards"}
            </Button>
          </div>
        </div>

        {/* Note content */}
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
                {note?.content
                  .split("\n")
                  .map((paragraph: string, i: number) => (
                    <p key={i}>{paragraph}</p>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="enhanced">
            {note?.enhancedContent ? (
              (() => {
                try {
                  let parsedContent = note.enhancedContent;

                  // Si c'est une chaîne de caractères, essayer de la parser comme JSON
                  if (typeof note.enhancedContent === "string") {
                    try {
                      parsedContent = JSON.parse(note.enhancedContent);
                    } catch {
                      // Si le parsing échoue, afficher le contenu tel quel
                      return (
                        <div className="prose max-w-none">
                          {note.enhancedContent
                            .split("\n")
                            .map((line: string, index: number) => (
                              <p key={index}>{line}</p>
                            ))}
                        </div>
                      );
                    }
                  }

                  return renderEnhancedContentFromJSON(parsedContent);
                } catch (error: unknown) {
                  console.error("Error displaying enhanced content:", error);
                  return (
                    <div className="text-red-500">
                      <p>
                        Une erreur s'est produite lors de l'affichage du contenu
                        amélioré.
                      </p>
                      <p>
                        Message d'erreur :{" "}
                        {error instanceof Error
                          ? error.message
                          : "Erreur inconnue"}
                      </p>
                    </div>
                  );
                }
              })()
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  Aucun contenu amélioré disponible. Cliquez sur "Améliorer avec
                  l'IA" pour le générer.
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
    </div>
  );
}
