import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web';

interface RoboCharacterProps {
  width?: number;
  height?: number;
  className?: string;
}

const RoboCharacter: React.FC<RoboCharacterProps> = ({ 
  width = 300, 
  height = 300,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animation: any;
    
    const loadAnimation = async () => {
      try {
        // Fetch the animation data from the rovo.json file
        const response = await fetch('/robo/rovo.json');
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
        }
      } catch (error) {
        console.error('Failed to load robot animation:', error);
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

  return (
    <div 
      ref={containerRef} 
      style={{ width, height }}
      className={className}
      aria-label="Animated robot character"
    />
  );
};

export default RoboCharacter; 