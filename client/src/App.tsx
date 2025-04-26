import { Switch, Route, Router } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import AssistantModal from "@/components/modals/assistant-modal";
import { useModal } from "@/hooks/use-modal";
import { OfflineIndicator } from "./components/ui/offline-indicator";
import { registerBackgroundSync } from "./lib/serviceWorkerRegistration";
import { SyncStatus } from "./components/ui/sync-status";
import { ErrorBoundary } from "react-error-boundary";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Notes from "@/pages/notes/index";
import ViewNote from "@/pages/notes/view";
import CreateNote from "@/pages/notes/create";
import Flashcards from "@/pages/flashcards";
import QuizIndex from "@/pages/quizzes/index";
import TakeQuiz from "@/pages/quizzes/take";
import Schedule from "@/pages/schedule";
import Assistant from "@/pages/assistant";
import AuthPage from "@/pages/auth-page";
import StudyGroups from "@/pages/study-groups/index";
import StudyGroupDetails from "@/pages/study-groups/[id]";
import ProfilePage from "@/pages/profile";

import Sidebar from "@/components/layout/sidebar";
import MobileHeader from "@/components/layout/mobile-header";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/hooks/use-auth";

// Le hook useAuth est déjà implémenté dans src/hooks/use-auth.ts

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Une erreur est survenue</h2>
        <pre className="text-sm text-red-500 bg-red-50 p-4 rounded">
          {error.message}
        </pre>
      </div>
    </div>
  );
}

function App() {
  const { isOpen, close, content } = useModal();

  // Register background sync when the app loads
  useEffect(() => {
    registerBackgroundSync().catch(console.error);
  }, []);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MainLayout>
            <Router>
              <Switch>
                <ProtectedRoute path="/" component={Dashboard} />
                <ProtectedRoute path="/notes" component={Notes} />
                <ProtectedRoute path="/notes/create" component={CreateNote} />
                <ProtectedRoute path="/notes/edit/:id" component={CreateNote} />
                <ProtectedRoute path="/notes/:id" component={ViewNote} />
                <ProtectedRoute path="/flashcards" component={Flashcards} />
                <ProtectedRoute path="/quizzes" component={QuizIndex} />
                <ProtectedRoute path="/quizzes/:id" component={TakeQuiz} />
                <ProtectedRoute path="/schedule" component={Schedule} />
                <ProtectedRoute path="/assistant" component={Assistant} />
                <ProtectedRoute path="/study-groups" component={StudyGroups} />
                <ProtectedRoute
                  path="/study-groups/:id"
                  component={StudyGroupDetails}
                />
                <ProtectedRoute path="/profile" component={ProfilePage} />
                <Route path="/auth" component={AuthPage} />
                <Route component={NotFound} />
              </Switch>
              <OfflineIndicator />
              <SyncStatus />
            </Router>
          </MainLayout>
          <Toaster />
          <AssistantModal
            isOpen={isOpen}
            onClose={close}
            initialContent={content}
          />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  // Si l'utilisateur n'est pas authentifié, ne pas afficher la mise en page principale
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <MobileHeader onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}

export default App;
