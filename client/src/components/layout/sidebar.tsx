import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home,
  BookOpen,
  Club,
  HelpCircle,
  Calendar,
  MessageSquare,
  Users,
  User
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const [location] = useLocation();

  // Navigation items
  const navigationItems = [
    { name: "Dashboard", href: "/", icon: <Home className="mr-3 h-5 w-5" /> },
    { name: "Mes Notes", href: "/notes", icon: <BookOpen className="mr-3 h-5 w-5" /> },
    { name: "Cartes de révision", href: "/flashcards", icon: <Club className="mr-3 h-5 w-5" /> },
    { name: "Quiz", href: "/quizzes", icon: <HelpCircle className="mr-3 h-5 w-5" /> },
    { name: "Planning", href: "/schedule", icon: <Calendar className="mr-3 h-5 w-5" /> },
    { name: "Assistant", href: "/assistant", icon: <MessageSquare className="mr-3 h-5 w-5" /> },
    { name: "Collaboratif", href: "#", icon: <Users className="mr-3 h-5 w-5" /> }
  ];

  // Close sidebar on mobile when clicking outside
  const handleOutsideClick = () => {
    if (isOpen) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 md:hidden bg-gray-600 bg-opacity-75 transition-opacity"
          onClick={handleOutsideClick}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={cn(
        "h-screen",
        isOpen ? "fixed inset-y-0 left-0 z-50 block w-64" : "hidden md:flex md:flex-shrink-0"
      )}>
        <div className="flex flex-col w-64 bg-white border-r border-gray-200">
          {/* Logo section */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center">
              <div className="flex items-center justify-center h-8 w-8 bg-primary-100 rounded-md">
                <BookOpen className="h-5 w-5 text-primary-600" />
              </div>
              <span className="ml-2 text-xl font-semibold text-gray-900">SmartNotes</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 flex flex-col overflow-y-auto scrollbar-hide">
            <nav className="flex-1 px-4 py-4 space-y-2">
              {navigationItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                      isActive 
                        ? "bg-primary-50 text-primary-600" 
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    {isActive 
                      ? React.cloneElement(item.icon, { className: "mr-3 h-5 w-5 text-primary-500" })
                      : React.cloneElement(item.icon, { className: "mr-3 h-5 w-5 text-gray-400" })
                    }
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
            
            {/* User profile */}
            <div className="px-4 py-4 border-t border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-9 w-9 rounded-full bg-primary-200 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary-700" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">Thomas Dubois</p>
                  <p className="text-xs font-medium text-gray-500">Étudiant</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
