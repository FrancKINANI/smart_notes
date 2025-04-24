import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Edit, PlayCircle } from "lucide-react";
import { Note, Subject } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RecentNotesProps {
  notes: Note[];
  isLoading: boolean;
}

export default function RecentNotes({ notes, isLoading }: RecentNotesProps) {
  // Fetch subjects
  const { data: subjects, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ["/api/subjects"],
    queryFn: () => fetch("/api/subjects").then(res => res.json())
  });

  const getSubjectForNote = (note: Note) => {
    if (!subjects) return null;
    return subjects.find((s: Subject) => s.id === note.subjectId);
  };

  const getTimeSince = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  if (isLoading) {
    return (
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900">Notes récentes</h2>
        <Link href="/notes" className="text-sm font-medium text-primary-600 hover:text-primary-700">
          Voir toutes
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {notes.length > 0 ? (
          notes.map(note => {
            const subject = getSubjectForNote(note);
            return (
              <div 
                key={note.id} 
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300"
              >
                <div className="p-5">
                  <div className="flex justify-between mb-2">
                    {subject && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-medium",
                          subject.color && `bg-opacity-20 text-${subject.color}`
                        )}
                        style={{ 
                          backgroundColor: `${subject.color}20`, 
                          color: subject.color 
                        }}
                      >
                        {subject.name}
                      </Badge>
                    )}
                    <span className="text-sm text-gray-500">
                      {getTimeSince(note.createdAt)}
                    </span>
                  </div>

                  <h3 className="text-base font-medium text-gray-900 mb-2">
                    {note.title}
                  </h3>

                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                    {note.content.substring(0, 100)}...
                  </p>

                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/notes/${note.id}?action=audio`}>
                        <PlayCircle className="mr-1 h-3 w-3" /> Audio
                      </Link>
                    </Button>
                    
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/notes/${note.id}?action=quiz`}>
                        <div className="flex items-center">
                          <span className="mr-1">🎯</span> Quiz
                        </div>
                      </Link>
                    </Button>
                    
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/notes/${note.id}`}>
                        <Edit className="mr-1 h-3 w-3" /> Modifier
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500 mb-4">Vous n'avez pas encore de notes.</p>
            <Button asChild>
              <Link href="/notes/create">Créer votre première note</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
