import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Send, Loader2 } from "lucide-react";

interface Comment {
  id: number;
  noteId: number;
  userId: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
}

interface CommentSectionProps {
  noteId: number;
}

export function CommentSection({ noteId }: CommentSectionProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [comment, setComment] = useState("");

  // Récupérer les commentaires
  const { data: comments, isLoading } = useQuery<Comment[]>({
    queryKey: [`/api/notes/${noteId}/comments`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/notes/${noteId}/comments`);
      if (!res.ok) {
        throw new Error("Impossible de récupérer les commentaires");
      }
      return res.json();
    },
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
  });

  // Ajouter un commentaire
  const addCommentMutation = useMutation({
    mutationFn: async () => {
      if (!comment.trim()) {
        throw new Error("Le commentaire ne peut pas être vide");
      }
      
      const res = await apiRequest("POST", `/api/notes/${noteId}/comments`, {
        content: comment.trim()
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Erreur lors de l'ajout du commentaire");
      }
      
      return res.json();
    },
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: [`/api/notes/${noteId}/comments`] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addCommentMutation.mutate();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) {
      return "à l'instant";
    } else if (diffMins < 60) {
      return `il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    } else if (diffMins < 24 * 60) {
      const hours = Math.floor(diffMins / 60);
      return `il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(diffMins / (24 * 60));
      if (days < 7) {
        return `il y a ${days} jour${days > 1 ? 's' : ''}`;
      } else {
        return date.toLocaleDateString();
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Commentaires</h3>
        <span className="text-muted-foreground text-sm">
          {comments?.length || 0} commentaire{comments?.length !== 1 ? "s" : ""}
        </span>
      </div>
      
      <Separator />
      
      {isAuthenticated && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="Ajouter un commentaire..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!comment.trim() || addCommentMutation.isPending}
            >
              {addCommentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Commenter
                </>
              )}
            </Button>
          </div>
        </form>
      )}
      
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : comments?.length ? (
          comments.map((comment) => (
            <Card key={comment.id}>
              <CardHeader className="p-4 pb-2 flex flex-row items-start space-y-0 space-x-4">
                <Avatar>
                  <AvatarImage src={comment.user.avatar || ""} />
                  <AvatarFallback>
                    {(comment.user.displayName || comment.user.username).substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="font-medium leading-none">
                    {comment.user.displayName || comment.user.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(comment.createdAt)}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <p className="text-sm">{comment.content}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Aucun commentaire pour le moment. Soyez le premier à partager vos réflexions!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}