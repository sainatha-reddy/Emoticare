// Add Tailwind CSS animation styles at the top of the file
import "./Chatbot.css";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import Header from "@/components/Header";
import { toast } from "@/components/ui/use-toast";
import { Bot, Send, User, BarChart2, Plus, MessageSquare, Calendar, Trash2, ArrowLeft, ArrowRight, Mic, Music, Volume2, VolumeX } from "lucide-react";
import { generateChatResponse } from "@/lib/groqClient";
import { getCurrentUserProfile, UserProfile, DEFAULT_AVATAR } from "@/lib/userService";
import { auth } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import RoboCharacter from "@/components/3d/RoboCharacter";
import AnimatedBackground from "@/components/AnimatedBackground";
import { 
  saveChatMessage, 
  createChatSession, 
  endChatSession,
  getChatSession, 
  getUserChatSessions,
  clearAllUserSessions,
  deleteChatSession,
  ChatMessage,
  ChatSession
} from "@/lib/chatService";
import { analyzeText, getEmotionEmoji } from "@/lib/sentimentAnalysis";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot" | "system";
  timestamp: Date;
  emotion?: string;
  sentiment?: number;
  transcription?: boolean;
}

const Chatbot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [pastSessions, setPastSessions] = useState<ChatSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [showCrisisAlert, setShowCrisisAlert] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSound, setCurrentSound] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sound options
  const soundOptions = [
    { name: "Forest", file: "/sounds/forest.mp3" },
    { name: "Rain", file: "/sounds/rain.mp3" },
    { name: "Waves", file: "/sounds/waves.mp3" },
    { name: "White Noise", file: "/sounds/white-noise.mp3" }
  ];

  // Fetch user profile and initialize chat session
  useEffect(() => {
    const initializeChat = async () => {
      setIsLoadingProfile(true);
      setIsLoadingHistory(true);

      try {
        // Wait for auth state to be determined before checking
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
          if (!currentUser) {
          console.log('No authenticated user, redirecting to login');
          navigate('/login');
          return;
        }
        
          try {
            // Get user profile
        const profile = await getCurrentUserProfile();
            if (!profile) {
              throw new Error('Could not load user profile');
            }
        setUserProfile(profile);

            // Load past sessions first
            await loadUserSessions(profile.uid);

            // Check for active session in localStorage
            const savedSessionId = localStorage.getItem('activeSessionId');
            
            if (savedSessionId) {
              try {
                // Try to load existing session
                const existingSession = await getChatSession(savedSessionId);
                if (existingSession) {
                  setSessionId(savedSessionId);
                  const sessionMessages: Message[] = existingSession.messages.map(msg => ({
                    id: msg.id || `fallback-${Date.now()}`,
                    content: msg.content,
                    sender: msg.sender,
                    timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
                    emotion: msg.emotion,
                    sentiment: msg.sentiment
                  }));
                  setMessages(sessionMessages);
                  setIsLoadingHistory(false);
                  setIsLoadingProfile(false);
                  return;
                }
              } catch (error) {
                console.error('Error loading saved session:', error);
                localStorage.removeItem('activeSessionId');
              }
            }

            // Create a new chat session if no saved session
            const newSessionId = await createChatSession(profile.uid, 'text');
            if (!newSessionId) {
              throw new Error('Failed to create chat session');
            }
            setSessionId(newSessionId);
            localStorage.setItem('activeSessionId', newSessionId);

            // Create welcome message
            const welcomeMessage: Message = {
              id: "welcome-" + Date.now(),
              content: "Hello! I'm your EmotiCare companion. How are you feeling today?",
              sender: "bot",
              timestamp: new Date(),
            };

            // Save welcome message to the session
            try {
              await saveChatMessage({
                userId: profile.uid,
                content: welcomeMessage.content,
                sender: welcomeMessage.sender,
                timestamp: welcomeMessage.timestamp
              }, newSessionId);
              
              // Get the session to ensure we're using the stored messages
              const session = await getChatSession(newSessionId);
              if (session && session.messages) {
                // Convert session messages to our Message interface
                const sessionMessages: Message[] = session.messages.map(msg => ({
                  id: msg.id || `fallback-${Date.now()}`,
                  content: msg.content,
                  sender: msg.sender,
                  timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
                  emotion: msg.emotion,
                  sentiment: msg.sentiment
                }));
                
                setMessages(sessionMessages);
              } else {
                // Fallback if we can't get the session
                setMessages([welcomeMessage]);
              }
            } catch (messageError) {
              console.error('Error saving welcome message:', messageError);
              // Continue with local state if save fails
              setMessages([welcomeMessage]);
            }
      } catch (error) {
            console.error('Error in chat initialization:', error);
        toast({
          title: "Error",
              description: error instanceof Error ? error.message : "Failed to initialize chat. Please try again.",
          variant: "destructive",
            });
            // Reset states on error
            setSessionId(null);
            setMessages([]);
          } finally {
            setIsLoadingProfile(false);
            setIsLoadingHistory(false);
          }
        });
        
        // Cleanup auth listener
        return () => unsubscribe();

      } catch (error) {
        console.error('Error setting up auth listener:', error);
        setIsLoadingProfile(false);
        setIsLoadingHistory(false);
      }
    };

    initializeChat();

    // No cleanup function to end session - we keep it active
  }, [navigate]);

  // Get first message preview for session with better naming
  const getSessionName = (session: ChatSession) => {
    // Add chat type indicator
    const chatTypeIndicator = session.chatType === 'voice' ? '🎤 ' : '💬 ';
    
    if (!session.messages || session.messages.length === 0) {
      return chatTypeIndicator + "Empty conversation";
    }
    
    // Skip welcome message if it exists
    const startIndex = session.messages[0].sender === "bot" ? 1 : 0;
    
    if (startIndex >= session.messages.length) {
      return chatTypeIndicator + "New conversation";
    }
    
    const firstUserMessage = session.messages.find((msg, idx) => idx >= startIndex && msg.sender === "user");
    if (!firstUserMessage) return chatTypeIndicator + "New conversation";
    
    // Use the first user message as the conversation name
    // Truncate to first 3-4 words for a clean title, max 25 chars
    const words = firstUserMessage.content.split(' ');
    const titleWords = words.slice(0, Math.min(4, words.length));
    let title = titleWords.join(' ');
    
    // Ensure the title isn't too long
    if (title.length > 25) {
      title = title.substring(0, 22) + '...';
    } else if (words.length > 4) {
      title += '...';
    }
    
    return chatTypeIndicator + title;
  };

  // Load user's past chat sessions
  const loadUserSessions = async (userId: string) => {
    setIsLoadingSessions(true);
    try {
      const sessions = await getUserChatSessions(userId, 20); // Get more sessions
      
      // Sort sessions by last activity time (using the last message timestamp or start time)
      const sortedSessions = sessions.sort((a, b) => {
        // Get the timestamp of the last message in each session, or use session start time
        const getLastActivity = (session: ChatSession) => {
          if (session.messages && session.messages.length > 0) {
            const timestamps = session.messages.map(msg => 
              msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
            );
            return new Date(Math.max(...timestamps.map(t => t.getTime())));
          }
          return session.startTime instanceof Date ? session.startTime : new Date(session.startTime);
        };
        
        const timeA = getLastActivity(a);
        const timeB = getLastActivity(b);
        
        return timeB.getTime() - timeA.getTime(); // Most recent first
      });
      
      setPastSessions(sortedSessions);
    } catch (error) {
      console.error('Error loading user sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load chat history. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSessions(false);
    }
  };

  // Handle sending messages
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !sessionId || !userProfile) return;
    
    setIsLoading(true);
    const messageText = text.trim();
    setInput("");  // Clear input immediately for better UX
    
    try {
      // Create user message
    const userMessage: Message = {
        id: `temp-${Date.now()}`,
        content: messageText,
      sender: "user",
      timestamp: new Date(),
    };
    
      // Update local state immediately
      setMessages(prev => [...prev, userMessage]);
      
      // Analyze sentiment
      const { emotion, sentiment } = analyzeText(messageText);
      
      // Save user message
      const savedMessageId = await saveChatMessage({
        userId: userProfile.uid,
        content: messageText,
        sender: "user",
        timestamp: userMessage.timestamp,
        emotion,
        sentiment
      }, sessionId);
      
      // Update user message with saved ID
      userMessage.id = savedMessageId;
      
      // Show typing animation
      setIsTyping(true);
      
      // Create message history for API
      const messageHistory = messages
        .filter(msg => msg.sender !== "system") // Exclude system messages from the conversation history
        .map(msg => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content
      }));
      messageHistory.push({ role: "user", content: messageText });
      
      // Generate response - system message is handled in groqClient
      const response = await generateChatResponse(messageHistory);
      
      // Hide typing animation
      setIsTyping(false);
      
      if (!response?.trim()) {
        throw new Error('Empty response from chat API');
      }
      
      // Create and save bot message
      const botMessage: Message = {
        id: `temp-bot-${Date.now()}`,
        content: response.trim(),
        sender: "bot",
        timestamp: new Date(),
      };
      
      const botAnalysis = analyzeText(botMessage.content);
      
      // Save bot message
      const savedBotMessageId = await saveChatMessage({
        userId: userProfile.uid,
        content: botMessage.content,
        sender: botMessage.sender,
        timestamp: botMessage.timestamp,
        emotion: botAnalysis.emotion,
        sentiment: botAnalysis.sentiment
      }, sessionId);
      
      // Get updated session
      const updatedSession = await getChatSession(sessionId);
      if (updatedSession?.messages) {
        const sessionMessages: Message[] = updatedSession.messages.map(msg => ({
          id: msg.id || `fallback-${Date.now()}`,
          content: msg.content,
          sender: msg.sender,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
          emotion: msg.emotion,
          sentiment: msg.sentiment
        }));
        setMessages(sessionMessages);
      }
      
      // Refresh session list
      if (userProfile) {
        await loadUserSessions(userProfile.uid);
      }
      
      // Check for crisis content with different severity levels
      const criticalPhrases = [
        'suicide', 'kill myself', 'end my life', 'die', 'wanna commit suicide',
        'i wanna commit suicide', 'she is abusing me', 'he is abusing me', 
        'being abused', 'abusing me', 'help me', 'emergency', 'in danger',
        'want to die', 'going to kill', 'hurt myself', 'self-harm',
        'khudkhushi', 'aatmahatya', 'marna chahta'
      ];
      
      const isCriticalMessage = criticalPhrases.some(phrase => messageText.toLowerCase().includes(phrase));
      const isCrisisMessage = !isCriticalMessage && detectCrisisContent(messageText);
      
      if (isCriticalMessage) {
        setShowCrisisAlert(true);
        // Immediately redirect to emergency resources for critical situations
        navigate("/emergency?critical=true", { state: { critical: true } });
        // Show toast notification
        toast({
          title: "Emergency Resources",
          description: "Critical content detected. You've been redirected to emergency resources.",
          variant: "destructive",
        });
      } else if (isCrisisMessage) {
        setShowCrisisAlert(true);
      }
      
    } catch (error) {
      console.error("Error in chat interaction:", error);
      // Remove the temporary message if saving failed
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load a specific chat session
  const loadChatSession = async (sessionToLoadId: string) => {
    if (!userProfile || !sessionToLoadId) return;
    
    setIsLoadingHistory(true);
    try {
      // Get the requested session
      const sessionData = await getChatSession(sessionToLoadId);
      if (!sessionData) {
        throw new Error('Session not found');
      }
      
      // If current session exists but is different
      if (sessionId && sessionId !== sessionToLoadId) {
        // We don't end the current session, just switch to a different one
      }
      
      // Set the active session
      setSessionId(sessionToLoadId);
      
      // Store in the appropriate localStorage key based on chat type
      if (sessionData.chatType === 'voice') {
        localStorage.setItem('activeVoiceSessionId', sessionToLoadId);
      } else {
      localStorage.setItem('activeSessionId', sessionToLoadId);
      }
      
      // Parse messages
      const sessionMessages: Message[] = sessionData.messages.map(msg => ({
        id: msg.id || `fallback-${Date.now()}`,
        content: msg.content,
        sender: msg.sender,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
        emotion: msg.emotion,
        sentiment: msg.sentiment
      }));
      
      setMessages(sessionMessages);
      
      // On mobile, hide the sidebar after selecting
      if (window.innerWidth < 768) {
        setShowSidebar(false);
      }
      
      toast({
        title: "Chat Loaded",
        description: `Loaded ${sessionData.chatType === 'voice' ? 'voice' : 'text'} conversation from ${format(
          sessionData.startTime instanceof Date 
            ? sessionData.startTime 
            : new Date(sessionData.startTime),
          'MMM d, yyyy'
        )}`,
      });
    } catch (error) {
      console.error('Error loading chat session:', error);
      toast({
        title: "Error",
        description: "Failed to load chat session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Start a new chat session
  const startNewSession = async () => {
    if (!userProfile) return;
    
    setIsLoading(true);
    try {
      // Create new session
      const newSessionId = await createChatSession(userProfile.uid, 'text');
      setSessionId(newSessionId);
      localStorage.setItem('activeSessionId', newSessionId);
      
      // Reset messages with welcome message
      const welcomeMessage: Message = {
        id: "welcome-" + Date.now(),
        content: "Hello! I'm your EmotiCare companion. How are you feeling today?",
        sender: "bot",
        timestamp: new Date(),
      };
      
      setMessages([welcomeMessage]);
      
      // Add welcome message to the session
      await saveChatMessage({
        userId: userProfile.uid,
        content: welcomeMessage.content,
        sender: welcomeMessage.sender,
        timestamp: welcomeMessage.timestamp
      }, newSessionId);
      
      // Refresh session list
      await loadUserSessions(userProfile.uid);
      
      toast({
        title: "New Conversation",
        description: "Started a fresh chat session.",
      });
      
      // On mobile, hide the sidebar after starting new chat
      if (window.innerWidth < 768) {
        setShowSidebar(false);
      }
    } catch (error) {
      console.error("Error starting new session:", error);
      toast({
        title: "Error",
        description: "Failed to start a new conversation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Clear chat history
  const clearChatHistory = async () => {
    if (!userProfile) return;
    
    setIsLoading(true);
    try {
      // Clear all sessions from Firebase
      await clearAllUserSessions(userProfile.uid);
      
      // Start a new session
      const newSessionId = await createChatSession(userProfile.uid, 'text');
      setSessionId(newSessionId);
      localStorage.setItem('activeSessionId', newSessionId);
      
      // Reset messages with welcome message
      const welcomeMessage: Message = {
        id: "welcome-" + Date.now(),
        content: "Hello! I'm your EmotiCare companion. How are you feeling today?",
        sender: "bot",
        timestamp: new Date(),
      };
      
      // Save welcome message
      await saveChatMessage({
        userId: userProfile.uid,
        content: welcomeMessage.content,
        sender: welcomeMessage.sender,
        timestamp: welcomeMessage.timestamp
      }, newSessionId);
      
      setMessages([welcomeMessage]);
      setPastSessions([]);
      
      toast({
        title: "Success",
        description: "Chat history has been cleared.",
      });
    } catch (error) {
      console.error("Error clearing chat history:", error);
      toast({
        title: "Error",
        description: "Failed to clear chat history. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Format timestamp for display
  const formatMessageTime = (timestamp: Date) => {
    return format(timestamp, 'h:mm a');
  };

  // Format date for chat session
  const formatSessionDate = (timestamp: any) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return format(date, 'MMM d, yyyy h:mm a');
  };

  // Check if current session is active
  const isActiveSession = (checkSessionId: string) => {
    return sessionId === checkSessionId;
  };

  // Handle deleting a specific chat session
  const handleDeleteSession = async (sessionToDeleteId: string, event: React.MouseEvent) => {
    // Stop the event from bubbling up to parent elements
    event.stopPropagation();
    
    if (!userProfile) return;
    
    try {
      // If the deleted session was the active one, show a specific message
      const isActiveOne = sessionId === sessionToDeleteId;
      
      // Delete the session from database
      await deleteChatSession(sessionToDeleteId);
      
      // If the deleted session was the active one
      if (isActiveOne) {
        // Create a new session
        const newSessionId = await createChatSession(userProfile.uid, 'text');
        setSessionId(newSessionId);
        localStorage.setItem('activeSessionId', newSessionId);
        
        // Reset messages with welcome message
        const welcomeMessage: Message = {
          id: "welcome-" + Date.now(),
          content: "Hello! I'm your EmotiCare companion. How are you feeling today?",
          sender: "bot",
          timestamp: new Date(),
        };
        
        setMessages([welcomeMessage]);
        
        // Add welcome message to the new session
        await saveChatMessage({
          userId: userProfile.uid,
          content: welcomeMessage.content,
          sender: welcomeMessage.sender,
          timestamp: welcomeMessage.timestamp
        }, newSessionId);
        
        toast({
          title: "Active Chat Deleted",
          description: "Your active chat was deleted. A new conversation has been started.",
        });
      } else {
        // If not the active session, just show a simple success message
      toast({
        title: "Success",
        description: "Chat session has been deleted.",
      });
      }
      
      // Refresh the sessions list
      await loadUserSessions(userProfile.uid);
    } catch (error) {
      console.error("Error deleting chat session:", error);
      toast({
        title: "Error",
        description: "Failed to delete chat session. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Crisis detection function with immediate trigger for critical phrases
  const detectCrisisContent = (text: string): boolean => {
    // High priority critical phrases that should immediately trigger emergency resources
    const criticalPhrases = [
      'suicide', 'kill myself', 'end my life', 'die', 'wanna commit suicide',
      'i wanna commit suicide', 'she is abusing me', 'he is abusing me', 
      'being abused', 'abusing me', 'help me', 'emergency', 'in danger',
      'want to die', 'going to kill', 'hurt myself', 'self-harm',
      'khudkhushi', 'aatmahatya', 'marna chahta'
    ];
    
    // Secondary crisis keywords for broader detection
    const crisisKeywords = [
      // General crisis keywords
      'don\'t want to live', 'overdose', 'no reason to live', 
      'better off dead', 'can\'t take it anymore', 'unbearable pain', 
      'life is meaningless', 'urgent help', 'severe anxiety', 
      'panic attack', 'assault', 'violence', 'abuse', 'trauma',
      
      // India-specific mental health terms
      'mental tension', 'tension', 'under pressure', 'bhaar', 'pareshani', 
      'udaas', 'tanha', 'akela', 'helpless', 'nirasha', 'depression',
      'jeena nahi chahta', 'pareshan', 'chinta', 'ghabrahat', 
      'dar', 'dukhi', 'child abuse', 'bachon ka shoshan', 'takleef', 
      'dard', 'peedha'
    ];
    
    const lowercaseText = text.toLowerCase();
    
    // First check for critical phrases - direct match for immediate triggering
    const hasCriticalPhrase = criticalPhrases.some(phrase => 
      lowercaseText.includes(phrase)
    );
    
    if (hasCriticalPhrase) {
      return true;
    }
    
    // Then check for secondary keywords
    return crisisKeywords.some(keyword => lowercaseText.includes(keyword));
  };

  // Handle playing sound
  const playSound = (soundFile: string) => {
    if (audioRef.current) {
      // If already playing, pause it first
      audioRef.current.pause();
      
      // If selecting the same sound that's already playing, just toggle off
      if (currentSound === soundFile && isPlaying) {
        setIsPlaying(false);
        setCurrentSound(null);
        return;
      }
      
      // Set new sound
      audioRef.current.src = soundFile;
      audioRef.current.loop = true;
      audioRef.current.volume = 0.3; // Set volume to 30%
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setCurrentSound(soundFile);
        })
        .catch(error => {
          console.error("Error playing audio:", error);
          toast({
            title: "Playback Error",
            description: "Could not play the selected sound.",
            variant: "destructive",
          });
        });
    }
  };

  // Toggle sound on/off
  const toggleSound = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else if (currentSound) {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(console.error);
      }
    }
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <AnimatedBackground />
      
      {/* Header */}
      <Header />
      
      {/* Crisis Resources Alert */}
      {showCrisisAlert && (
        <div className="container mx-auto px-4 pt-2">
          <Alert variant="destructive" className="relative overflow-hidden animate-pulse-gentle">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Crisis Detected</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>
                It seems you may be going through a difficult time. EmotiCare is here to support you, 
                but if you're experiencing a crisis, please consider reaching out to professional resources.
              </p>
              <div className="flex gap-2 mt-2">
                <Button variant="destructive" asChild>
                  <Link to="/emergency">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    View Emergency Resources
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => setShowCrisisAlert(false)}>
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {/* Main content with top padding to account for fixed header */}
      <main className="container mx-auto px-4 pt-12 pb-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Chat area */}
          <div className="flex-1">
            <Card className="backdrop-blur-md bg-white/90 border shadow-md">
              <CardContent className="p-0">
                <div className="flex flex-col h-[75vh]">
                  {/* Chat type banner for voice chat sessions */}
                  {sessionId && pastSessions.find(s => s.id === sessionId)?.chatType === 'voice' && (
                    <div className="bg-green-50 border-b border-green-200 py-2 px-4 text-sm text-green-800 flex items-center justify-center">
                      <Mic className="h-4 w-4 mr-2" />
                      <span>
                        This conversation was started in <strong>Voice Chat</strong>. Messages shown here were transcribed from speech.
                      </span>
                    </div>
                  )}
                  {/* Chat type indicator */}
                  {sessionId && (
                    <div className="p-2 border-b flex items-center justify-center">
                      <span className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center ${
                        pastSessions.find(s => s.id === sessionId)?.chatType === 'voice'
                          ? "bg-green-100 text-green-800 border border-green-300"
                          : "bg-blue-100 text-blue-800 border border-blue-300"
                      }`}>
                        {pastSessions.find(s => s.id === sessionId)?.chatType === 'voice' ? (
                          <><Mic className="h-3 w-3 mr-1" /> Voice Chat Session</>
                        ) : (
                          <><MessageSquare className="h-3 w-3 mr-1" /> Text Chat Session</>
                        )}
                      </span>
                    </div>
                  )}
                  {/* Chat messages */}
                  <ScrollArea className="flex-1 p-4">
                    {isLoadingHistory ? (
                      <div className="space-y-4">
                        <Skeleton className="h-12 w-3/4" />
                        <Skeleton className="h-12 w-1/2 ml-auto" />
                        <Skeleton className="h-12 w-2/3" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <RoboCharacter width={120} height={120} className="mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Start a new conversation</h3>
                        <p className="text-muted-foreground mb-4">
                          How are you feeling today? I'm here to listen and help.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 mb-4">
                        {messages
                          .filter(message => message.sender !== "system") // Don't display system messages in the UI
                          .map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${
                              message.sender === "user" ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`flex items-start gap-2 max-w-[85%] ${
                                message.sender === "user" ? "flex-row-reverse" : ""
                              }`}
                            >
                              {message.sender === "bot" ? (
                                <Avatar className="mt-1 bg-gradient-to-br from-blue-400 to-purple-500">
                                  <AvatarImage src="/favicon.png" />
                                  <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                                    <Bot className="h-4 w-4" />
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <Avatar className="mt-1">
                                  <AvatarImage src={userProfile?.photoURL || DEFAULT_AVATAR} />
                                  <AvatarFallback>
                                    {userProfile?.displayName
                                      ? userProfile.displayName.substring(0, 2).toUpperCase()
                                      : "JD"}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div>
                                <div
                                  className={`rounded-lg p-3 message-animation ${
                                    message.sender === "user"
                                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  <div className="whitespace-pre-wrap">{message.content}</div>
                                </div>
                                <div
                                  className={`text-xs mt-1 flex items-center ${
                                    message.sender === "user" ? "justify-end" : ""
                                  }`}
                                >
                                  {new Date(message.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Typing indicator */}
                        {isTyping && (
                          <div className="flex justify-start">
                            <div className="flex items-start gap-2 max-w-[85%]">
                              <Avatar className="mt-1 bg-gradient-to-br from-blue-400 to-purple-500">
                                <AvatarImage src="/favicon.png" />
                                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                                  <Bot className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="rounded-lg p-3 bg-gray-100 text-gray-800">
                                  <div className="flex items-center space-x-1">
                                    <div className="w-2 h-2 rounded-full bg-blue-400 typing-dot-1"></div>
                                    <div className="w-2 h-2 rounded-full bg-indigo-400 typing-dot-2"></div>
                                    <div className="w-2 h-2 rounded-full bg-purple-400 typing-dot-3"></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* Message input */}
                  <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent dark:from-slate-950 dark:via-slate-950 pt-4 pb-4">
                    <div className="flex items-center gap-2">
                      {/* Music player button */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="flex-shrink-0 relative"
                            aria-label="Ambient Sounds"
                          >
                            <Music className="h-5 w-5" />
                            {isPlaying && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-60 p-2">
                          <div className="space-y-2">
                            <div className="font-medium text-sm pb-1 border-b">Ambient Sounds</div>
                            {soundOptions.map(sound => (
                              <Button 
                                key={sound.file}
                                variant={currentSound === sound.file ? "default" : "ghost"}
                                className="justify-start w-full"
                                onClick={() => playSound(sound.file)}
                              >
                                {sound.name}
                                {currentSound === sound.file && isPlaying && (
                                  <span className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                )}
                              </Button>
                            ))}
                            <div className="pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm"
                                className="w-full"
                                onClick={toggleSound}
                                disabled={!currentSound}
                              >
                                {isPlaying ? (
                                  <>
                                    <VolumeX className="h-4 w-4 mr-2" />
                                    Pause
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="h-4 w-4 mr-2" />
                                    Play
                                  </>
                                )}
          </Button>
        </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      
                      <Input
                        placeholder="Type your message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex-1"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                            e.preventDefault();
                            handleSendMessage(input);
                          }
                        }}
                        disabled={isLoading}
                      />
                      <Button 
                        onClick={() => handleSendMessage(input)} 
                        disabled={isLoading || !input.trim()} 
                        className="flex-shrink-0"
                      >
                        {isLoading ? (
                          <div className="h-5 w-5 rounded-full border-2 border-t-transparent border-white animate-spin" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                    <audio ref={audioRef} className="hidden" />
                  </div>
                </div>
              </CardContent>
            </Card>
        </div>
        
          {/* Chat history sidebar for larger screens */}
          <div className="lg:w-80 hidden lg:block">
            <Card className="backdrop-blur-md bg-white/90 border shadow-md h-[75vh]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">Chat History</h3>
                  <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={startNewSession}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                          <p>New Chat</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Clear Chat History</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will delete all your chat sessions. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={clearChatHistory}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Delete All
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
            </div>
          </div>
          
                <ScrollArea className="h-[calc(75vh-6rem)]">
                  <div className="space-y-2">
            {isLoadingSessions ? (
                      <>
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </>
                    ) : pastSessions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No chat history yet</p>
                  </div>
                    ) : (
                      pastSessions.map((session) => (
                  <div 
                    key={session.id}
                          className={`p-3 rounded-lg cursor-pointer transition-colors relative 
                            ${
                              isActiveSession(session.id)
                                ? "bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800"
                                : "hover:bg-gray-100"
                            }
                            ${
                              session.chatType === 'voice' 
                                ? "border-l-4 border-green-400" 
                                : ""
                            }`}
                    onClick={() => loadChatSession(session.id)}
                  >
                    <div className="flex justify-between items-start">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              {session.chatType === 'voice' ? (
                                <Mic className="h-4 w-4 mt-1 flex-shrink-0 text-green-500" />
                              ) : (
                                <MessageSquare className="h-4 w-4 mt-1 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate text-sm">
                          {getSessionName(session)}
                                </h4>
                                <div className="flex items-center text-xs text-gray-500">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {formatSessionDate(session.startTime)}
                                  
                                  {/* Chat type badge */}
                                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center ${
                                    session.chatType === 'voice'
                                      ? "bg-green-100 text-green-800 border border-green-300"
                                      : "bg-blue-100 text-blue-800 border border-blue-300"
                                  }`}>
                                    {session.chatType === 'voice' ? 
                                      <><Mic className="h-3 w-3 mr-1" /> Voice</> : 
                                      <><MessageSquare className="h-3 w-3 mr-1" /> Text</>
                                    }
                                  </span>
                        </div>
                        </div>
                      </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                                  size="icon"
                                  className="h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                                  <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Chat Session</AlertDialogTitle>
                              <AlertDialogDescription>
                                    Are you sure you want to delete this chat? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={(e) => handleDeleteSession(session.id, e)}
                                    className="bg-red-500 hover:bg-red-600"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                      ))
                    )}
                  </div>
          </ScrollArea>
              </CardContent>
            </Card>
          </div>
          
          {/* Mobile Controls for Chat History */}
          <div className="lg:hidden flex justify-center mt-4">
            <Button
              variant="outline"
              className="bg-white/80"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              {showSidebar ? "Hide History" : "Show History"}
            </Button>
          </div>
          
          {/* Slide-in sidebar for mobile */}
          {showSidebar && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div className="absolute inset-0 bg-black/20" onClick={() => setShowSidebar(false)} />
              <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Chat History</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowSidebar(false)}>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
        </div>
        
                <div className="flex gap-2 mb-4">
                  <Button className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700" size="sm" onClick={() => {
                    startNewSession();
                    setShowSidebar(false);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Chat
                      </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-500">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear All
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear Chat History</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will delete all your chat sessions. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            clearChatHistory();
                            setShowSidebar(false);
                          }}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Delete All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                      </div>
          
                <ScrollArea className="h-[calc(100vh-8rem)]">
                    <div className="space-y-2">
                    {isLoadingSessions ? (
                      <>
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </>
                    ) : pastSessions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No chat history yet</p>
                    </div>
                    ) : (
                      pastSessions.map((session) => (
                        <div
                          key={session.id}
                          className={`p-3 rounded-lg cursor-pointer transition-colors relative 
                            ${
                              isActiveSession(session.id)
                                ? "bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800"
                                : "hover:bg-gray-100"
                            }
                            ${
                              session.chatType === 'voice' 
                                ? "border-l-4 border-green-400" 
                                : ""
                            }`}
                          onClick={() => {
                            loadChatSession(session.id);
                            setShowSidebar(false);
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              {session.chatType === 'voice' ? (
                                <Mic className="h-4 w-4 mt-1 flex-shrink-0 text-green-500" />
                              ) : (
                                <MessageSquare className="h-4 w-4 mt-1 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate text-sm">
                                  {getSessionName(session)}
                                </h4>
                                <div className="flex items-center text-xs text-gray-500">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {formatSessionDate(session.startTime)}
                                  
                                  {/* Chat type badge */}
                                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center ${
                                    session.chatType === 'voice'
                                      ? "bg-green-100 text-green-800 border border-green-300"
                                      : "bg-blue-100 text-blue-800 border border-blue-300"
                                  }`}>
                                    {session.chatType === 'voice' ? 
                                      <><Mic className="h-3 w-3 mr-1" /> Voice</> : 
                                      <><MessageSquare className="h-3 w-3 mr-1" /> Text</>
                                    }
                          </span>
                        </div>
                          </div>
                      </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Chat Session</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this chat? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={(e) => {
                                      handleDeleteSession(session.id, e);
                                      setShowSidebar(false);
                                    }}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                    </div>
                  </div>
                      ))
                    )}
              </div>
                </ScrollArea>
                </div>
              </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default Chatbot;
