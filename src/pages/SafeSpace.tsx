import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import Header from "@/components/Header";
import AnimatedBackground from "@/components/AnimatedBackground";
import {
  Music,
  Video,
  VolumeX,
  Volume2,
  Pause,
  Play,
  Expand,
  Minimize,
  ArrowLeft,
  Home,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import "./SafeSpace.css"; // We'll create this CSS file next

interface SceneryOption {
  id: string;
  name: string;
  description: string;
  videoSrc: string;
  thumbnailSrc: string;
}

interface SoundOption {
  name: string;
  file: string;
  icon: React.ReactNode;
}

const SafeSpace = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentScenery, setCurrentScenery] = useState<SceneryOption | null>(null);
  const [currentSound, setCurrentSound] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(30);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const navigate = useNavigate();

  // Scenery options - in a real app, these would likely come from a database
  const sceneryOptions: SceneryOption[] = [
    {
      id: "forest",
      name: "Forest Canopy",
      description: "Gentle sunlight filtering through a lush green forest canopy",
      videoSrc: "/videos/forest.mp4",
      thumbnailSrc: "/videos/thumbnails/forest.jpg"
    },
    {
      id: "beach",
      name: "Ocean Waves",
      description: "Calming waves rolling onto a peaceful beach at sunset",
      videoSrc: "/videos/ocean.mp4",
      thumbnailSrc: "/videos/thumbnails/beach.jpg"
    },
    {
      id: "rain",
      name: "Rain on Window",
      description: "Gentle raindrops falling on a window with a cozy atmosphere",
      videoSrc: "/videos/rain1.mp4",
      thumbnailSrc: "/videos/thumbnails/rain.jpg"
    },
    {
      id: "fireplace",
      name: "Cozy Fireplace",
      description: "Warm, crackling fireplace creating a sense of comfort and security",
      videoSrc: "/videos/fireplace.mp4",
      thumbnailSrc: "/videos/thumbnails/fireplace.jpg"
    },
    {
      id: "space",
      name: "Cosmic Journey",
      description: "Floating through the cosmos with gentle nebula clouds and distant stars",
      videoSrc: "/videos/space.mp4",
      thumbnailSrc: "/videos/thumbnails/space.jpg"
    }
  ];

  // Sound options
  const soundOptions: SoundOption[] = [
    { name: "Forest", file: "/sounds/forest.mp3", icon: "🌳" },
    { name: "Rain", file: "/sounds/rain.mp3", icon: "🌧️" },
    { name: "Waves", file: "/sounds/waves.mp3", icon: "🌊" },
    { name: "White Noise", file: "/sounds/white-noise.mp3", icon: "📻" }
  ];

  // Handle toggling fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        toast({
          title: "Fullscreen Error",
          description: `Error attempting to enable fullscreen: ${err.message}`,
          variant: "destructive",
        });
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Handle playing scenery video
  const playScenery = (scenery: SceneryOption) => {
    setCurrentScenery(scenery);
    
    if (videoRef.current) {
      videoRef.current.src = scenery.videoSrc;
      videoRef.current.load();
      videoRef.current.play().catch(error => {
        console.error("Error playing video:", error);
        toast({
          title: "Playback Error",
          description: "Could not play the selected scenery. Please try again.",
          variant: "destructive",
        });
      });
    }
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
      audioRef.current.volume = volume / 100;
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

  // Handle volume change
  const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0];
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol / 100;
    }
  };

  // Toggle controls visibility in fullscreen mode
  const toggleControls = () => {
    setShowControls(prev => !prev);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`relative min-h-screen ${isFullscreen ? 'fullscreen-safe-space' : ''}`}
      onClick={isFullscreen && !showControls ? toggleControls : undefined}
    >
      {/* Video Background */}
      {currentScenery ? (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src={currentScenery.videoSrc} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="absolute inset-0 z-0">
          <AnimatedBackground />
        </div>
      )}

      {/* Audio Element */}
      <audio ref={audioRef} className="hidden" />

      {/* Header - only shown when not in fullscreen or when controls are visible */}
      {(!isFullscreen || (isFullscreen && showControls)) && (
        <div className={`relative z-10 ${isFullscreen ? 'fullscreen-header' : ''}`}>
          {!isFullscreen ? (
            <Header />
          ) : (
            <div className="flex justify-between items-center p-4 bg-black/50 backdrop-blur-md">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => document.exitFullscreen()}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={toggleFullscreen}
                >
                  <Minimize className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className={`container mx-auto px-4 py-8 relative z-10 ${isFullscreen && !showControls ? 'hidden' : ''}`}>
        {!currentScenery ? (
          // Selection View
          <div className="max-w-4xl mx-auto">
            <Card className="backdrop-blur-md bg-white/80 border shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">
                  Create Your Safe Space
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Choose a Scenery</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sceneryOptions.map((scenery) => (
                        <Card 
                          key={scenery.id}
                          className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                          onClick={() => playScenery(scenery)}
                        >
                          <div className="aspect-video bg-gray-100 relative">
                            <img 
                              src={scenery.thumbnailSrc} 
                              alt={scenery.name}
                              className="absolute inset-0 w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback to icon if image fails to load
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.querySelector('.fallback')?.classList.remove('hidden');
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center fallback hidden">
                              <Video className="h-8 w-8 text-gray-400" />
                            </div>
                          </div>
                          <CardContent className="p-3">
                            <h4 className="font-medium">{scenery.name}</h4>
                            <p className="text-sm text-gray-500 mt-1">{scenery.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Control Overlay in Playback Mode
          <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 z-20 transition-all duration-300 ${isFullscreen ? 'fullscreen-controls' : ''}`}>
            <Card className="backdrop-blur-md bg-black/40 border border-white/20 shadow-lg text-white">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Sound Controls */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="relative bg-black/30 border-white/20 text-white hover:bg-white/20"
                      >
                        <Music className="h-5 w-5" />
                        {isPlaying && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3 bg-black/70 border-white/20 text-white">
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm border-b border-white/20 pb-2">Ambient Sounds</h4>
                        <div className="space-y-2">
                          {soundOptions.map(sound => (
                            <Button 
                              key={sound.file}
                              variant={currentSound === sound.file ? "default" : "ghost"}
                              className={`justify-start w-full ${currentSound === sound.file ? 'bg-white/20' : 'hover:bg-white/10 text-white'}`}
                              onClick={() => playSound(sound.file)}
                            >
                              <span className="mr-2">{sound.icon}</span>
                              {sound.name}
                              {currentSound === sound.file && isPlaying && (
                                <span className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                              )}
                            </Button>
                          ))}
                        </div>
                        <div className="pt-2 border-t border-white/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Button 
                              variant="outline" 
                              size="icon"
                              className="bg-black/30 border-white/20 text-white hover:bg-white/20 h-8 w-8"
                              onClick={toggleSound}
                              disabled={!currentSound}
                            >
                              {isPlaying ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <div className="flex-1">
                              <Slider
                                value={[volume]}
                                min={0}
                                max={100}
                                step={1}
                                onValueChange={handleVolumeChange}
                                className="flex-1"
                              />
                            </div>
                            <div className="w-8 text-center text-xs">
                              {volume}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Scenery Selector */}
                  <Select 
                    value={currentScenery.id} 
                    onValueChange={(value) => {
                      const selected = sceneryOptions.find(s => s.id === value);
                      if (selected) playScenery(selected);
                    }}
                  >
                    <SelectTrigger className="w-[180px] bg-black/30 border-white/20 text-white">
                      <SelectValue placeholder="Select scenery" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/70 border-white/20 text-white">
                      {sceneryOptions.map((scenery) => (
                        <SelectItem key={scenery.id} value={scenery.id}>
                          {scenery.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Fullscreen Toggle */}
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={toggleFullscreen}
                    className="bg-black/30 border-white/20 text-white hover:bg-white/20"
                  >
                    {isFullscreen ? <Minimize className="h-5 w-5" /> : <Expand className="h-5 w-5" />}
                  </Button>

                  {/* Home Button */}
                  {!isFullscreen && (
                    <Button variant="outline" asChild className="bg-black/30 border-white/20 text-white hover:bg-white/20">
                      <Link to="/">
                        <Home className="h-5 w-5 mr-2" />
                        Exit Safe Space
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default SafeSpace; 