import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import Header from "@/components/Header";
import AnimatedBackground from "@/components/AnimatedBackground";
import { Pause, Play, Timer, Moon, Sun, Volume2, Wind } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { auth } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import "./Breathing.css"; // Import custom CSS for breathing animations

const breathingPatterns = [
  {
    id: "box",
    name: "Box Breathing",
    description: "Breathe in, hold, breathe out, hold - each for the same time period. A technique used by Navy SEALs to calm the mind.",
    inhaleTime: 4,
    holdTime: 4,
    exhaleTime: 4,
    pauseTime: 4,
    color: "from-blue-400 to-blue-600",
  },
  {
    id: "relaxed",
    name: "Relaxed Breathing",
    description: "Breathe in through your nose and out through your mouth, with longer exhales to trigger the relaxation response.",
    inhaleTime: 4,
    holdTime: 1,
    exhaleTime: 6,
    pauseTime: 1,
    color: "from-purple-400 to-purple-600",
  },
  {
    id: "478",
    name: "4-7-8 Technique",
    description: "Breathe in for 4, hold for 7, exhale for 8. Developed by Dr. Andrew Weil to help with anxiety and sleep issues.",
    inhaleTime: 4,
    holdTime: 7,
    exhaleTime: 8,
    pauseTime: 0,
    color: "from-indigo-400 to-indigo-600",
  },
  {
    id: "calm",
    name: "Calming Breath",
    description: "A gentle pattern for everyday anxiety relief with equal inhales and exhales.",
    inhaleTime: 5,
    holdTime: 0,
    exhaleTime: 5,
    pauseTime: 1,
    color: "from-teal-400 to-teal-600",
  },
  {
    id: "energizing",
    name: "Energizing Breath",
    description: "Quick, stimulating breaths to increase alertness and energy levels.",
    inhaleTime: 2,
    holdTime: 0,
    exhaleTime: 2,
    pauseTime: 0,
    color: "from-amber-400 to-amber-600",
  },
];

// Ambient sounds
const sounds = [
  { id: "none", name: "None", file: null },
  { id: "rain", name: "Gentle Rain", file: "/sounds/rain.mp3" },
  { id: "waves", name: "Ocean Waves", file: "/sounds/waves.mp3" },
  { id: "forest", name: "Forest", file: "/sounds/forest.mp3" },
  { id: "whiteNoise", name: "White Noise", file: "/sounds/white-noise.mp3" },
];

