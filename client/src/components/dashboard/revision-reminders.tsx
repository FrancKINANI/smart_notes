import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { BellRing } from "lucide-react";
import { RevisionItem } from "@shared/schema";

interface EnhancedRevisionItem extends RevisionItem {
  note?: {
    id: number;
    title: string;
  };
}

interface RevisionRemindersProps {
  items: EnhancedRevisionItem[];
  isLoading: boolean;
}

export default function RevisionReminders({ items, isLoading }: RevisionRemindersProps) {
  if (isLoading) {
    return (
      <div className="mb-10">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="mb-10">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Revision reminders</h2>
      
      {items.length > 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul role="list" className="divide-y divide-gray-200">
            {items.map((item) => (
              <li key={item.id}>
                <div className="block hover:bg-gray-50">
                  <div className="flex items-center px-4 py-4 sm:px-6">
                    <div className="min-w-0 flex-1 flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                          <BellRing className="h-6 w-6 text-amber-600" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 px-4">
                        <div>
                          <p className="text-sm font-medium text-primary-600 truncate">
                            Reminder: {item.note?.title || 'Scheduled revision'}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            Current mastery level: {item.masteryLevel}% - 
                            Review before {new Date(item.nextReviewDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Button 
                        size="sm" 
                        className="rounded-full"
                        asChild
                      >
                        <Link href={`/notes/${item.noteId}`}>
                          Review
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
          <p className="text-gray-500">
            No revision reminders for now. Keep taking notes and doing quizzes!
          </p>
        </div>
      )}
    </div>
  );
}
