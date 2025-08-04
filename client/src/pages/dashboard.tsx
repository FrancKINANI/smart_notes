import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PlusIcon, UploadIcon } from "lucide-react";
import EnhancedDashboard from "@/components/dashboard/enhanced-dashboard";
import UploadModal from "@/components/modals/upload-modal";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function Dashboard() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const { user, isLoading: isAuthLoading } = useAuth();

  // Show loading state while authentication is in progress
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <span className="text-lg text-gray-500 dark:text-gray-400">
            Loading your dashboard...
          </span>
        </div>
      </div>
    );
  }

  // Enhanced dashboard handles the no-user state internally
  return (
    <>
      <EnhancedDashboard />

      {/* Upload modal */}
      {user && (
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          userId={user.id}
        />
      )}
    </>
  );
}
