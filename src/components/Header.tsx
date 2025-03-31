import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import EmotiCareLogo from "@/components/EmotiCareLogo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, MessageCircle, Mic, User, LogOut, BarChart2, Moon, Sun, ChevronDown, Settings, Wind, AlertTriangle, Home, Tv } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { toast } from "@/components/ui/use-toast";
import { DEFAULT_AVATAR } from "@/lib/userService";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const isLoggedIn = !!currentUser;

  const navItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "Chat", path: "/chatbot", icon: MessageCircle },
    { name: "Voice Chat", path: "/voicechat", icon: Mic },
    { name: "Breathing", path: "/breathing", icon: Wind },
    { name: "Safe Space", path: "/safespace", icon: Tv },
    { name: "Emergency", path: "/emergency", icon: AlertTriangle },
    { name: "Stats", path: "/stats", icon: BarChart2 },
    { name: "Profile", path: "/profile", icon: User },
  ];

  const isActive = (path: string) => location.pathname === path;
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="sticky top-0 z-10 w-full py-2 px-6 flex justify-between items-center bg-white/80 backdrop-blur-sm border-b">
      <div className="flex items-center gap-2">
        <Link to="/">
          <EmotiCareLogo />
        </Link>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.path}
              variant={isActive(item.path) ? "default" : "ghost"}
              asChild
            >
              <Link to={item.path} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            </Button>
          );
        })}
      </div>

      {/* Profile Menu for Desktop */}
      {isLoggedIn ? (
        <div className="hidden md:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar>
                  <AvatarImage src={userProfile?.photoURL || DEFAULT_AVATAR} />
                  <AvatarFallback>
                    {userProfile?.displayName 
                      ? userProfile.displayName.substring(0, 2).toUpperCase() 
                      : "JD"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{userProfile?.displayName || "My Account"}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/stats" className="cursor-pointer">
                  <BarChart2 className="mr-2 h-4 w-4" />
                  Analytics
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-500 cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div className="hidden md:flex gap-4 items-center">
          <Button variant="outline" asChild>
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link to="/signup">Sign Up</Link>
          </Button>
        </div>
      )}

      {/* Mobile Navigation */}
      <Sheet>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[260px]">
          <Link to="/">
            <EmotiCareLogo />
          </Link>
          <nav className="mt-8 flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? "default" : "ghost"}
                  asChild
                  className="justify-start"
                >
                  <Link to={item.path} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                </Button>
              );
            })}
            {isLoggedIn && (
              <Button
                variant="ghost"
                className="justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
};

export default Header;