const Breathing = () => {
  const navigate = useNavigate();
  const { userProfile, loading } = useAuth();
  const [selectedPattern, setSelectedPattern] = useState(breathingPatterns[0]);
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold' | 'exhale' | 'pause'>('inhale');
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(3); // In minutes
  const [timeRemaining, setTimeRemaining] = useState(duration * 60); // In seconds
  const [completed, setCompleted] = useState(0);
  const [selectedSound, setSelectedSound] = useState(sounds[0]);
  const [volume, setVolume] = useState(70);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [voiceGuidance, setVoiceGuidance] = useState(true); // Voice guidance toggle
  
  const breathAnimationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize speech synthesis
  useEffect(() => {
    // Check if the browser supports speech synthesis
    if (!window.speechSynthesis) {
      console.warn('Speech synthesis not supported in this browser');
      return;
    }
    
    // Clean up speech synthesis when component unmounts
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  // Function to speak guidance using speech synthesis
  const speakGuidance = (phase: 'inhale' | 'hold' | 'exhale' | 'pause') => {
    if (!voiceGuidance || !window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(phase);
    speechSynthRef.current = utterance;
    
    // Select a voice
    const voices = window.speechSynthesis.getVoices();
    
    // If voices aren't loaded yet, wait for them
    if (voices.length === 0) {
      // For Chrome and some browsers, we need to wait for voices to load
      window.speechSynthesis.onvoiceschanged = () => {
        const updatedVoices = window.speechSynthesis.getVoices();
        setVoiceAndSpeak(utterance, updatedVoices, phase);
      };
    } else {
      setVoiceAndSpeak(utterance, voices, phase);
    }
  };
  
  // Helper function to set voice and speak
  const setVoiceAndSpeak = (
    utterance: SpeechSynthesisUtterance, 
    voices: SpeechSynthesisVoice[],
    phase: string
  ) => {
    // Look for a female voice
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Female') || 
      voice.name.includes('female') || 
      voice.name.includes('Samantha') || 
      voice.name.includes('Joanna') ||
      voice.name.includes('Google') || 
      voice.name.includes('Microsoft')
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    // Set speech parameters
    utterance.volume = 0.8;  // 0 to 1
    utterance.rate = 0.9;    // 0.1 to 10
    utterance.pitch = 1.0;   // 0 to 2
    
    // Speak
    window.speechSynthesis.speak(utterance);
  };
  
  // Initialize audio for ambient sounds
  useEffect(() => {
    if (selectedSound.file) {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio(selectedSound.file);
          audioRef.current.loop = true;
          audioRef.current.volume = volume / 100;
        } else {
          audioRef.current.src = selectedSound.file;
        }
      } catch (error) {
        console.error("Error initializing ambient sound:", error);
      }
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [selectedSound]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);
  
  // Handle pattern change
  const handlePatternChange = (patternId: string) => {
    const pattern = breathingPatterns.find(p => p.id === patternId);
    if (pattern) {
      setSelectedPattern(pattern);
      
      // Reset breathing if already in progress
      if (isBreathing) {
        stopBreathing();
        startBreathing();
      }
    }
  };
  
  // Handle sound change
  const handleSoundChange = (soundId: string) => {
    const sound = sounds.find(s => s.id === soundId);
    if (sound) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      setSelectedSound(sound);
      
      if (sound.file && isBreathing) {
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play().catch(err => {
              console.error("Error playing audio:", err);
              toast({
                title: "Audio Error",
                description: "Could not play the selected sound.",
                variant: "destructive",
              });
            });
          }
        }, 100);
      }
    }
  };
  
  // Breathing animation logic
  const startBreathing = () => {
    setIsBreathing(true);
    setBreathingPhase('inhale');
    setProgress(0);
    setTimeRemaining(duration * 60);
    setCompleted(0);
    
    // Play initial voice guidance
    speakGuidance('inhale');
    
    // Start ambient sound
    if (selectedSound.file && audioRef.current) {
      audioRef.current.play().catch(err => {
        console.error("Error playing audio:", err);
        toast({
          title: "Audio Error",
          description: "Could not play the selected sound.",
          variant: "destructive",
        });
      });
    }
    
    // Create cycle animation
    let phase: 'inhale' | 'hold' | 'exhale' | 'pause' = 'inhale';
    let currentProgress = 0;
    let cycleTime = 0;
    const totalCycleTime = selectedPattern.inhaleTime + selectedPattern.holdTime + 
                           selectedPattern.exhaleTime + selectedPattern.pauseTime;
    
    breathAnimationRef.current = setInterval(() => {
      // Update progress in current phase
      if (phase === 'inhale' && currentProgress >= selectedPattern.inhaleTime) {
        phase = 'hold';
        currentProgress = 0;
        setBreathingPhase('hold');
        
        // Play voice guidance for hold
        if (selectedPattern.holdTime > 0.5) {
          speakGuidance('hold');
        }
      } else if (phase === 'hold' && currentProgress >= selectedPattern.holdTime) {
        phase = 'exhale';
        currentProgress = 0;
        setBreathingPhase('exhale');
        
        // Play voice guidance for exhale
        speakGuidance('exhale');
      } else if (phase === 'exhale' && currentProgress >= selectedPattern.exhaleTime) {
        phase = 'pause';
        currentProgress = 0;
        setBreathingPhase('pause');
        
        // Play voice guidance for pause if the pause time is long enough
        if (selectedPattern.pauseTime > 0.5) {
          speakGuidance('pause');
        }
      } else if (phase === 'pause' && currentProgress >= selectedPattern.pauseTime) {
        phase = 'inhale';
        currentProgress = 0;
        setBreathingPhase('inhale');
        setCompleted(prev => prev + 1);
        
        // Play voice guidance for inhale
        speakGuidance('inhale');
      }
      
      // Calculate overall cycle progress (0-100)
      let phaseProgress = 0;
      
      if (phase === 'inhale') {
        cycleTime = currentProgress;
        phaseProgress = (currentProgress / selectedPattern.inhaleTime) * 100;
      } else if (phase === 'hold') {
        cycleTime = selectedPattern.inhaleTime + currentProgress;
        phaseProgress = (currentProgress / selectedPattern.holdTime) * 100;
      } else if (phase === 'exhale') {
        cycleTime = selectedPattern.inhaleTime + selectedPattern.holdTime + currentProgress;
        phaseProgress = (currentProgress / selectedPattern.exhaleTime) * 100;
      } else if (phase === 'pause') {
        cycleTime = selectedPattern.inhaleTime + selectedPattern.holdTime + 
                   selectedPattern.exhaleTime + currentProgress;
        phaseProgress = (currentProgress / selectedPattern.pauseTime) * 100;
      }
      
      const overallProgress = (cycleTime / totalCycleTime) * 100;
      setProgress(overallProgress);
      
      currentProgress += 0.1;
    }, 100);
    
    // Create timer
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          stopBreathing();
          toast({
            title: "Session Complete",
            description: `You completed ${completed} breathing cycles. Great job!`,
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  const stopBreathing = () => {
    setIsBreathing(false);
    
    if (breathAnimationRef.current) {
      clearInterval(breathAnimationRef.current);
      breathAnimationRef.current = null;
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    // Stop any speaking
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };
  
  // Add voice guidance toggle
  const toggleVoiceGuidance = () => {
    setVoiceGuidance(prev => !prev);
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (breathAnimationRef.current) {
        clearInterval(breathAnimationRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
  
  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Animated background with breathing theme */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <AnimatedBackground />
        
        {/* Subtle pattern overlay */}
        <div className="breathing-background"></div>
        
        {/* Additional breathing-specific ambient animation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-[120vw] h-[120vw] rounded-full opacity-10 
            transition-all duration-1000 ease-in-out animate-pulse
            bg-gradient-to-r ${selectedPattern.color}
            ${breathingPhase === 'inhale' ? 'scale-100' : 
              breathingPhase === 'exhale' ? 'scale-90' : 'scale-95'}`}
            style={{ animationDuration: '15s' }}
          />
          
          {/* Ambient orbs - these are larger, slower moving elements */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div 
              key={`orb-${i}`}
              className="absolute rounded-full animate-float opacity-20"
              style={{
                width: `${Math.random() * 400 + 200}px`,
                height: `${Math.random() * 400 + 200}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: `radial-gradient(circle, ${
                  i % 2 === 0 
                    ? 'rgba(255,255,255,0.3)' 
                    : selectedPattern.id === 'box' ? 'rgba(96, 165, 250, 0.3)'
                    : selectedPattern.id === 'relaxed' ? 'rgba(168, 85, 247, 0.3)'
                    : selectedPattern.id === '478' ? 'rgba(99, 102, 241, 0.3)'
                    : selectedPattern.id === 'calm' ? 'rgba(45, 212, 191, 0.3)'
                    : 'rgba(251, 191, 36, 0.3)'
                } 0%, transparent 70%)`,
                animationDelay: `${Math.random() * 8}s`,
                animationDuration: `${Math.random() * 20 + 20}s`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
          
          {/* Ambient floating particles */}
          <div className="absolute w-full h-full">
            {Array.from({ length: 15 }).map((_, i) => (
              <div 
                key={i}
                className={`absolute rounded-full ${
                  isDarkMode ? 'bg-white/10' : 'bg-blue-500/10'
                } animate-float`}
                style={{
                  width: `${Math.random() * 20 + 10}px`,
                  height: `${Math.random() * 20 + 10}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${Math.random() * 10 + 10}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Header */}
      <Header />
      
      {/* Main content */}
      <main className="container mx-auto px-4 pt-6 pb-6">
        <div className="mx-auto max-w-4xl">
          <Card className={`backdrop-blur-md border shadow-lg ${isDarkMode ? 'bg-slate-800/90 text-white' : 'bg-white/90'}`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-2xl font-bold">Guided Breathing</h1>
                  <p className="text-sm opacity-70">Take a moment to breathe and find your center</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleTheme}
                  className="rounded-full h-10 w-10"
                >
                  {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
              </div>
              
              {/* Breathing animation circle */}
              <div className="flex flex-col items-center mb-8">
                <div 
                  className={`relative h-64 w-64 rounded-full flex items-center justify-center mb-4
                    ${isBreathing ? 'shadow-lg' : 'shadow-md'}
                    bg-gradient-to-r ${selectedPattern.color}
                    ${isBreathing ? 'breathing-circle' : ''}`}
                >
                  <div 
                    className={`absolute inset-0 rounded-full 
                      transition-all duration-300 ease-in-out
                      ${breathingPhase === 'inhale' ? 'scale-110 opacity-40' : 
                        breathingPhase === 'exhale' ? 'scale-90 opacity-60' : 'scale-100 opacity-50'}
                      ${breathingPhase === 'hold' || breathingPhase === 'pause' ? 'wave-effect' : ''}`}
                    style={{
                      background: `radial-gradient(circle, transparent 30%, rgba(255,255,255,0.4) 100%)`,
                    }}
                  />
                  
                  {/* Floating particles that appear during breathing */}
                  {isBreathing && (
                    <>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div 
                          key={`particle-${i}`}
                          className="particle"
                          style={{
                            width: `${Math.random() * 10 + 5}px`,
                            height: `${Math.random() * 10 + 5}px`,
                            left: `${Math.random() * 100}%`,
                            bottom: '0',
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${Math.random() * 5 + 10}s`,
                          }}
                        />
                      ))}
                    </>
                  )}
                  
                  <div 
                    className={`h-48 w-48 rounded-full flex items-center justify-center 
                      bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-20
                      transition-all duration-300 ease-in-out
                      ${breathingPhase === 'inhale' ? 'scale-125' : 
                        breathingPhase === 'exhale' ? 'scale-75' : 'scale-100'}`}
                  >
                    <p className="text-xl font-light text-white">
                      {isBreathing ? (
                        breathingPhase === 'inhale' ? 'Inhale' : 
                        breathingPhase === 'hold' ? 'Hold' : 
                        breathingPhase === 'exhale' ? 'Exhale' : 'Pause'
                      ) : 'Ready'}
                    </p>
                  </div>
                </div>
                
                {/* Time remaining and cycles */}
                <div className="flex gap-4">
                  <Badge variant="outline" className={`text-sm py-1 px-3 flex items-center gap-1 ${isDarkMode ? "text-white border-slate-500" : ""}`}>
                    <Timer className="h-3.5 w-3.5" />
                    {formatTime(timeRemaining)}
                  </Badge>
                  
                  <Badge variant="outline" className={`text-sm py-1 px-3 flex items-center gap-1 ${isDarkMode ? "text-white border-slate-500" : ""}`}>
                    <Wind className="h-3.5 w-3.5" />
                    {completed} cycles
                  </Badge>
                </div>
              </div>
              
              {/* Controls */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="font-medium">Breathing Pattern</h3>
                  <Select 
                    value={selectedPattern.id} 
                    onValueChange={handlePatternChange}
                    disabled={isBreathing}
                  >
                    <SelectTrigger className={isDarkMode ? "bg-slate-700 border-slate-600 text-white" : ""}>
                      <SelectValue placeholder="Select a breathing pattern" />
                    </SelectTrigger>
                    <SelectContent>
                      {breathingPatterns.map(pattern => (
                        <SelectItem key={pattern.id} value={pattern.id}>
                          {pattern.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="text-sm opacity-70 mt-2">
                    <p>{selectedPattern.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant={isDarkMode ? "outline" : "secondary"} className={isDarkMode ? "text-white border-slate-500" : ""}>In: {selectedPattern.inhaleTime}s</Badge>
                      <Badge variant={isDarkMode ? "outline" : "secondary"} className={isDarkMode ? "text-white border-slate-500" : ""}>Hold: {selectedPattern.holdTime}s</Badge>
                      <Badge variant={isDarkMode ? "outline" : "secondary"} className={isDarkMode ? "text-white border-slate-500" : ""}>Out: {selectedPattern.exhaleTime}s</Badge>
                      <Badge variant={isDarkMode ? "outline" : "secondary"} className={isDarkMode ? "text-white border-slate-500" : ""}>Pause: {selectedPattern.pauseTime}s</Badge>
                    </div>
                  </div>
                  
                  <h3 className="font-medium mt-4">Session Duration</h3>
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setDuration(Math.max(1, duration - 1))}
                      disabled={isBreathing}
                      className={isDarkMode ? "border-slate-600 text-white hover:bg-slate-700" : ""}
                    >
                      -
                    </Button>
                    <span className="text-center flex-1">{duration} minute{duration !== 1 ? 's' : ''}</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setDuration(Math.min(30, duration + 1))}
                      disabled={isBreathing}
                      className={isDarkMode ? "border-slate-600 text-white hover:bg-slate-700" : ""}
                    >
                      +
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium">Ambient Sound</h3>
                  <Select 
                    value={selectedSound.id} 
                    onValueChange={handleSoundChange}
                  >
                    <SelectTrigger className={isDarkMode ? "bg-slate-700 border-slate-600 text-white" : ""}>
                      <SelectValue placeholder="Select ambient sound" />
                    </SelectTrigger>
                    <SelectContent>
                      {sounds.map(sound => (
                        <SelectItem key={sound.id} value={sound.id}>
                          {sound.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center gap-4 mt-2">
                    <Volume2 className="h-4 w-4 flex-shrink-0" />
                    <Slider
                      value={[volume]}
                      onValueChange={(value) => setVolume(value[0])}
                      min={0}
                      max={100}
                      step={1}
                      disabled={selectedSound.id === 'none'}
                    />
                    <span className="text-sm w-8">{volume}%</span>
                  </div>
                  
                  {/* Voice guidance toggle */}
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <h3 className="font-medium">Voice Guidance</h3>
                      <p className={`text-xs ${isDarkMode ? "text-gray-300" : "text-gray-500"}`}>Verbal cues for each breathing phase</p>
                    </div>
                    <Switch 
                      checked={voiceGuidance} 
                      onCheckedChange={toggleVoiceGuidance}
                    />
                  </div>
                </div>
              </div>
              
              {/* Start/Stop button */}
              <div className="flex justify-center mt-8">
                <Button 
                  className={`rounded-full h-16 w-16 p-0 ${
                    isBreathing ? 'bg-red-500 hover:bg-red-600' : 
                    'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                  }`}
                  onClick={isBreathing ? stopBreathing : startBreathing}
                >
                  {isBreathing ? (
                    <Pause className="h-8 w-8 text-white" />
                  ) : (
                    <Play className="h-8 w-8 text-white" />
                  )}
                </Button>
              </div>
              
              {/* Guided instructions */}
              <div className={`mt-8 p-4 rounded-lg ${isDarkMode ? "bg-slate-700/50 text-white" : "bg-opacity-10 bg-slate-500"}`}>
                <h3 className="font-medium mb-2">How to Practice</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Find a comfortable seated position with your back straight</li>
                  <li>Place your feet flat on the floor and rest your hands on your lap</li>
                  <li>Focus on the animated circle, expanding as you inhale and contracting as you exhale</li>
                  <li>Breathe deeply through your nose, filling your lungs completely</li>
                  <li>When exhaling, release tension and let your body relax</li>
                  <li>If your mind wanders, gently bring your attention back to your breath</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Breathing; 