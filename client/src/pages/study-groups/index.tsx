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

  // Fetch the user's study groups
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
        throw new Error("Unable to retrieve study groups");
      }
      return res.json();
    },
  });

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newGroup.name) {
      toast({
        title: "Error",
        description: "Group name is required",
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
          error.message || "Error while creating the group"
        );
      }

      toast({
        title: "Group created",
        description: "Your study group has been created successfully",
      });

      setNewGroupDialog(false);
      setNewGroup({ name: "", description: "", isPrivate: false });
      refetch(); // Refresh the group list
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Study groups</h1>
          <p className="text-muted-foreground">
            Collaborate with other students to improve your
            learning
          </p>
        </div>
        <Dialog open={newGroupDialog} onOpenChange={setNewGroupDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a new study group</DialogTitle>
              <DialogDescription>
                Create a group to share your notes and collaborate with
                other students.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateGroup}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Group name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Advanced biology group"
                    value={newGroup.name}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    placeholder="Describe the purpose of this study group"
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
                    Private group (invitation only)
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setNewGroupDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create the group</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="mygroups">
        <TabsList>
          <TabsTrigger value="mygroups">My groups</TabsTrigger>
          <TabsTrigger value="discover">Discover</TabsTrigger>
        </TabsList>
        <TabsContent value="mygroups" className="space-y-4 mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Unable to load your study groups.
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
                        {group.description || "No description"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="mr-2 h-4 w-4" />
                        <span>Members</span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground mt-2">
                        <BookOpen className="mr-2 h-4 w-4" />
                        <span>Shared notes</span>
                      </div>
                    </CardContent>
                    <CardFooter className="text-xs text-muted-foreground">
                      Created on {new Date(group.createdAt).toLocaleDateString()}
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No study group</h3>
              <p className="text-muted-foreground mt-2 mb-6">
                You have not joined or created a study group yet.
              </p>
              <Button onClick={() => setNewGroupDialog(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create a group
              </Button>
            </div>
          )}
        </TabsContent>
        <TabsContent value="discover" className="mt-6">
          <div className="text-center py-12 px-4">
            <UserPlus className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Join a group</h3>
            <p className="text-muted-foreground mt-2 mb-6 max-w-md mx-auto">
              To join a private group, ask a group member for the invitation
              code and enter it below.
            </p>
            <div className="flex max-w-md mx-auto">
              <Input placeholder="Invitation code" className="mr-2" />
              <Button>Join</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
