import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PlusIcon, UploadIcon } from "lucide-react";
import ProgressSection from "@/components/dashboard/progress-section";
import RecentNotes from "@/components/dashboard/recent-notes";
import RevisionReminders from "@/components/dashboard/revision-reminders";
import FeaturesShowcase from "@/components/dashboard/features-showcase";
import UploadModal from "@/components/modals/upload-modal";
import { useState } from "react";

export default function Dashboard() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  // Default user ID for demo purposes
  const userId = 1;
  
  // Fetch recent notes
  const { data: recentNotes, isLoading: isLoadingNotes } = useQuery({
    queryKey: ["/api/notes/recent", { userId, limit: 3 }],
    queryFn: () => fetch(`/api/notes/recent?userId=${userId}&limit=3`).then(res => res.json())
  });
  
  // Fetch revision items
  const { data: revisionItems, isLoading: isLoadingRevisionItems } = useQuery({
    queryKey: ["/api/revision-items/due", { userId }],
    queryFn: () => fetch(`/api/revision-items/due?userId=${userId}`).then(res => res.json())
  });
  
  return (
    <>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Tableau de bord</h1>
            <div className="flex space-x-3">
              <Button asChild>
                <Link to="/notes/create">
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Nouvelle note
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setIsUploadModalOpen(true)}>
                <UploadIcon className="mr-2 h-4 w-4" />
                Importer
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="py-4">
            {/* Progress stats */}
            <ProgressSection userId={userId} />
            
            {/* Recent notes */}
            <RecentNotes 
              notes={recentNotes || []} 
              isLoading={isLoadingNotes} 
            />
            
            {/* Revision reminders */}
            <RevisionReminders 
              items={revisionItems || []} 
              isLoading={isLoadingRevisionItems} 
            />
            
            {/* Features showcase */}
            <FeaturesShowcase />
          </div>
        </div>
      </div>
      
      {/* Upload modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        userId={userId}
      />
    </>
  );
}
