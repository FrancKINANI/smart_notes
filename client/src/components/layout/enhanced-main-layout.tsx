import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Home,
  BookOpen,
  Brain,
  Users,
  Calendar,
  Settings,
  User,
  LogOut,
  Menu,
  Bell,
  Search,
  Plus,
  Zap,
  Target,
  TrendingUp,
  MessageSquare,
  PlayCircle,
  FileText,
  HelpCircle,
  Moon,
  Sun,
  Laptop
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "next-themes";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export default function EnhancedMainLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications] = useState(3); // Mock notification count

  const navigationSections: NavSection[] = [
    {
      title: "Main",
      items: [
        {
          title: "Dashboard",
          href: "/",
          icon: Home,
          description: "Overview and quick actions"
        },
        {
          title: "Notes",
          href: "/notes",
          icon: BookOpen,
          description: "Create and manage your notes"
        },
        {
          title: "Study Session",
          href: "/study-session",
          icon: PlayCircle,
          description: "Focus time with Pomodoro"
        },
        {
          title: "AI Assistant",
          href: "/ai-assistant",
          icon: Brain,
          badge: "New",
          description: "Get personalized help"
        }
      ]
    },
    {
      title: "Learning",
      items: [
        {
          title: "Flashcards",
          href: "/flashcards",
          icon: Zap,
          description: "Spaced repetition learning"
        },
        {
          title: "Quizzes",
          href: "/quizzes",
          icon: HelpCircle,
          description: "Test your knowledge"
        },
        {
          title: "Study Groups",
          href: "/study-groups",
          icon: Users,
          description: "Collaborative learning"
        },
        {
          title: "Schedule",
          href: "/schedule",
          icon: Calendar,
          description: "Plan your study time"
        }
      ]
    }
  ];

  const isActiveRoute = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  const handleLogout = async () => {
    await logout();
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-xl text-gradient">SmartNotes</span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="space-y-6">
          {navigationSections.map((section) => (
            <div key={section.title} className="px-3">
              <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={cn(
                        "nav-item group",
                        isActiveRoute(item.href) && "active"
                      )}
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="flex-1 truncate">{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Profile */}
      {user && (
        <div className="border-t border-border p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start p-2 h-auto">
                <div className="flex items-center gap-3 w-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>
                      {(user.displayName || user.username).substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.displayName || user.username}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-card border-r border-border">
          <SidebarContent />
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
            {/* Mobile Menu Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </Sheet>

            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notes, flashcards..."
                  className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-gray-700 transition-colors"
                />
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun className="mr-2 h-4 w-4" />
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon className="mr-2 h-4 w-4" />
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Laptop className="mr-2 h-4 w-4" />
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Quick Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="btn-gradient">
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/notes/create">
                      <FileText className="mr-2 h-4 w-4" />
                      New Note
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/study-session">
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Study Session
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/flashcards">
                      <Zap className="mr-2 h-4 w-4" />
                      Practice Flashcards
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/quizzes">
                      <HelpCircle className="mr-2 h-4 w-4" />
                      Take Quiz
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                {notifications > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
                    {notifications}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
