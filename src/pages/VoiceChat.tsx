import "./Chatbot.css";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import Header from "@/components/Header";
import { toast } from "@/components/ui/use-toast";
import { Bot, Mic, MicOff, User, Volume2, AlertTriangle, Play, Eye, EyeOff, MessageSquare, X, ArrowLeft, Square, Music, VolumeX } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { generateChatResponse } from "@/lib/groqClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getCurrentUserProfile, UserProfile, DEFAULT_AVATAR } from "@/lib/userService";
import { auth } from "@/lib/firebase";
import { useNavigate, Link } from "react-router-dom";
import { transcribeAudio, textToSpeech, handleDeepgramError } from "@/lib/deepgramClient";
import AnimatedBackground from "@/components/AnimatedBackground";
import { 
  saveChatMessage, 
  createChatSession,
  getChatSession,
  ChatMessage,
  ChatSession
} from "@/lib/chatService";
import { analyzeText } from "@/lib/sentimentAnalysis";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Brain } from "lucide-react";
import VoiceRoboCharacter from "@/components/3d/VoiceRoboCharacter";
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

// Define the SpeechRecognition type
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onerror: (event: any) => void;
  onresult: (event: any) => void;
  onend: (event: any) => void;
}

// Define the window with SpeechRecognition
interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition: new () => SpeechRecognition;
  webkitSpeechRecognition: new () => SpeechRecognition;
}

const VoiceChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-" + Date.now(),
      content: "Hello! I'm your EmotiCare voice companion. Press the microphone button and tell me how you're feeling today.",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(true);
  const [speechRecognitionError, setSpeechRecognitionError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isSpeechSynthesisSupported, setIsSpeechSynthesisSupported] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [useDeepgram, setUseDeepgram] = useState(true); // Flag to track if we should use Deepgram
  const [useDeepgramTTS, setUseDeepgramTTS] = useState(true); // Flag to track if we should use Deepgram for TTS
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const navigate = useNavigate();
  const [animationMode, setAnimationMode] = useState(false);
  const [animationScale, setAnimationScale] = useState(1);
  const [activeAnimation, setActiveAnimation] = useState<"listening" | "thinking" | "speaking" | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showCrisisAlert, setShowCrisisAlert] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSound, setCurrentSound] = useState<string | null>(null);
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Sound options
  const soundOptions = [
    { name: "Forest", file: "/sounds/forest.mp3" },
    { name: "Rain", file: "/sounds/rain.mp3" },
    { name: "Waves", file: "/sounds/waves.mp3" },
    { name: "White Noise", file: "/sounds/white-noise.mp3" }
  ];

  // Fetch user profile and initialize voice chat session
  useEffect(() => {
    const initializeVoiceChat = async () => {
      setIsLoadingProfile(true);
      setIsLoadingSession(true);

      try {
        // Check if user is authenticated
        if (!auth.currentUser) {
          console.log('No authenticated user, redirecting to login');
          navigate('/login');
          return;
        }
        
        const profile = await getCurrentUserProfile();
        setUserProfile(profile);

        if (!profile) {
          throw new Error('Could not load user profile');
        }

        // Check for active session in localStorage
        const savedSessionId = localStorage.getItem('activeVoiceSessionId');
        
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
              setIsLoadingSession(false);
              setIsLoadingProfile(false);
              return;
            }
          } catch (error) {
            console.error('Error loading saved voice session:', error);
            localStorage.removeItem('activeVoiceSessionId');
          }
        }

        // Create a new chat session if no saved session
        const newSessionId = await createChatSession(profile.uid, 'voice');
        if (!newSessionId) {
          throw new Error('Failed to create voice chat session');
        }
        setSessionId(newSessionId);
        localStorage.setItem('activeVoiceSessionId', newSessionId);

        // Welcome message
        const welcomeMessage: Message = {
          id: "welcome-" + Date.now(),
          content: "Hello! I'm your EmotiCare voice companion. Press the microphone button and tell me how you're feeling today.",
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
        console.error('Error initializing voice chat:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to initialize voice chat. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingProfile(false);
        setIsLoadingSession(false);
      }
    };
    
    initializeVoiceChat();
  }, [navigate]);
  
  // Initialize speech recognition
  useEffect(() => {
    // Reset error state
    setSpeechRecognitionError(null);
    setPermissionDenied(false);
    
    // Both Deepgram and browser's SpeechRecognition need microphone access
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        // Microphone access granted
        console.log("Microphone access granted");
        
        // Set up browser's SpeechRecognition as a fallback
        const windowWithSpeech = window as unknown as WindowWithSpeechRecognition;
        const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
          try {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';
            
            recognitionRef.current.onresult = (event) => {
              const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
              
              setTranscription(transcript);
              
              // Update volume based on speech intensity
              if (event.results[0].isFinal) {
                setVolumeLevel(Math.min(100, Math.floor(event.results[0][0].confidence * 100)));
              }
            };
            
            recognitionRef.current.onerror = (event) => {
              console.error('Speech recognition error', event);
              
              // Check for specific error types
              if (event.error === 'not-allowed' || event.error === 'permission-denied') {
                setPermissionDenied(true);
                setSpeechRecognitionError("Microphone access was denied. Please allow microphone access in your browser settings.");
              } else if (event.error === 'no-speech') {
                setSpeechRecognitionError("No speech was detected. Please try speaking louder or check your microphone.");
              } else if (event.error === 'audio-capture') {
                setSpeechRecognitionError("No microphone was found. Please ensure a microphone is connected and working.");
              } else if (event.error === 'network') {
                setSpeechRecognitionError("A network error occurred. Please check your internet connection.");
              } else if (event.error === 'aborted') {
                // This is a normal condition when stopping recognition, don't treat as error
                setSpeechRecognitionError(null);
              } else {
                setSpeechRecognitionError("There was a problem with speech recognition. Please try again.");
              }
              
              setIsListening(false);
              
              if (event.error !== 'aborted') {
                toast({
                  title: "Error",
                  description: "There was a problem with speech recognition. Please try again.",
                  variant: "destructive",
                });
              }
            };
            
            recognitionRef.current.onend = () => {
              // Only restart if we're still supposed to be listening and no errors and NOT using Deepgram
              if (isListening && !permissionDenied && !speechRecognitionError && !useDeepgram) {
                try {
                  recognitionRef.current?.start();
                } catch (error) {
                  console.error("Error restarting speech recognition:", error);
                  setIsListening(false);
                }
              }
            };
            
          } catch (initError) {
            console.error("Error initializing speech recognition:", initError);
            setIsSpeechRecognitionSupported(false);
            toast({
              title: "Speech Recognition Error",
              description: "Failed to initialize speech recognition. Please try a different browser.",
              variant: "destructive",
            });
          }
        } else {
          setIsSpeechRecognitionSupported(false);
          toast({
            title: "Not Supported",
            description: "Speech recognition is not supported in your browser. Try Chrome, Edge, or Safari.",
            variant: "destructive",
          });
        }
      })
      .catch((err) => {
        console.error("Microphone access error:", err);
        setPermissionDenied(true);
        setSpeechRecognitionError("Microphone access was denied. Please allow microphone access in your browser settings.");
      });
    
    return () => {
      // Clean up
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Error stopping speech recognition:", e);
        }
      }
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);
  
  // Simulate volume meter when listening but no speech is detected
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isListening) {
      interval = setInterval(() => {
        // Only simulate volume if speech recognition is not supported
        if (!isSpeechRecognitionSupported) {
          setVolumeLevel(Math.floor(Math.random() * 100));
        } else if (!transcription) {
          // Gentler volume indication when waiting for speech
          setVolumeLevel(Math.floor(Math.random() * 30));
        }
      }, 150);
    } else if (!isListening) {
      setVolumeLevel(0);
    }
    
    return () => clearInterval(interval);
  }, [isListening, transcription, isSpeechRecognitionSupported]);
  
  // Initialize speech synthesis
  useEffect(() => {
    if (!window.speechSynthesis) {
      setIsSpeechSynthesisSupported(false);
      console.warn("Speech synthesis not supported in this browser");
      return;
    }
    
    // Load voices - needed for Chrome
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    
    loadVoices();
    
    // Chrome requires this event listener to get voices
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    return () => {
      // Cancel any ongoing speech when component unmounts
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleListening = () => {
    // Clear any previous error
    setSpeechRecognitionError(null);
    
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    setIsListening(true);
    setTranscription("");
    audioChunksRef.current = [];
    
    if (useDeepgram) {
      // Use Deepgram for transcription
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          const options = { mimeType: 'audio/webm' };
          try {
            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;
            
            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
              }
            };
            
            mediaRecorder.onstop = async () => {
              if (audioChunksRef.current.length > 0) {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                
                try {
                  // Process with Deepgram
                  const text = await transcribeAudio(audioBlob);
                  setTranscription(text);
                  
                  // Save transcription to database for analysis
                  if (sessionId && userProfile && text.trim()) {
                    try {
                      await saveChatMessage({
                        userId: userProfile.uid,
                        content: `[Transcription]: ${text}`,
                        sender: "system",
                        timestamp: new Date(),
                        transcription: true
                      }, sessionId);
                    } catch (error) {
                      console.error("Error saving transcription:", error);
                      // Continue with normal flow even if saving fails
                    }
                  }
                  
                  if (text.trim()) {
                    handleSendMessage(text);
                  } else {
                    toast({
                      title: "No speech detected",
                      description: "Please try again and speak clearly.",
                    });
                  }
                } catch (error) {
                  console.error("Error with Deepgram transcription:", error);
                  
                  // Check if we should fall back to SpeechRecognition
                  if (handleDeepgramError(error) && isSpeechRecognitionSupported) {
                    setUseDeepgram(false);
                    toast({
                      title: "Fallback to Browser Recognition",
                      description: "Using browser's built-in speech recognition instead.",
                    });
                    // Restart with browser API
                    setTimeout(() => {
                      setIsListening(false);
                      startListening();
                    }, 500);
                  } else {
                    toast({
                      title: "Transcription Error",
                      description: "Failed to transcribe your speech. Please try again.",
                      variant: "destructive",
                    });
                    setIsListening(false);
                  }
                }
              }
              
              // Clean up the stream
              stream.getTracks().forEach(track => track.stop());
            };
            
            // Visual feedback for recording
            const visualFeedbackInterval = setInterval(() => {
              // Get volume level from the audio stream
              const audioContext = new AudioContext();
              const analyser = audioContext.createAnalyser();
              const microphone = audioContext.createMediaStreamSource(stream);
              microphone.connect(analyser);
              analyser.fftSize = 256;
              const bufferLength = analyser.frequencyBinCount;
              const dataArray = new Uint8Array(bufferLength);
              
              analyser.getByteFrequencyData(dataArray);
              const average = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
              setVolumeLevel(Math.min(100, Math.floor(average * 1.5))); // Scaling for better visual
              
              if (!isListening) {
                clearInterval(visualFeedbackInterval);
                audioContext.close();
              }
            }, 100);
            
            // Start recording
            mediaRecorder.start(100); // Collect data every 100ms
          } catch (err) {
            console.error("Error creating MediaRecorder:", err);
            
            // Fall back to browser's SpeechRecognition
            setUseDeepgram(false);
            if (isSpeechRecognitionSupported && recognitionRef.current) {
              startBrowserSpeechRecognition();
            } else {
              setIsListening(false);
              toast({
                title: "Recording Error",
                description: "Failed to start audio recording. Please try again.",
                variant: "destructive",
              });
            }
          }
        })
        .catch((err) => {
          console.error("Error accessing microphone:", err);
          setPermissionDenied(true);
          setIsListening(false);
          toast({
            title: "Microphone Error",
            description: "Failed to access your microphone. Please check permissions.",
            variant: "destructive",
          });
        });
    } else {
      // Use browser's built-in SpeechRecognition
      startBrowserSpeechRecognition();
    }
  };

  const startBrowserSpeechRecognition = () => {
    if (recognitionRef.current && isSpeechRecognitionSupported) {
      try {
        recognitionRef.current.stop();
        setTimeout(() => {
          try {
            if (recognitionRef.current) {
              recognitionRef.current.start();
            }
          } catch (startErr) {
            console.error("Error starting speech recognition:", startErr);
            setIsListening(false);
            setSpeechRecognitionError("Failed to start speech recognition. Please refresh the page and try again.");
          }
        }, 100);
      } catch (err) {
        console.error("Error stopping speech recognition before restart:", err);
        
        // Try direct start if stop fails
        try {
          recognitionRef.current.start();
        } catch (directStartErr) {
          console.error("Error with direct start of speech recognition:", directStartErr);
          setIsListening(false);
          setSpeechRecognitionError("Failed to start speech recognition. Please refresh the page and try again.");
        }
      }
    } else if (!isSpeechRecognitionSupported) {
      // Only use mock data when speech recognition is truly not available
      toast({
        title: "Using Demo Mode",
        description: "Speech recognition is not available. Using demo mode instead.",
      });
    }
  };

  const stopListening = async (text = transcription) => {
    setIsListening(false);
    
    if (useDeepgram && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      // The onstop handler will process the audio and call handleSendMessage
    } else if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        
        if (text.trim()) {
          // Save transcription to database for analysis, even if not sent as message
          if (sessionId && userProfile) {
            try {
              await saveChatMessage({
                userId: userProfile.uid,
                content: `[Transcription]: ${text}`,
                sender: "system", // Mark as system message to differentiate from user messages
                timestamp: new Date(),
                transcription: true // Add flag to identify as transcription
              }, sessionId);
            } catch (error) {
              console.error("Error saving transcription:", error);
              // Continue with normal flow even if saving fails
            }
          }
          
          handleSendMessage(text);
        } else if (!isSpeechRecognitionSupported) {
          // Only in case speech recognition is not supported AND no text was captured,
          // we might want to use a mock message as fallback
          const mockTranscription = "I'm having trouble with speech recognition in this browser.";
          handleSendMessage(mockTranscription);
        } else {
          toast({
            title: "No speech detected",
            description: "Please try again and speak clearly.",
          });
        }
      } catch (e) {
        console.error("Error stopping speech recognition:", e);
      }
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !sessionId || !userProfile) return;
    
    setIsProcessing(true);
    
    try {
      // Create user message
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        content: text.trim(),
        sender: "user",
        timestamp: new Date(),
      };
      
      // Add user message to UI immediately
      setMessages(prev => [...prev, userMessage]);
      
      // Save to database
      const savedMessageId = await saveChatMessage({
        userId: userProfile.uid,
        content: text.trim(),
        sender: "user",
        timestamp: userMessage.timestamp,
      }, sessionId);
      
      userMessage.id = savedMessageId;
      
      // Show typing animation
      setIsTyping(true);
      
      // Create message history for API
      const messageHistory = messages
        .filter(msg => !msg.transcription) // Exclude transcription messages
        .map(msg => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.content
        }));
      
      // Add latest message
      messageHistory.push({ role: "user", content: text.trim() });
      
      // Analyze sentiment
      const { emotion, sentiment } = analyzeText(text);
      userMessage.emotion = emotion;
      userMessage.sentiment = sentiment;
      
      // Check for crisis content with different severity levels
      const criticalPhrases = [
        'suicide', 'kill myself', 'end my life', 'die', 'wanna commit suicide',
        'i wanna commit suicide', 'she is abusing me', 'he is abusing me', 
        'being abused', 'abusing me', 'help me', 'emergency', 'in danger',
        'want to die', 'going to kill', 'hurt myself', 'self-harm',
        'khudkhushi', 'aatmahatya', 'marna chahta'
      ];
      
      const isCriticalMessage = criticalPhrases.some(phrase => text.toLowerCase().includes(phrase));
      const isCrisisMessage = !isCriticalMessage && detectCrisisContent(text);
      
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
      
      // Generate response - system message is handled in groqClient
      const response = await generateChatResponse(messageHistory);
      
      // Hide typing animation
      setIsTyping(false);
      
      if (!response?.trim()) {
        throw new Error('Empty response from chat API');
      }
      
      // Create bot message
      const botMessage: Message = {
        id: `temp-bot-${Date.now()}`,
        content: response.trim(),
        sender: "bot",
        timestamp: new Date(),
      };
      
      // Save bot message to database
      const savedBotMessageId = await saveChatMessage({
        userId: userProfile.uid,
        content: botMessage.content,
        sender: "bot",
        timestamp: botMessage.timestamp,
      }, sessionId);
      
      botMessage.id = savedBotMessageId;
      
      // Get updated session to ensure we have the latest messages
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
      } else {
        // Fallback to local state update if we can't get the updated session
        setMessages(prev => [...prev, botMessage]);
      }
      
      setIsProcessing(false);
      
      // Process with speech synthesis - keep this part the same
      if (useDeepgramTTS) {
        try {
          setIsSpeaking(true);
          
          // Remove emojis from the text to avoid issues with TTS
          const textWithoutEmojis = response.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
          
          // Analyze message content for better speech parameters
          const isQuestion = textWithoutEmojis.includes('?');
          const isExclamation = textWithoutEmojis.includes('!');
          const wordCount = textWithoutEmojis.split(/\s+/).length;
          
          // Determine optimal speed based on content
          let speed = 1.0;
          
          // Adjust speech parameters based on content
          if (wordCount > 30) {
            // Longer messages should be spoken slightly faster
            speed = 1.05;
          } else if (isQuestion) {
            // Questions slightly slower
            speed = 0.95;
          } else if (isExclamation) {
            // Exclamations slightly faster
            speed = 1.1;
          } else if (wordCount < 10) {
            // Shorter messages slower for clarity
            speed = 0.92;
          }
          
          // Use Deepgram for TTS with our enhanced parameters
          const audioBlob = await textToSpeech(textWithoutEmojis, {
            speed: speed,
            // Note: Deepgram doesn't support pitch directly, but we're
            // passing the parameter for future compatibility
            pitch: isQuestion ? 1.05 : isExclamation ? 1.1 : 1.0
          });
          
          // Create an audio element and play the speech
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          
          audio.onended = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl); // Clean up
          };
          
          audio.onerror = (event) => {
            console.error("Error playing Deepgram TTS audio");
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl); // Clean up
            
            // Fall back to browser's SpeechSynthesis
            setUseDeepgramTTS(false);
            const textWithoutEmojis = response.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
            speakWithBrowserSynthesis(textWithoutEmojis);
          };
          
          await audio.play();
        } catch (error) {
          console.error('Error generating speech with Deepgram:', error);
          
          // If error is due to rate limit or auth issues, fall back to browser's SpeechSynthesis
          if (handleDeepgramError(error)) {
            setUseDeepgramTTS(false);
            // Ensure we define textWithoutEmojis if it hasn't been defined
            const textWithoutEmojis = response.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
            speakWithBrowserSynthesis(textWithoutEmojis);
          } else {
            setIsSpeaking(false);
            toast({
              title: "Speech Error",
              description: "Failed to generate speech. Please try again.",
              variant: "destructive",
            });
          }
        }
      } else {
        // Use browser's SpeechSynthesis
        speakWithBrowserSynthesis(response.replace(/[\u{1F300}-\u{1F9FF}]/gu, ''));
      }
    } catch (error) {
      console.error("Error generating response:", error);
      toast({
        title: "Error",
        description: "Failed to get a response. Please try again.",
        variant: "destructive",
      });
      // Remove any temporary messages if saving failed
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
      setIsProcessing(false);
    }
  };

  const speakWithBrowserSynthesis = (text: string) => {
    if (window.speechSynthesis && isSpeechSynthesisSupported) {
      setIsSpeaking(true);
      
      // Create a new utterance
      const utterance = new SpeechSynthesisUtterance(text);
      synthRef.current = utterance;
      
      // Set voice to a female voice if available
      const voices = window.speechSynthesis.getVoices();
      console.log("Available voices:", voices.map(v => v.name).join(", "));
      
      // Try to find a good voice in this order of preference
      let selectedVoice = null;
      
      // First try to find premium voices
      selectedVoice = voices.find(voice => 
        (voice.name.includes('Google UK English Female') || 
         voice.name.includes('Microsoft Zira') ||
         voice.name.includes('Samantha') ||
         voice.name.includes('Microsoft Hazel')) && 
        (voice.lang.startsWith('en'))
      );
      
      // If no premium voice, try any female English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
          (voice.name.includes('female') || voice.name.includes('Female')) && 
          (voice.lang.startsWith('en'))
        );
      }
      
      // If still no voice, try any English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.startsWith('en'));
      }
      
      // If still no voice, use the first available voice
      if (!selectedVoice && voices.length > 0) {
        selectedVoice = voices[0];
      }
      
      if (selectedVoice) {
        console.log("Selected voice:", selectedVoice.name);
        utterance.voice = selectedVoice;
      }
      
      // Extract message features to drive human-like parameters
      const isQuestion = text.includes('?');
      const isExclamation = text.includes('!');
      const wordCount = text.split(/\s+/).length;
      const hasCommas = text.includes(',');
      
      // Determine speech base rate - faster for short messages, slower for longer ones
      let baseRate = wordCount < 10 ? 0.95 : wordCount > 30 ? 0.85 : 0.9;
      
      // Determine pitch variation
      let basePitch = 1.0; // Default neutral pitch
      
      // Adjust for question/exclamation
      if (isQuestion) {
        baseRate *= 0.95; // Slightly slower for questions
        basePitch = 1.05; // Slightly higher pitch for questions
      } else if (isExclamation) {
        baseRate *= 1.1; // Slightly faster for exclamations
        basePitch = 1.1; // Higher pitch for exclamations
      }
      
      // Set the voice parameters for human-like speech
      utterance.rate = baseRate;
      utterance.pitch = basePitch;
      utterance.volume = 0.9;
      
      // Analyze sentences and add SSML-like pauses using text processing
      let processedText = text;
      
      // Add slight pauses after punctuation
      if (hasCommas || text.includes(';') || text.includes(':')) {
        // Instead of SSML (not supported in all browsers), we'll modify the text
        // Break into shorter utterances with natural pauses
        const sentences = text.split(/([.!?]+)/);
        
        if (sentences.length > 2) { // If we have multiple sentences
          // We'll speak each sentence with a slight pause between
          let currentIndex = 0;
          
          const speakNextSentence = () => {
            if (currentIndex < sentences.length) {
              const sentencePair = sentences.slice(currentIndex, currentIndex + 2).join('');
              if (sentencePair.trim()) {
                const sentenceUtterance = new SpeechSynthesisUtterance(sentencePair);
                
                // Copy voice and base parameters
                if (selectedVoice) sentenceUtterance.voice = selectedVoice;
                sentenceUtterance.rate = baseRate;
                sentenceUtterance.pitch = basePitch;
                
                // Add variations for more natural speech
                // Slightly vary the pitch and rate for each sentence
                sentenceUtterance.pitch += (Math.random() * 0.1) - 0.05;
                sentenceUtterance.rate += (Math.random() * 0.1) - 0.05;
                
                // When this sentence finishes, speak the next one
                sentenceUtterance.onend = () => {
                  currentIndex += 2;
                  speakNextSentence();
                };
                
                // Handle the last sentence ending
                if (currentIndex >= sentences.length - 2) {
                  sentenceUtterance.onend = () => {
                    setIsSpeaking(false);
                    synthRef.current = null;
                  };
                }
                
                // Handle errors
                sentenceUtterance.onerror = (event) => {
                  console.error('Speech synthesis error:', event);
                  setIsSpeaking(false);
                  synthRef.current = null;
                };
                
                window.speechSynthesis.speak(sentenceUtterance);
              } else {
                // Skip empty sentences
                currentIndex += 2;
                speakNextSentence();
              }
            } else {
              // All sentences spoken
              setIsSpeaking(false);
              synthRef.current = null;
            }
          };
          
          // Start speaking the first sentence
          speakNextSentence();
          return;
        }
      }
      
      // For simple sentences, use the standard approach
      // Handle events
      utterance.onend = () => {
        setIsSpeaking(false);
        synthRef.current = null;
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
        synthRef.current = null;
      };
      
      // Speak the text
      window.speechSynthesis.speak(utterance);
    } else {
      // Fallback to simulation if speech synthesis is not supported
      setIsSpeaking(true);
      setTimeout(() => {
        setIsSpeaking(false);
      }, 4000);
    }
  };
  
  // Cancel speech when user starts speaking
  useEffect(() => {
    if (isListening && isSpeaking && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isListening, isSpeaking]);

  // Add animation effect - place this with other useEffects
  useEffect(() => {
    let animationInterval: NodeJS.Timeout;
    
    if (animationMode) {
      if (isListening) {
        setActiveAnimation("listening");
        animationInterval = setInterval(() => {
          // Scale animation based on volume level
          const newScale = 1 + (volumeLevel / 100) * 0.5;
          setAnimationScale(newScale);
        }, 100);
      } else if (isProcessing) {
        setActiveAnimation("thinking");
        animationInterval = setInterval(() => {
          setAnimationScale(prev => prev === 1 ? 1.2 : 1);
        }, 500);
      } else if (isSpeaking) {
        setActiveAnimation("speaking");
        animationInterval = setInterval(() => {
          setAnimationScale(prev => 1 + Math.random() * 0.3);
        }, 150);
      } else {
        setActiveAnimation(null);
        setAnimationScale(1);
      }
    }
    
    return () => {
      if (animationInterval) clearInterval(animationInterval);
    };
  }, [animationMode, isListening, isProcessing, isSpeaking, volumeLevel]);

  // Add toggle function
  const toggleAnimationMode = () => {
    setAnimationMode(prev => !prev);
  };

  // Add new styles to the component
  useEffect(() => {
    // Add animation keyframes to the document
    const styleSheet = document.createElement("style");
    styleSheet.id = "voice-animation-styles";
    styleSheet.textContent = `
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.05); opacity: 1; }
      }
      
      @keyframes float {
        0%, 100% { transform: translateY(0) translateX(0); }
        25% { transform: translateY(-10px) translateX(5px); }
        50% { transform: translateY(0) translateX(10px); }
        75% { transform: translateY(10px) translateX(5px); }
      }
      
      .animation-delay-500 {
        animation-delay: 500ms;
      }
      
      .animation-delay-1000 {
        animation-delay: 1000ms;
      }
    `;
    document.head.appendChild(styleSheet);

    return () => {
      const styleElement = document.getElementById("voice-animation-styles");
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, []);

  // Add an effect to continuously update animations
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = Date.now();
    
    const updateAnimation = () => {
      const currentTime = Date.now();
      
      // Update animations when in animation mode
      if (animationMode) {
        // Force a re-render to update the animations
        if (currentTime - lastTime > 50) { // Update roughly every 50ms
          setAnimationScale(prev => {
            // Different scales based on the active animation state
            if (activeAnimation === "listening") {
              return 1 + (volumeLevel / 100) * 0.5;
            } else if (activeAnimation === "thinking") {
              return prev === 1 ? 1.05 : 1;
            } else if (activeAnimation === "speaking") {
              return 1 + Math.random() * 0.2;
            }
            return 1;
          });
          
          lastTime = currentTime;
        }
      }
      
      animationFrameId = requestAnimationFrame(updateAnimation);
    };
    
    if (animationMode) {
      animationFrameId = requestAnimationFrame(updateAnimation);
    }
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [animationMode, activeAnimation, volumeLevel]);

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
    if (backgroundAudioRef.current) {
      // If already playing, pause it first
      backgroundAudioRef.current.pause();
      
      // If selecting the same sound that's already playing, just toggle off
      if (currentSound === soundFile && isPlaying) {
        setIsPlaying(false);
        setCurrentSound(null);
        return;
      }
      
      // Set new sound
      backgroundAudioRef.current.src = soundFile;
      backgroundAudioRef.current.loop = true;
      backgroundAudioRef.current.volume = 0.3; // Set volume to 30%
      backgroundAudioRef.current.play()
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
    if (backgroundAudioRef.current) {
      if (isPlaying) {
        backgroundAudioRef.current.pause();
        setIsPlaying(false);
      } else if (currentSound) {
        backgroundAudioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(console.error);
      }
    }
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (backgroundAudioRef.current) {
        backgroundAudioRef.current.pause();
        backgroundAudioRef.current.src = "";
      }
    };
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <AnimatedBackground />
      
      {/* Header - Hide header when in animation mode */}
      {!animationMode && <Header />}
      
      {/* Crisis Resources Alert */}
      {showCrisisAlert && !animationMode && (
        <div className="container mx-auto px-4 pt-2 z-30">
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
      
      {/* Main content - Only render when not in animation mode */}
      {!animationMode && (
        <main className="container mx-auto px-4 pt-6 pb-6">
          <div className="mx-auto max-w-4xl relative">
            {/* VoiceRobo Character - Fixed on the right side */}
            <div className="hidden lg:block absolute -right-[320px] top-1/4 z-10">
              <VoiceRoboCharacter 
                width={350} 
                height={350} 
                isListening={isListening}
                isSpeaking={isSpeaking}
                isProcessing={isProcessing}
                className="pointer-events-none"
              />
            </div>

            {/* VoiceRobo Character - Fixed on the left side for medium screens */}
            <div className="hidden md:block lg:hidden absolute -left-[280px] top-1/4 z-10">
              <VoiceRoboCharacter 
                width={280} 
                height={280}
                isListening={isListening}
                isSpeaking={isSpeaking}
                isProcessing={isProcessing}
                className="pointer-events-none"
              />
            </div>

            <Card className="backdrop-blur-md bg-white/90 border shadow-lg">
              <CardContent className="p-0">
                {/* Professional header section */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mic className="h-6 w-6" />
                    <div>
                      <h2 className="font-semibold text-lg">Voice Chat Session</h2>
                      <p className="text-xs text-blue-100">Speak naturally with EmotiCare AI</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">                  
                    {isSpeaking && (
                      <Badge variant="secondary" className="bg-blue-400/20 text-white px-2 py-1 flex items-center gap-1">
                        <span className="animate-pulse">●</span> AI Speaking
                      </Badge>
                    )}
                    {isListening && (
                      <Badge variant="secondary" className="bg-red-400/20 text-white px-2 py-1 flex items-center gap-1">
                        <span className="animate-pulse">●</span> Listening
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col h-[80vh]">
                  {/* Normal text chat view */}
                  <ScrollArea className="flex-1 p-6">
                    {isLoadingProfile ? (
                      <div className="space-y-6">
                        <Skeleton className="h-16 w-3/4" />
                        <Skeleton className="h-16 w-1/2 ml-auto" />
                        <Skeleton className="h-16 w-2/3" />
                      </div>
                    ) : messages.filter(message => message.sender !== "system").length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6">
                        <div className="w-20 h-20 mb-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <Mic className="h-8 w-8 text-blue-500" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Start a voice conversation</h3>
                        <p className="text-gray-500 max-w-md mb-6">
                          Tap the microphone button below and start speaking. Your voice will be transcribed and EmotiCare will respond.
                        </p>
                        <Button 
                          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                          onClick={toggleListening}
                          disabled={isProcessing || isSpeaking || permissionDenied}
                        >
                          Start Speaking
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
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
                                className={`flex items-start gap-3 max-w-[85%] ${
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
                                    className={`px-4 py-3 rounded-lg message-animation ${
                                      message.sender === "user"
                                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                                        : "bg-gray-100 dark:bg-slate-800 dark:text-gray-100"
                                    }`}
                                  >
                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                  </div>
                                  <div
                                    className={`flex text-xs text-gray-500 mt-1 ${
                                      message.sender === "user" ? "justify-end mr-2" : "justify-start ml-2"
                                    }`}
                                  >
                                    {message.timestamp?.toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </div>
                                </div>
                                
                                {/* Add play button for bot messages */}
                                {message.sender === "bot" && !isSpeaking && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full"
                                    onClick={() => {
                                      if (useDeepgramTTS) {
                                        // Remove emojis for TTS
                                        const textWithoutEmojis = message.content.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
                                        
                                        // Analyze message for better speech parameters
                                        const isQuestion = textWithoutEmojis.includes('?');
                                        const isExclamation = textWithoutEmojis.includes('!');
                                        const wordCount = textWithoutEmojis.split(/\s+/).length;
                                        
                                        // Determine optimal speed based on content
                                        let speed = 1.0;
                                        
                                        // Adjust speech parameters based on content
                                        if (wordCount > 30) {
                                          // Longer messages should be spoken slightly faster
                                          speed = 1.05;
                                        } else if (isQuestion) {
                                          // Questions slightly slower
                                          speed = 0.95;
                                        } else if (isExclamation) {
                                          // Exclamations slightly faster
                                          speed = 1.1;
                                        } else if (wordCount < 10) {
                                          // Shorter messages slower for clarity
                                          speed = 0.92;
                                        }
                                        
                                        // Use Deepgram TTS with enhanced parameters
                                        textToSpeech(textWithoutEmojis, {
                                          speed: speed,
                                          pitch: isQuestion ? 1.05 : isExclamation ? 1.1 : 1.0
                                        })
                                          .then((audioBlob) => {
                                            setIsSpeaking(true);
                                            const audioUrl = URL.createObjectURL(audioBlob);
                                            const audio = new Audio(audioUrl);
                                            audio.onended = () => {
                                              setIsSpeaking(false);
                                              URL.revokeObjectURL(audioUrl);
                                            };
                                            audio.onerror = () => {
                                              setIsSpeaking(false);
                                              URL.revokeObjectURL(audioUrl);
                                              // Fallback
                                              speakWithBrowserSynthesis(textWithoutEmojis);
                                            };
                                            audio.play();
                                          })
                                          .catch((error) => {
                                            console.error('Error with Deepgram TTS:', error);
                                            speakWithBrowserSynthesis(textWithoutEmojis);
                                          });
                                      } else {
                                        // Use browser's speech synthesis
                                        speakWithBrowserSynthesis(message.content);
                                      }
                                    }}
                                    disabled={isSpeaking}
                                    title="Play message"
                                  >
                                    <Play className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                          
                          {/* Typing indicator */}
                          {isTyping && (
                            <div className="flex justify-start">
                              <div className="flex items-start gap-3 max-w-[85%]">
                                <Avatar className="mt-1 bg-gradient-to-br from-blue-400 to-purple-500">
                                  <AvatarImage src="/favicon.png" />
                                  <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                                    <Bot className="h-4 w-4" />
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="px-4 py-3 rounded-lg bg-gray-100 dark:bg-slate-800 dark:text-gray-100">
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
                  
                  {/* Voice input controls */}
                  <div className="p-4 border-t flex flex-col gap-4">
                    {/* Error messages */}
                    {!animationMode && (
                      <>
                        {permissionDenied && (
                          <Alert variant="destructive" className="mb-4">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            <AlertTitle>Microphone Access Denied</AlertTitle>
                            <AlertDescription>
                              Please allow microphone access in your browser settings to use voice chat.
                            </AlertDescription>
                          </Alert>
                        )}
                        
                        {speechRecognitionError && !permissionDenied && (
                          <Alert variant="destructive" className="mb-4">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            <AlertTitle>Speech Recognition Error</AlertTitle>
                            <AlertDescription>{speechRecognitionError}</AlertDescription>
                          </Alert>
                        )}
                      </>
                    )}
                    
                    {/* Mobile VoiceRobo character - only visible on small screens */}
                    <div className="md:hidden flex justify-center mb-2">
                      <VoiceRoboCharacter 
                        width={120} 
                        height={120}
                        isListening={isListening}
                        isSpeaking={isSpeaking}
                        isProcessing={isProcessing}
                        className="pointer-events-none"
                      />
                    </div>
                    
                    {/* Voice controls */}
                    {!animationMode && (
                      <div className="flex flex-wrap items-center justify-center gap-3 p-4 border-t">
                        {/* Music player button */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="relative"
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
                        
                        {/* Animation mode toggle */}
                        <Button
                          variant="outline"
                          size="icon"
                          className={`relative ${animationMode ? 'bg-blue-100 text-blue-700 border-blue-300' : ''}`}
                          onClick={toggleAnimationMode}
                        >
                          {animationMode ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                        </Button>
                        
                        {/* Microphone button */}
                        <Button
                          size="lg"
                          variant={isListening ? "destructive" : "default"}
                          className={`rounded-full h-14 w-14 transition-all shadow-lg ${
                            isListening ? "bg-red-500 animate-pulse" : "bg-gradient-to-r from-blue-500 to-purple-600"
                          }`}
                          onClick={toggleListening}
                          disabled={isProcessing || isSpeaking || !navigator.mediaDevices}
                        >
                          {isListening ? (
                            <MicOff className="h-6 w-6" />
                          ) : (
                            <Mic className="h-6 w-6" />
                          )}
                        </Button>
                        
                        {/* Text chat link */}
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-full"
                          asChild
                        >
                          <Link to="/chatbot" title="Switch to Text Chat">
                            <MessageSquare className="h-5 w-5" />
                          </Link>
                        </Button>
                        
                        {/* Add the audio element for background sounds */}
                        <audio ref={backgroundAudioRef} className="hidden" />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      )}
      
      {/* Animation mode in full page - completely separate from the card UI */}
      {animationMode && (
        <div className="fixed inset-0 z-50 bg-gradient-to-b from-blue-900 to-purple-900 flex items-center justify-center">
          {/* Custom 3D animation */}
          <div className="w-full h-full flex flex-col items-center justify-center relative">
            {/* Main animation container */}
            <div className="relative w-[80vmin] h-[80vmin] flex items-center justify-center">
              {/* Orbiting circles */}
              <div className="absolute w-full h-full animate-spin" style={{ animationDuration: '30s' }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-blue-400/30 blur-sm"
                     style={{ filter: "blur(8px)" }} />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-purple-400/30 blur-sm"
                     style={{ filter: "blur(8px)" }} />
              </div>
              
              <div className="absolute w-full h-full animate-spin" style={{ animationDuration: '25s', animationDirection: 'reverse' }}>
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-12 h-12 rounded-full bg-pink-400/30 blur-sm"
                     style={{ filter: "blur(10px)" }} />
                <div className="absolute top-1/2 right-0 -translate-y-1/2 w-12 h-12 rounded-full bg-indigo-400/30 blur-sm" 
                     style={{ filter: "blur(10px)" }} />
              </div>
              
              <div className="absolute w-[90%] h-[90%] animate-spin" style={{ animationDuration: '40s' }}>
                <div className="absolute top-0 left-0 w-6 h-6 rounded-full bg-yellow-400/30 blur-sm"
                     style={{ filter: "blur(6px)" }} />
                <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-green-400/30 blur-sm"
                     style={{ filter: "blur(6px)" }} />
              </div>
              
              {/* Expanding circles based on animation state */}
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Listening animation */}
                {activeAnimation === "listening" && (
                  <>
                    <div className="absolute w-full h-full flex items-center justify-center">
                      <div className="absolute rounded-full bg-blue-400/10 animate-ping" 
                           style={{ 
                             width: `${30 + volumeLevel}px`, 
                             height: `${30 + volumeLevel}px`,
                             animationDuration: '1s'
                           }} />
                      <div className="absolute rounded-full bg-blue-500/20 animate-ping animation-delay-500" 
                           style={{ 
                             width: `${20 + volumeLevel * 0.7}px`, 
                             height: `${20 + volumeLevel * 0.7}px`,
                             animationDuration: '1.5s'
                           }} />
                      <div className="absolute rounded-full bg-indigo-400/30 animate-ping animation-delay-1000" 
                           style={{ 
                             width: `${10 + volumeLevel * 0.5}px`, 
                             height: `${10 + volumeLevel * 0.5}px`,
                             animationDuration: '2s'
                           }} />
                    </div>
                  </>
                )}
                
                {/* Processing animation */}
                {activeAnimation === "thinking" && (
                  <>
                    <div className="absolute w-40 h-40 rounded-full border-4 border-amber-500/30 animate-spin" 
                         style={{ animationDuration: '3s' }} />
                    <div className="absolute w-32 h-32 rounded-full border-4 border-amber-400/20 animate-spin" 
                         style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
                    <div className="absolute w-24 h-24 rounded-full border-4 border-yellow-300/10 animate-spin" 
                         style={{ animationDuration: '1.5s' }} />
                  </>
                )}
                
                {/* Speaking animation */}
                {activeAnimation === "speaking" && (
                  <>
                    <div className="absolute w-full h-full flex items-center justify-center">
                      <div className="absolute rounded-full bg-purple-400/20"
                           style={{ 
                             width: `${50 + Math.sin(Date.now() / 150) * 30}px`, 
                             height: `${50 + Math.sin(Date.now() / 150) * 30}px`,
                             transition: 'all 150ms ease-in-out'
                           }} />
                      <div className="absolute rounded-full bg-purple-500/10"
                           style={{ 
                             width: `${70 + Math.cos(Date.now() / 200) * 30}px`, 
                             height: `${70 + Math.cos(Date.now() / 200) * 30}px`,
                             transition: 'all 150ms ease-in-out'
                           }} />
                      <div className="absolute rounded-full bg-indigo-400/15"
                           style={{ 
                             width: `${90 + Math.sin(Date.now() / 250) * 30}px`, 
                             height: `${90 + Math.sin(Date.now() / 250) * 30}px`,
                             transition: 'all 150ms ease-in-out'
                           }} />
                    </div>
                  </>
                )}
                
                {/* Main floating orb */}
                <div 
                  className={`relative z-10 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center
                    ${activeAnimation === "listening" ? "bg-blue-600" : 
                      activeAnimation === "thinking" ? "bg-amber-500" : 
                      activeAnimation === "speaking" ? "bg-purple-600" : "bg-white/20"}
                  `}
                  style={{ 
                    width: `${60 * animationScale}px`, 
                    height: `${60 * animationScale}px`,
                    boxShadow: `0 0 40px ${
                      activeAnimation === "listening" ? "rgba(37, 99, 235, 0.5)" : 
                      activeAnimation === "thinking" ? "rgba(245, 158, 11, 0.5)" : 
                      activeAnimation === "speaking" ? "rgba(147, 51, 234, 0.5)" : 
                      "rgba(255, 255, 255, 0.3)"
                    }`
                  }}
                >
                  {/* Icon based on current state */}
                  {activeAnimation === "listening" && (
                    <Mic className="w-6 h-6 text-white" />
                  )}
                  {activeAnimation === "thinking" && (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  )}
                  {activeAnimation === "speaking" && (
                    <Volume2 className="w-6 h-6 text-white" />
                  )}
                  {!activeAnimation && (
                    <Brain className="w-6 h-6 text-white/70" />
                  )}
                </div>
              </div>
              
              {/* Outer rings */}
              <div className="absolute w-[70%] h-[70%] rounded-full border border-white/5 animate-spin"
                   style={{ animationDuration: '60s' }} />
              <div className="absolute w-[85%] h-[85%] rounded-full border border-white/5 animate-spin"
                   style={{ animationDuration: '80s', animationDirection: 'reverse' }} />
              <div className="absolute w-full h-full rounded-full border border-white/5 animate-spin"
                   style={{ animationDuration: '100s' }} />
            </div>
          
            {/* Status text */}
            <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-3">
              {activeAnimation === "listening" && (
                <Badge variant="outline" className="bg-blue-500/20 text-white border-blue-500/30">
                  Listening...
                </Badge>
              )}
              {activeAnimation === "thinking" && (
                <Badge variant="outline" className="bg-amber-500/20 text-white border-amber-500/30">
                  thinking...
                </Badge>
              )}
              {activeAnimation === "speaking" && (
                <Badge variant="outline" className="bg-purple-500/20 text-white border-purple-500/30">
                  Speaking...
                </Badge>
              )}
            </div>
          
            {/* Controls */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-white/10 border-white/20 backdrop-blur-sm hover:bg-white/20"
                onClick={toggleAnimationMode}
              >
                <ArrowLeft className="h-4 w-4 text-white" />
              </Button>
              
              <Button
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                className={`rounded-full ${!isListening ? "bg-white/10 border-white/20 backdrop-blur-sm hover:bg-white/20" : ""}`}
                onClick={isListening ? () => stopListening() : () => startListening()}
              >
                {isListening ? (
                  <Square className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4 text-white" />
                )}
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-white/10 border-white/20 backdrop-blur-sm hover:bg-white/20"
                onClick={() => navigate('/')}
              >
                <X className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceChat;
