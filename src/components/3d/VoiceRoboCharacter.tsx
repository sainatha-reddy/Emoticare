import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web';

interface VoiceRoboCharacterProps {
  width?: number;
  height?: number;
  className?: string;
  isListening?: boolean;
  isSpeaking?: boolean;
  isProcessing?: boolean;
}

const VoiceRoboCharacter: React.FC<VoiceRoboCharacterProps> = ({ 
  width = 300, 
  height = 300,
  className = '',
  isListening = false,
  isSpeaking = false,
  isProcessing = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<any>(null);

  useEffect(() => {
    let animation: any;
    
    const loadAnimation = async () => {
      try {
        // Fetch the animation data from the voicerobo.json file
        const response = await fetch('/robo/voicerobo.json');
        const animationData = await response.json();

        if (containerRef.current) {
          // Initialize lottie animation
          animation = lottie.loadAnimation({
            container: containerRef.current,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            animationData
          });
          
          animationRef.current = animation;
        }
      } catch (error) {
        console.error('Failed to load voice robot animation:', error);
      }
    };

    loadAnimation();

    // Cleanup function
    return () => {
      if (animation) {
        animation.destroy();
      }
    };
  }, []);

  // Update animation based on state
  useEffect(() => {
    if (!animationRef.current) return;
    
    // You might need to adjust these segments based on your specific animation
    if (isListening) {
      animationRef.current.playSegments([0, 30], true);
    } else if (isSpeaking) {
      animationRef.current.playSegments([31, 60], true);
    } else if (isProcessing) {
      animationRef.current.playSegments([61, 90], true);
    } else {
      // Idle animation
      animationRef.current.playSegments([91, 120], true);
    }
  }, [isListening, isSpeaking, isProcessing]);

  return (
    <div 
      ref={containerRef} 
      style={{ width, height }}
      className={className}
      aria-label="Animated voice robot character"
    />
  );
};

export default VoiceRoboCharacter; 