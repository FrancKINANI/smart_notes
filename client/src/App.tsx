import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";

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

import Sidebar from "@/components/layout/sidebar";
import MobileHeader from "@/components/layout/mobile-header";

// Mock user for demo
const DEFAULT_USER = {
  id: 1,
  username: "student",
  displayName: "Thomas Dubois",
  role: "student"
};

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/notes" component={Notes} />
      <Route path="/notes/create" component={CreateNote} />
      <Route path="/notes/:id" component={ViewNote} />
      <Route path="/flashcards" component={Flashcards} />
      <Route path="/quizzes" component={QuizIndex} />
      <Route path="/quizzes/:id" component={TakeQuiz} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/assistant" component={Assistant} />
      <Route component={NotFound} />
    </Switch>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
  const [user, setUser] = useState(DEFAULT_USER);

  // In a real app, we would check for authentication here
  useEffect(() => {
    // This is just a placeholder for authentication logic
    // We're using the default user for demo purposes
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MainLayout>
          <Router />
        </MainLayout>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
