import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Play, FileQuestion } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Note, Subject } from "@shared/schema";
import { cn } from "@/lib/utils";

interface NoteCardProps {
  note: Note;
  subject?: Subject;
}

export default function NoteCard({ note, subject }: NoteCardProps) {
  // Format date to relative time (e.g., "2 days ago")
  const formattedDate = formatDistanceToNow(new Date(note.createdAt), { addSuffix: true });
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-300">
      <CardContent className="p-5">
        <div className="flex justify-between mb-2">
          {subject && (
            <Badge 
              variant="outline" 
              className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-medium",
              )}
              style={{ 
                backgroundColor: `${subject.color}20`, 
                color: subject.color 
              }}
            >
              {subject.name}
            </Badge>
          )}
          <span className="text-sm text-gray-500">{formattedDate}</span>
        </div>
        
        <Link href={`/notes/${note.id}`}>
          <h3 className="text-base font-medium text-gray-900 mb-2 hover:text-primary-600 cursor-pointer">
            {note.title}
          </h3>
        </Link>
        
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
          {note.content.length > 120 
            ? `${note.content.substring(0, 120)}...` 
            : note.content}
        </p>
        
        <div className="flex space-x-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/notes/${note.id}?action=audio`}>
              <Play className="mr-1 h-3 w-3" /> Audio
            </Link>
          </Button>
          
          <Button size="sm" variant="outline" asChild>
            <Link href={`/notes/${note.id}?action=quiz`}>
              <FileQuestion className="mr-1 h-3 w-3" /> Quiz
            </Link>
          </Button>
          
          <Button size="sm" variant="outline" asChild>
            <Link href={`/notes/${note.id}`}>
              <Edit className="mr-1 h-3 w-3" /> Modifier
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
