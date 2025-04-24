import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";

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

import Sidebar from "@/components/layout/sidebar";
import MobileHeader from "@/components/layout/mobile-header";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/hooks/use-auth";

// Fournisseur d'authentification pour rendre le hook disponible dans toute l'application
function AuthProvider({ children }: { children: React.ReactNode }) {
  return children;
}

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/notes" component={Notes} />
      <ProtectedRoute path="/notes/create" component={CreateNote} />
      <ProtectedRoute path="/notes/:id" component={ViewNote} />
      <ProtectedRoute path="/flashcards" component={Flashcards} />
      <ProtectedRoute path="/quizzes" component={QuizIndex} />
      <ProtectedRoute path="/quizzes/:id" component={TakeQuiz} />
      <ProtectedRoute path="/schedule" component={Schedule} />
      <ProtectedRoute path="/assistant" component={Assistant} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <MainLayout>
            <Router />
          </MainLayout>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
