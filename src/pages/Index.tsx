import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EmotiCareLogo from "@/components/EmotiCareLogo";
import { HeartPulse, MessageCircle, Mic, User, LogOut, BarChart2, Wind, AlertTriangle, Tv } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DEFAULT_AVATAR } from "@/lib/userService";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import RoboCharacter from "@/components/3d/RoboCharacter";
import AnimatedBackground from "@/components/AnimatedBackground";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Index = () => {
  const { userProfile, currentUser } = useAuth();
  const isLoggedIn = !!currentUser;
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [robotMessage, setRobotMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);

  // Track scroll position for header transparency effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setScrolled(scrollPosition > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Robot messages to cycle through
  const robotMessages = [
    "Hi there! How are you feeling today?",
    "Hello! I'm here to help with your emotional wellbeing.",
    "Having a rough day? Let's talk about it.",
    "I'm your AI companion. What's on your mind?",
    "Need someone to listen? I'm here for you!",
    "How's your mental health today? Let's check in."
  ];

  // Handle robot click to show a random message
  const handleRobotClick = () => {
    const randomMessage = robotMessages[Math.floor(Math.random() * robotMessages.length)];
    setRobotMessage(randomMessage);
    setShowMessage(true);
    
    // Hide message after 5 seconds
    setTimeout(() => {
      setShowMessage(false);
    }, 5000);
  };

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
    <div className="min-h-screen relative overflow-hidden">
      {/* Cute animated background */}
      <AnimatedBackground />
      
      {/* Header */}
      <header className={`w-full py-4 px-6 flex justify-between items-center border-b fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${scrolled 
          ? 'bg-white/90 backdrop-blur-md'
          : 'bg-transparent border-transparent'}`}
      >
        <EmotiCareLogo />
        {isLoggedIn ? (
          <div className="flex items-center gap-4">
            <Button variant={scrolled ? "ghost" : "outline"} asChild className={scrolled ? "" : "bg-white/80 hover:bg-white/90"}>
              <Link to="/chatbot" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Chat
              </Link>
            </Button>
            <Button variant={scrolled ? "ghost" : "outline"} asChild className={scrolled ? "" : "bg-white/80 hover:bg-white/90"}>
              <Link to="/voicechat" className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Voice Chat
              </Link>
            </Button>
            <Button variant={scrolled ? "ghost" : "outline"} asChild className={scrolled ? "" : "bg-white/80 hover:bg-white/90"}>
              <Link to="/breathing" className="flex items-center gap-2">
                <Wind className="h-4 w-4" />
                Breathing
              </Link>
            </Button>
            <Button variant={scrolled ? "ghost" : "outline"} asChild className={scrolled ? "" : "bg-white/80 hover:bg-white/90"}>
              <Link to="/safespace" className="flex items-center gap-2">
                <Tv className="h-4 w-4" />
                Safe Space
              </Link>
            </Button>
            <Button variant={scrolled ? "ghost" : "outline"} asChild className={scrolled ? "" : "bg-white/80 hover:bg-white/90"}>
              <Link to="/emergency" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Emergency
              </Link>
            </Button>
            <Button variant={scrolled ? "ghost" : "outline"} asChild className={scrolled ? "" : "bg-white/80 hover:bg-white/90"}>
              <Link to="/stats" className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4" />
                Stats
              </Link>
            </Button>
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
                <DropdownMenuItem asChild>
                  <Link to="/safespace" className="cursor-pointer">
                    <Tv className="mr-2 h-4 w-4" />
                    Safe Space
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/emergency" className="cursor-pointer">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Emergency Resources
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
          <div className="flex gap-4 items-center">
            <Button variant="outline" asChild className={scrolled ? "" : "bg-white/80 hover:bg-white/90"}>
              <Link to="/emergency" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Emergency
              </Link>
            </Button>
            <Button variant="outline" asChild className={scrolled ? "" : "bg-white/80 hover:bg-white/90"}>
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
              <Link to="/signup">Sign Up</Link>
            </Button>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="container mx-auto pt-24 pb-16 px-4">
        <div className="flex flex-col md:flex-row items-center justify-center md:gap-0">
          <div className="text-center md:text-left md:max-w-md md:flex-1 md:pr-4">
            <div className="mb-4 inline-block">
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800">
                AI Emotional Support
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-500 inline-block text-transparent bg-clip-text">
              Welcome to EmotiCare
            </h1>
            <p className="text-xl text-gray-700 mb-8">
              Your AI companion for emotional support and mental wellness.
              Talk or chat with our empathetic AI to feel better, anytime, anywhere.
            </p>
            <div className="space-y-4 sm:space-y-0 sm:space-x-4 flex flex-col sm:flex-row justify-center md:justify-start">
              <Button 
                size="lg" 
                className="px-8 py-6 text-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg"
                asChild
              >
                <Link to={isLoggedIn ? "/chatbot" : "/signup"}>
                  {isLoggedIn ? "Start Chatting Now" : "Sign Up & Start Chatting"}
                </Link>
              </Button>
              {!isLoggedIn && (
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="px-8 py-6 text-lg bg-white/80 hover:bg-white border-blue-200"
                  asChild
                >
                  <Link to="/login">Login</Link>
                </Button>
              )}
            </div>
          </div>
          
          {/* Robot Character Animation without glow effect */}
          <div className="mt-8 md:mt-0 md:flex-1 flex items-center justify-center">
            <div className="animate-float">
              <div onClick={handleRobotClick} className="cursor-pointer transition-transform hover:scale-105">
                <RoboCharacter 
                  width={480} 
                  height={480} 
                  className="drop-shadow-2xl"
                />
              </div>
              
              {/* Speech bubble message */}
              {showMessage && (
                <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-white p-5 rounded-3xl shadow-xl max-w-[280px] z-20 animate-fadeIn">
                  <div className="absolute left-0 bottom-8 transform -translate-x-1/2 rotate-45 w-5 h-5 bg-white"></div>
                  <p className="text-gray-700 font-medium">{robotMessage}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto py-16 px-4 relative z-10">
        <h2 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-blue-600 to-purple-600 inline-block text-transparent bg-clip-text">
          How EmotiCare Helps You
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="transition-all hover:scale-105 duration-300 hover:shadow-xl border-t-4 border-blue-500 bg-white/90 backdrop-blur-sm">
            <CardContent className="pt-6 pb-4 flex flex-col items-center text-center">
              <div className="mb-4 p-4 rounded-full bg-gradient-to-br from-blue-100 to-blue-200">
                <MessageCircle className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Chat Support</h3>
              <p className="text-gray-600">
                Chat with our empathetic AI companion for instant emotional support and guidance.
              </p>
              <Button variant="link" asChild className="mt-4">
                <Link to="/chatbot">Try Chat Support</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="transition-all hover:scale-105 duration-300 hover:shadow-xl border-t-4 border-purple-500 bg-white/90 backdrop-blur-sm">
            <CardContent className="pt-6 pb-4 flex flex-col items-center text-center">
              <div className="mb-4 p-4 rounded-full bg-gradient-to-br from-purple-100 to-purple-200">
                <Mic className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Voice Conversations</h3>
              <p className="text-gray-600">
                Talk directly with our AI using your voice for a more natural supportive experience.
              </p>
              <Button variant="link" asChild className="mt-4">
                <Link to="/voicechat">Try Voice Chat</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="transition-all hover:scale-105 duration-300 hover:shadow-xl border-t-4 border-green-500 bg-white/90 backdrop-blur-sm">
            <CardContent className="pt-6 pb-4 flex flex-col items-center text-center">
              <div className="mb-4 p-4 rounded-full bg-gradient-to-br from-green-100 to-green-200">
                <HeartPulse className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Personalized Support</h3>
              <p className="text-gray-600">
                Create a profile to receive personalized emotional support tailored to your needs.
              </p>
              <Button variant="link" asChild className="mt-4">
                <Link to={isLoggedIn ? "/profile" : "/signup"}>
                  {isLoggedIn ? "View Profile" : "Create Profile"}
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="transition-all hover:scale-105 duration-300 hover:shadow-xl border-t-4 border-indigo-500 bg-white/90 backdrop-blur-sm">
            <CardContent className="pt-6 pb-4 flex flex-col items-center text-center">
              <div className="mb-4 p-4 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200">
                <BarChart2 className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Emotion Analytics</h3>
              <p className="text-gray-600">
                Gain insights into your emotional patterns with visualized analytics of your conversations.
              </p>
              <Button variant="link" asChild className="mt-4">
                <Link to="/stats">View Analytics</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="transition-all hover:scale-105 duration-300 hover:shadow-xl border-t-4 border-amber-500 bg-white/90 backdrop-blur-sm">
            <CardContent className="pt-6 pb-4 flex flex-col items-center text-center">
              <div className="mb-4 p-4 rounded-full bg-gradient-to-br from-amber-100 to-amber-200">
                <Tv className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Virtual Safe Space</h3>
              <p className="text-gray-600">
                Create your own calming environment with customizable visuals and ambient sounds for relaxation.
              </p>
              <Button variant="link" asChild className="mt-4">
                <Link to="/safespace">Enter Safe Space</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="transition-all hover:scale-105 duration-300 hover:shadow-xl border-t-4 border-cyan-500 bg-white/90 backdrop-blur-sm">
            <CardContent className="pt-6 pb-4 flex flex-col items-center text-center">
              <div className="mb-4 p-4 rounded-full bg-gradient-to-br from-cyan-100 to-cyan-200">
                <Wind className="h-8 w-8 text-cyan-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Breathing Exercises</h3>
              <p className="text-gray-600">
                Follow guided breathing techniques to reduce stress and anxiety in the moment.
              </p>
              <Button variant="link" asChild className="mt-4">
                <Link to="/breathing">Try Breathing</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Emotional Wellness Benefits Section - Replacing Testimonials */}
      <section className="py-16 relative z-10">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-blue-600 to-purple-600 inline-block text-transparent bg-clip-text">
            Benefits of Emotional Support
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="backdrop-blur-md bg-white/70 hover:shadow-xl transition-all border-l-4 border-blue-400">
              <CardContent className="p-6">
                <div className="mb-4 w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-blue-600">
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-blue-800">Reduced Stress & Anxiety</h3>
                <p className="text-gray-700">
                  Regular emotional check-ins and support can reduce stress levels by up to 40% and help manage anxiety symptoms.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-white/70 hover:shadow-xl transition-all border-l-4 border-purple-400">
              <CardContent className="p-6">
                <div className="mb-4 w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-200">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-purple-600">
                    <path fillRule="evenodd" d="M12 1.5a.75.75 0 01.75.75V4.5a.75.75 0 01-1.5 0V2.25A.75.75 0 0112 1.5zM5.636 4.136a.75.75 0 011.06 0l1.592 1.591a.75.75 0 01-1.061 1.06l-1.591-1.59a.75.75 0 010-1.061zm12.728 0a.75.75 0 010 1.06l-1.591 1.592a.75.75 0 01-1.06-1.061l1.59-1.591a.75.75 0 011.061 0zm-6.816 4.496a.75.75 0 01.82.311l5.228 7.917a.75.75 0 01-.777 1.148l-2.097-.43 1.045 3.9a.75.75 0 01-1.45.388l-1.044-3.899-1.601 1.42a.75.75 0 01-1.247-.606l.569-9.47a.75.75 0 01.554-.68zM3 10.5a.75.75 0 01.75-.75H6a.75.75 0 010 1.5H3.75A.75.75 0 013 10.5zm14.25 0a.75.75 0 01.75-.75h2.25a.75.75 0 010 1.5H18a.75.75 0 01-.75-.75zm-8.962 3.712a.75.75 0 010 1.061l-1.591 1.591a.75.75 0 11-1.061-1.06l1.591-1.592a.75.75 0 011.06 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-purple-800">Improved Mental Clarity</h3>
                <p className="text-gray-700">
                  Processing emotions with support can improve focus and mental clarity, enhancing decision-making abilities and productivity.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-white/70 hover:shadow-xl transition-all border-l-4 border-teal-400">
              <CardContent className="p-6">
                <div className="mb-4 w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-teal-100 to-teal-200">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-teal-600">
                    <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-teal-800">Better Relationships</h3>
                <p className="text-gray-700">
                  Understanding your emotions can lead to 65% more satisfying personal and professional relationships through improved communication.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="bg-white/80 backdrop-blur-sm py-8 border-t border-blue-50 relative z-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <EmotiCareLogo />
              <p className="text-gray-600 ml-4">
                Your AI companion for emotional support
              </p>
            </div>
            <div className="flex gap-6">
              <span className="text-gray-400 text-sm">© {new Date().getFullYear()} EmotiCare</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
