import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, BookOpen, Menu, Search, User, LogOut } from "lucide-react";

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export default function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  const { user, logout, isLogoutLoading } = useAuth();

  return (
    <div className="sticky top-0 z-10 md:hidden flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onMenuClick}
          className="mr-2"
        >
          <span className="sr-only">Open sidebar</span>
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center">
          <BookOpen className="h-6 w-6 text-primary-600" />
          <span className="ml-2 text-lg font-semibold text-gray-900">SmartNotes</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" className="text-gray-500">
          <Search className="h-5 w-5" />
        </Button>
        
        <Button variant="ghost" size="icon" className="text-gray-500">
          <Bell className="h-5 w-5" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar || ""} />
                <AvatarFallback>
                  {user ? (user.displayName || user.username)?.substring(0, 2).toUpperCase() : "UN"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.displayName || user?.username}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <Link href="/profile">
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>My profile</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-red-600"
              onClick={() => logout()}
              disabled={isLogoutLoading}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
