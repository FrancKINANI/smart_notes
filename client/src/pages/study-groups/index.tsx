import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api-client";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Users, Plus, UserPlus, Lock, Unlock, BookOpen } from "lucide-react";

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

export default function StudyGroupsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newGroupDialog, setNewGroupDialog] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    isPrivate: false,
  });

  // Récupérer les groupes d'étude de l'utilisateur
  const {
    data: studyGroups,
    isLoading,
    error,
    refetch,
  } = useQuery<StudyGroup[]>({
    queryKey: ["/api/study-groups"],
    queryFn: async () => {
      const res = await apiRequest("/api/study-groups");
      if (!res.ok) {
        throw new Error("Impossible de récupérer les groupes d'étude");
      }
      return res.json();
    },
  });

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newGroup.name) {
      toast({
        title: "Erreur",
        description: "Le nom du groupe est requis",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await apiRequest("/api/study-groups", {
        method: "POST",
        body: JSON.stringify(newGroup),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(
          error.message || "Erreur lors de la création du groupe"
        );
      }

      toast({
        title: "Groupe créé",
        description: "Votre groupe d'étude a été créé avec succès",
      });

      setNewGroupDialog(false);
      setNewGroup({ name: "", description: "", isPrivate: false });
      refetch(); // Actualiser la liste des groupes
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Groupes d'étude</h1>
          <p className="text-muted-foreground">
            Collaborez avec d'autres étudiants pour améliorer votre
            apprentissage
          </p>
        </div>
        <Dialog open={newGroupDialog} onOpenChange={setNewGroupDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nouveau groupe
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un nouveau groupe d'étude</DialogTitle>
              <DialogDescription>
                Créez un groupe pour partager vos notes et collaborer avec
                d'autres étudiants.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateGroup}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du groupe</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Groupe de biologie avancée"
                    value={newGroup.name}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optionnelle)</Label>
                  <Input
                    id="description"
                    placeholder="Décrivez le but de ce groupe d'étude"
                    value={newGroup.description}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, description: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="private"
                    checked={newGroup.isPrivate}
                    onCheckedChange={(checked) =>
                      setNewGroup({ ...newGroup, isPrivate: checked })
                    }
                  />
                  <Label htmlFor="private">
                    Groupe privé (accès sur invitation uniquement)
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setNewGroupDialog(false)}
                >
                  Annuler
                </Button>
                <Button type="submit">Créer le groupe</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="mygroups">
        <TabsList>
          <TabsTrigger value="mygroups">Mes groupes</TabsTrigger>
          <TabsTrigger value="discover">Découvrir</TabsTrigger>
        </TabsList>
        <TabsContent value="mygroups" className="space-y-4 mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>
                Impossible de charger vos groupes d'étude.
              </AlertDescription>
            </Alert>
          ) : studyGroups && studyGroups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {studyGroups.map((group) => (
                <Link href={`/study-groups/${group.id}`} key={group.id}>
                  <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle>{group.name}</CardTitle>
                        {group.isPrivate ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Unlock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <CardDescription className="line-clamp-2">
                        {group.description || "Aucune description"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="mr-2 h-4 w-4" />
                        <span>Membres</span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground mt-2">
                        <BookOpen className="mr-2 h-4 w-4" />
                        <span>Notes partagées</span>
                      </div>
                    </CardContent>
                    <CardFooter className="text-xs text-muted-foreground">
                      Créé le {new Date(group.createdAt).toLocaleDateString()}
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Aucun groupe d'étude</h3>
              <p className="text-muted-foreground mt-2 mb-6">
                Vous n'avez pas encore rejoint ou créé de groupe d'étude.
              </p>
              <Button onClick={() => setNewGroupDialog(true)}>
                <Plus className="mr-2 h-4 w-4" /> Créer un groupe
              </Button>
            </div>
          )}
        </TabsContent>
        <TabsContent value="discover" className="mt-6">
          <div className="text-center py-12 px-4">
            <UserPlus className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Rejoindre un groupe</h3>
            <p className="text-muted-foreground mt-2 mb-6 max-w-md mx-auto">
              Pour rejoindre un groupe privé, demandez le code d'invitation à un
              membre du groupe et entrez-le ci-dessous.
            </p>
            <div className="flex max-w-md mx-auto">
              <Input placeholder="Code d'invitation" className="mr-2" />
              <Button>Rejoindre</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
