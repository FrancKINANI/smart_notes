import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Plus,
  Save,
  X,
  ThumbsUp,
  MoreHorizontal,
  UserPlus,
  Flag,
  Edit,
  Trash2,
} from "lucide-react";

// Types pour les annotations collaboratives
interface Annotation {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    initials: string;
  };
  createdAt: Date;
  updatedAt?: Date;
  position: {
    x: number;
    y: number;
  };
  likes: string[]; // IDs des utilisateurs qui ont aimé
  replies?: AnnotationReply[];
}

interface AnnotationReply {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    initials: string;
  };
  createdAt: Date;
}

interface CollaborativeNotesProps {
  noteId: string;
  content: string;
  currentUserId: string;
  currentUserName: string;
  readOnly?: boolean;
  onAnnotationAdded?: (annotation: Annotation) => void;
  onAnnotationUpdated?: (annotation: Annotation) => void;
  onAnnotationDeleted?: (annotationId: string) => void;
  initialAnnotations?: Annotation[];
}

export function CollaborativeNotes({
  noteId,
  content,
  currentUserId,
  currentUserName,
  readOnly = false,
  onAnnotationAdded,
  onAnnotationUpdated,
  onAnnotationDeleted,
  initialAnnotations = [],
}: CollaborativeNotesProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [activeAnnotation, setActiveAnnotation] = useState<string | null>(null);
  const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);
  const [newAnnotationText, setNewAnnotationText] = useState("");
  const [newAnnotationPosition, setNewAnnotationPosition] = useState({ x: 0, y: 0 });
  const [replyText, setReplyText] = useState("");
  const noteContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Ajouter une nouvelle annotation
  const addAnnotation = () => {
    if (!newAnnotationText.trim()) {
      toast({
        title: "Annotation vide",
        description: "Veuillez saisir du texte pour votre annotation",
        variant: "destructive",
      });
      return;
    }

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      content: newAnnotationText,
      author: {
        id: currentUserId,
        name: currentUserName,
        initials: getInitials(currentUserName),
      },
      createdAt: new Date(),
      position: newAnnotationPosition,
      likes: [],
      replies: [],
    };

    const updatedAnnotations = [...annotations, newAnnotation];
    setAnnotations(updatedAnnotations);
    setIsAddingAnnotation(false);
    setNewAnnotationText("");

    if (onAnnotationAdded) {
      onAnnotationAdded(newAnnotation);
    }

    toast({
      title: "Annotation ajoutée",
      description: "Votre annotation a été ajoutée avec succès",
    });
  };

  // Ajouter une réponse à une annotation
  const addReply = (annotationId: string) => {
    if (!replyText.trim()) return;

    const annotationIndex = annotations.findIndex((a) => a.id === annotationId);
    if (annotationIndex === -1) return;

    const updatedAnnotations = [...annotations];
    const annotation = { ...updatedAnnotations[annotationIndex] };

    const newReply: AnnotationReply = {
      id: Date.now().toString(),
      content: replyText,
      author: {
        id: currentUserId,
        name: currentUserName,
        initials: getInitials(currentUserName),
      },
      createdAt: new Date(),
    };

    annotation.replies = [...(annotation.replies || []), newReply];
    updatedAnnotations[annotationIndex] = annotation;

    setAnnotations(updatedAnnotations);
    setReplyText("");

    if (onAnnotationUpdated) {
      onAnnotationUpdated(annotation);
    }
  };

  // Liker une annotation
  const toggleLike = (annotationId: string) => {
    const annotationIndex = annotations.findIndex((a) => a.id === annotationId);
    if (annotationIndex === -1) return;

    const updatedAnnotations = [...annotations];
    const annotation = { ...updatedAnnotations[annotationIndex] };
    
    const userLikedIndex = annotation.likes.indexOf(currentUserId);
    
    if (userLikedIndex === -1) {
      // Ajouter un like
      annotation.likes = [...annotation.likes, currentUserId];
    } else {
      // Retirer un like
      annotation.likes = annotation.likes.filter(id => id !== currentUserId);
    }
    
    updatedAnnotations[annotationIndex] = annotation;
    setAnnotations(updatedAnnotations);

    if (onAnnotationUpdated) {
      onAnnotationUpdated(annotation);
    }
  };

  // Supprimer une annotation
  const deleteAnnotation = (annotationId: string) => {
    const updatedAnnotations = annotations.filter((a) => a.id !== annotationId);
    setAnnotations(updatedAnnotations);

    if (onAnnotationDeleted) {
      onAnnotationDeleted(annotationId);
    }

    toast({
      title: "Annotation supprimée",
      description: "L'annotation a été supprimée avec succès",
    });
  };

  // Gérer le clic pour ajouter une annotation
  const handleNoteClick = (e: React.MouseEvent) => {
    if (readOnly || isAddingAnnotation) return;

    const rect = noteContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setNewAnnotationPosition({ x, y });
    setIsAddingAnnotation(true);
  };

  // Obtenir les initiales d'un nom
  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Formater la date
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="relative">
      {/* Conteneur de note avec annotations */}
      <div
        ref={noteContainerRef}
        className="relative border rounded-lg p-4 bg-white min-h-[400px]"
        onClick={handleNoteClick}
      >
        {/* Contenu de la note */}
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: content }} />

        {/* Bouton d'ajout d'annotation */}
        {!readOnly && !isAddingAnnotation && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAddingAnnotation(true);
                    setNewAnnotationPosition({ x: 95, y: 5 });
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ajouter une annotation</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Annotations existantes */}
        {annotations.map((annotation) => (
          <div
            key={annotation.id}
            className="absolute inline-block"
            style={{
              left: `${annotation.position.x}%`,
              top: `${annotation.position.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <Popover open={activeAnnotation === annotation.id} onOpenChange={(open) => {
              if (open) {
                setActiveAnnotation(annotation.id);
              } else if (activeAnnotation === annotation.id) {
                setActiveAnnotation(null);
              }
            }}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 rounded-full bg-primary-500 text-white hover:bg-primary-600 border-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveAnnotation(
                      activeAnnotation === annotation.id ? null : annotation.id
                    );
                  }}
                >
                  <span className="text-xs font-semibold">
                    {annotation.author.initials}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-80"
                align="start"
                sideOffset={5}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {annotation.author.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium">
                          {annotation.author.name}
                        </p>
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500">
                            {formatDate(annotation.createdAt)}
                          </span>
                          {annotation.author.id === currentUserId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 ml-1"
                              onClick={() => deleteAnnotation(annotation.id)}
                            >
                              <Trash2 className="h-3 w-3 text-gray-400 hover:text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm mt-1">{annotation.content}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-6 px-2 text-xs ${
                            annotation.likes.includes(currentUserId)
                              ? "text-primary-500"
                              : "text-gray-500"
                          }`}
                          onClick={() => toggleLike(annotation.id)}
                        >
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          {annotation.likes.length > 0 && annotation.likes.length}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-gray-500"
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          {annotation.replies?.length || 0}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Réponses */}
                  {annotation.replies && annotation.replies.length > 0 && (
                    <ScrollArea className="max-h-40">
                      <div className="pl-10 space-y-3">
                        {annotation.replies.map((reply) => (
                          <div key={reply.id} className="flex items-start space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback>
                                {reply.author.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center">
                                <p className="text-xs font-medium">
                                  {reply.author.name}
                                </p>
                                <span className="text-xs text-gray-500 ml-2">
                                  {formatDate(reply.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs mt-1">{reply.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}

                  {/* Ajouter une réponse */}
                  {!readOnly && (
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>
                          {getInitials(currentUserName)}
                        </AvatarFallback>
                      </Avatar>
                      <Input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Ajouter une réponse..."
                        className="h-8 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            addReply(annotation.id);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() => addReply(annotation.id)}
                        disabled={!replyText.trim()}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ))}

        {/* Interface d'ajout d'annotation */}
        {isAddingAnnotation && (
          <div
            className="absolute inline-block z-10"
            style={{
              left: `${newAnnotationPosition.x}%`,
              top: `${newAnnotationPosition.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white border rounded-lg shadow-lg p-3 w-64">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium">Nouvelle annotation</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => setIsAddingAnnotation(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <Textarea
                value={newAnnotationText}
                onChange={(e) => setNewAnnotationText(e.target.value)}
                placeholder="Votre annotation..."
                className="min-h-20 text-sm mb-2"
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingAnnotation(false)}
                >
                  Annuler
                </Button>
                <Button size="sm" onClick={addAnnotation}>
                  <Save className="h-4 w-4 mr-1" />
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Indicateur du nombre d'annotations */}
      <div className="mt-2 flex items-center text-sm text-gray-500">
        <MessageSquare className="h-4 w-4 mr-1" />
        {annotations.length} annotation{annotations.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}