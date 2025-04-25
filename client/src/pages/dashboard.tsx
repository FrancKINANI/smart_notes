import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PlusIcon, UploadIcon } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import ProgressSection from "@/components/dashboard/progress-section";
import RecentNotes from "@/components/dashboard/recent-notes";
import RevisionReminders from "@/components/dashboard/revision-reminders";
import FeaturesShowcase from "@/components/dashboard/features-showcase";
import UploadModal from "@/components/modals/upload-modal";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function Dashboard() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const { user, isLoading: isAuthLoading } = useAuth();

  // Affichage d'un loader si l'auth est en cours
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-lg text-gray-500">
          Chargement de votre tableau de bord...
        </span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-lg text-gray-500">
          Veuillez vous connecter pour accéder à votre tableau de bord.
        </span>
      </div>
    );
  }

  const userId = user.id;

  // Fetch recent notes
  const { data: recentNotes, isLoading: isLoadingNotes } = useQuery({
    queryKey: ["/api/notes/recent", { userId, limit: 3 }],
    queryFn: () =>
      fetch(`/api/notes/recent?userId=${userId}&limit=3`).then((res) =>
        res.json()
      ),
  });

  // Fetch revision items
  const { data: revisionItems, isLoading: isLoadingRevisionItems } = useQuery({
    queryKey: ["/api/revision-items/due", { userId }],
    queryFn: () =>
      fetch(`/api/revision-items/due?userId=${userId}`).then((res) =>
        res.json()
      ),
  });

  // Actions for the header
  const headerActions = (
    <>
      <Button asChild>
        <Link href="/notes/create">
          <PlusIcon className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Nouvelle note</span>
          <span className="sm:hidden">Note</span>
        </Link>
      </Button>
      <Button variant="outline" onClick={() => setIsUploadModalOpen(true)}>
        <UploadIcon className="mr-2 h-4 w-4" />
        <span className="hidden sm:inline">Importer</span>
        <span className="sm:hidden">Import</span>
      </Button>
    </>
  );

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Bienvenue dans votre espace d'apprentissage"
        actions={headerActions}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-6">
        {/* Progress stats */}
        <ProgressSection userId={userId} />

        {/* Recent notes */}
        <RecentNotes notes={recentNotes || []} isLoading={isLoadingNotes} />

        {/* Revision reminders */}
        <RevisionReminders
          items={revisionItems || []}
          isLoading={isLoadingRevisionItems}
        />

        {/* Features showcase */}
        <FeaturesShowcase />
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
