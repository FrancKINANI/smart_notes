import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Users, Share, Copy, UserPlus, BookOpen, MessageSquare, ArrowLeft, Clipboard, CheckCircle2 } from "lucide-react";

interface StudyGroup {
  id: number;
  name: string;
  description: string | null;
  creatorId: number;
  isPrivate: boolean;
  inviteCode: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Member {
  id: number;
  groupId: number;
  userId: number;
  role: string;
  joinedAt: string;
  user: {
    id: number;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
}

interface SharedNote {
  id: number;
  noteId: number;
  groupId: number;
  sharedBy: number;
  permissions: string;
  sharedAt: string;
  note: {
    id: number;
    title: string;
    content: string;
    summary: string | null;
    createdAt: string;
  };
  sharedByUser: {
    id: number;
    username: string;
    displayName: string | null;
  };
}

export default function StudyGroupDetailsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, params] = useRoute("/study-groups/:id");
  const groupId = params ? parseInt(params.id) : 0;
  
  const [inviteDialog, setInviteDialog] = useState(false);
  const [shareNoteDialog, setShareNoteDialog] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedNote, setSelectedNote] = useState<number | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<string>("read");

  // Récupérer les détails du groupe
  const { data: group, isLoading: groupLoading } = useQuery<StudyGroup>({
    queryKey: [`/api/study-groups/${groupId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/study-groups/${groupId}`);
      if (!res.ok) {
        throw new Error("Impossible de récupérer les détails du groupe");
      }
      return res.json();
    },
  });

  // Récupérer les membres du groupe
  const { data: members, isLoading: membersLoading } = useQuery<Member[]>({
    queryKey: [`/api/study-groups/${groupId}/members`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/study-groups/${groupId}/members`);
      if (!res.ok) {
        throw new Error("Impossible de récupérer les membres du groupe");
      }
      return res.json();
    },
  });

  // Récupérer les notes partagées
  const { data: sharedNotes, isLoading: notesLoading } = useQuery<SharedNote[]>({
    queryKey: [`/api/study-groups/${groupId}/shared-notes`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/study-groups/${groupId}/shared-notes`);
      if (!res.ok) {
        throw new Error("Impossible de récupérer les notes partagées");
      }
      return res.json();
    },
  });

  // Récupérer les notes de l'utilisateur pour le partage
  const { data: userNotes } = useQuery({
    queryKey: ["/api/notes", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/notes?userId=${user?.id}`);
      if (!res.ok) {
        throw new Error("Impossible de récupérer vos notes");
      }
      return res.json();
    },
    enabled: !!user && shareNoteDialog,
  });

  // Partager une note
  const shareNoteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedNote) {
        throw new Error("Veuillez sélectionner une note à partager");
      }
      
      const res = await apiRequest("POST", `/api/study-groups/${groupId}/shared-notes`, {
        noteId: selectedNote,
        permissions: selectedPermission
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Erreur lors du partage de la note");
      }
      
      return res.json();
    },
    onSuccess: () => {
      // Actualiser la liste des notes partagées
      queryClient.invalidateQueries({ queryKey: [`/api/study-groups/${groupId}/shared-notes`] });
      
      toast({
        title: "Note partagée",
        description: "Votre note a été partagée avec succès",
      });
      
      setShareNoteDialog(false);
      setSelectedNote(null);
      setSelectedPermission("read");
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Gérer le partage du code d'invitation
  const copyInviteCode = () => {
    if (group?.inviteCode) {
      navigator.clipboard.writeText(group.inviteCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Déterminer si l'utilisateur est l'administrateur du groupe
  const isAdmin = members?.some(
    member => member.userId === user?.id && (member.role === "admin" || member.userId === group?.creatorId)
  );

  if (groupLoading || membersLoading || notesLoading) {
    return (
      <div className="container py-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container py-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Groupe non trouvé</h2>
          <p className="text-muted-foreground mt-2">
            Le groupe d'étude que vous recherchez n'existe pas ou vous n'avez pas les permissions nécessaires.
          </p>
          <Link href="/study-groups">
            <Button className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux groupes
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/study-groups">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>
          <p className="text-muted-foreground">
            {group.description || "Aucune description"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 justify-between items-center">
        <div className="flex items-center">
          <div className="bg-primary/10 text-primary rounded-full p-2">
            <Users className="h-5 w-5" />
          </div>
          <span className="ml-2 text-sm text-muted-foreground">
            {members?.length || 0} membres
          </span>
          {group.isPrivate && (
            <span className="ml-4 text-sm bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
              Groupe privé
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {isAdmin && group.isPrivate && (
            <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Inviter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Inviter des membres</DialogTitle>
                  <DialogDescription>
                    Partagez ce code d'invitation pour permettre à d'autres personnes de rejoindre votre groupe d'étude.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                    <code className="text-sm font-mono">{group.inviteCode}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={copyInviteCode}
                      className="h-8 w-8"
                    >
                      {copySuccess ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clipboard className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {copySuccess && (
                    <p className="text-sm text-green-500">
                      Code d'invitation copié!
                    </p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={shareNoteDialog} onOpenChange={setShareNoteDialog}>
            <DialogTrigger asChild>
              <Button>
                <Share className="mr-2 h-4 w-4" />
                Partager une note
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Partager une note</DialogTitle>
                <DialogDescription>
                  Partagez l'une de vos notes avec les membres de ce groupe d'étude.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="note">Sélectionnez une note</Label>
                  <Select
                    value={selectedNote?.toString() || ""}
                    onValueChange={(value) => setSelectedNote(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une note" />
                    </SelectTrigger>
                    <SelectContent>
                      {userNotes?.map((note: any) => (
                        <SelectItem key={note.id} value={note.id.toString()}>
                          {note.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permissions">Permissions</Label>
                  <Select
                    value={selectedPermission}
                    onValueChange={setSelectedPermission}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="read">Lecture seule</SelectItem>
                      <SelectItem value="comment">Lecture + Commentaires</SelectItem>
                      <SelectItem value="edit">Lecture + Commentaires + Édition</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShareNoteDialog(false)}
                >
                  Annuler
                </Button>
                <Button onClick={() => shareNoteMutation.mutate()}>
                  Partager
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="notes">
        <TabsList>
          <TabsTrigger value="notes">
            <BookOpen className="h-4 w-4 mr-2" />
            Notes partagées
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Membres
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="notes" className="mt-6">
          {sharedNotes && sharedNotes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedNotes.map((shared) => (
                <Link href={`/notes/${shared.noteId}`} key={shared.id}>
                  <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                    <CardHeader>
                      <CardTitle className="line-clamp-1">{shared.note.title}</CardTitle>
                      <CardDescription className="flex items-center text-xs">
                        <span>
                          Partagée par {shared.sharedByUser.displayName || shared.sharedByUser.username}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm line-clamp-3">
                        {shared.note.summary || shared.note.content}
                      </p>
                    </CardContent>
                    <CardFooter className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        Partagée le {new Date(shared.sharedAt).toLocaleDateString()}
                      </span>
                      <div className="flex items-center">
                        <MessageSquare className="h-3.5 w-3.5 mr-1" />
                        <span>Commentaires</span>
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Aucune note partagée</h3>
              <p className="text-muted-foreground mt-2 mb-6">
                Aucune note n'a encore été partagée dans ce groupe d'étude.
              </p>
              <Button onClick={() => setShareNoteDialog(true)}>
                <Share className="mr-2 h-4 w-4" /> Partager une note
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="members" className="mt-6">
          <div className="space-y-6">
            {isAdmin && (
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setInviteDialog(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Inviter des membres
                </Button>
              </div>
            )}
            
            <div className="space-y-4">
              {members?.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={member.user.avatar || ""} />
                      <AvatarFallback>
                        {(member.user.displayName || member.user.username).substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {member.user.displayName || member.user.username}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        @{member.user.username}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {member.userId === group.creatorId ? (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                        Créateur
                      </span>
                    ) : member.role === "admin" ? (
                      <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded-full">
                        Admin
                      </span>
                    ) : (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                        Membre
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}