import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Share,
  Copy,
  UserPlus,
  BookOpen,
  MessageSquare,
  ArrowLeft,
  Clipboard,
  CheckCircle2,
} from "lucide-react";

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

  // Fetch the group details
  const { data: group, isLoading: groupLoading } = useQuery<StudyGroup>({
    queryKey: [`/api/study-groups/${groupId}`],
    queryFn: async () => {
      const res = await apiRequest(`/api/study-groups/${groupId}`);
      if (!res.ok) {
        throw new Error("Unable to retrieve group details");
      }
      return res.json();
    },
  });

  // Fetch the group members
  const { data: members, isLoading: membersLoading } = useQuery<Member[]>({
    queryKey: [`/api/study-groups/${groupId}/members`],
    queryFn: async () => {
      const res = await apiRequest(`/api/study-groups/${groupId}/members`);
      if (!res.ok) {
        throw new Error("Unable to retrieve group members");
      }
      return res.json();
    },
  });

  // Fetch the shared notes
  const { data: sharedNotes, isLoading: notesLoading } = useQuery<SharedNote[]>(
    {
      queryKey: [`/api/study-groups/${groupId}/shared-notes`],
      queryFn: async () => {
        const res = await apiRequest(
          `/api/study-groups/${groupId}/shared-notes`
        );
        if (!res.ok) {
          throw new Error("Unable to retrieve shared notes");
        }
        return res.json();
      },
    }
  );

  // Fetch the user's notes for sharing
  const { data: userNotes } = useQuery({
    queryKey: ["/api/notes", user?.id],
    queryFn: async () => {
      const res = await apiRequest(`/api/notes?userId=${user?.id}`);
      if (!res.ok) {
        throw new Error("Unable to retrieve your notes");
      }
      return res.json();
    },
    enabled: !!user && shareNoteDialog,
  });

  // Share a note
  const shareNoteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedNote) {
        throw new Error("Please select a note to share");
      }

      const res = await apiRequest(
        `/api/study-groups/${groupId}/shared-notes`,
        {
          method: "POST",
          body: JSON.stringify({
            noteId: selectedNote,
            permissions: selectedPermission,
          }),
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Error while sharing the note");
      }

      return res.json();
    },
    onSuccess: () => {
      // Refresh the shared notes list
      queryClient.invalidateQueries({
        queryKey: [`/api/study-groups/${groupId}/shared-notes`],
      });

      toast({
        title: "Note shared",
        description: "Your note has been shared successfully",
      });

      setShareNoteDialog(false);
      setSelectedNote(null);
      setSelectedPermission("read");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle sharing the invitation code
  const copyInviteCode = () => {
    if (group?.inviteCode) {
      navigator.clipboard.writeText(group.inviteCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Determine if the user is the group administrator
  const isAdmin = members?.some(
    (member) =>
      member.userId === user?.id &&
      (member.role === "admin" || member.userId === group?.creatorId)
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
          <h2 className="text-2xl font-bold">Group not found</h2>
          <p className="text-muted-foreground mt-2">
            The study group you are looking for does not exist or you do not
            have the required permissions.
          </p>
          <Link href="/study-groups">
            <Button className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to groups
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
            {group.description || "No description"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 justify-between items-center">
        <div className="flex items-center">
          <div className="bg-primary/10 text-primary rounded-full p-2">
            <Users className="h-5 w-5" />
          </div>
          <span className="ml-2 text-sm text-muted-foreground">
            {members?.length || 0} members
          </span>
          {group.isPrivate && (
            <span className="ml-4 text-sm bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
              Private group
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {isAdmin && group.isPrivate && (
            <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite members</DialogTitle>
                  <DialogDescription>
                    Share this invitation code to let other
                    people join your study group.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                    <code className="text-sm font-mono">
                      {group.inviteCode}
                    </code>
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
                      Invitation code copied!
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
                Share a note
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share a note</DialogTitle>
                <DialogDescription>
                  Share one of your notes with the members of this study
                  group.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="note">Select a note</Label>
                  <Select
                    value={selectedNote?.toString() || ""}
                    onValueChange={(value) => setSelectedNote(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a note" />
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
                      <SelectItem value="read">Read only</SelectItem>
                      <SelectItem value="comment">
                        Read + Comments
                      </SelectItem>
                      <SelectItem value="edit">
                        Read + Comments + Edit
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShareNoteDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={() => shareNoteMutation.mutate()}>
                  Share
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
            Shared notes
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="mt-6">
          {sharedNotes && sharedNotes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedNotes.map((shared) => (
                <Link href={`/notes/${shared.noteId}`} key={shared.id}>
                  <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                    <CardHeader>
                      <CardTitle className="line-clamp-1">
                        {shared.note.title}
                      </CardTitle>
                      <CardDescription className="flex items-center text-xs">
                        <span>
                          Shared by{" "}
                          {shared.sharedByUser.displayName ||
                            shared.sharedByUser.username}
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
                        Shared on{" "}
                        {new Date(shared.sharedAt).toLocaleDateString()}
                      </span>
                      <div className="flex items-center">
                        <MessageSquare className="h-3.5 w-3.5 mr-1" />
                        <span>Comments</span>
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No shared note</h3>
              <p className="text-muted-foreground mt-2 mb-6">
                No note has been shared in this study group yet.
              </p>
              <Button onClick={() => setShareNoteDialog(true)}>
                <Share className="mr-2 h-4 w-4" /> Share a note
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
                  Invite members
                </Button>
              </div>
            )}

            <div className="space-y-4">
              {members?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={member.user.avatar || ""} />
                      <AvatarFallback>
                        {(member.user.displayName || member.user.username)
                          .substring(0, 2)
                          .toUpperCase()}
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
                        Creator
                      </span>
                    ) : member.role === "admin" ? (
                      <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded-full">
                        Admin
                      </span>
                    ) : (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                        Member
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
