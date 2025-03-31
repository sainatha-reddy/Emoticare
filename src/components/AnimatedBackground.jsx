import React, { useEffect, useRef } from 'react';

const AnimatedBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    // Set canvas to full window size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // Create shapes for animation
    const shapes = [];
    
    // Different shapes related to mental wellness and support
    const shapeTypes = ['heart', 'circle', 'star', 'wave'];
    const colors = ['#d4a3ff', '#a39dff', '#9fd4ff', '#94ddff', '#ffd6e0'];
    
    // Create 40-50 random shapes (increased from 20-25)
    const shapeCount = Math.floor(Math.random() * 10) + 40; // 40-50 shapes
    
    for (let i = 0; i < shapeCount; i++) {
      const type = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 20 + 10; // 10-30px (increased from 5-20px)
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const speedX = (Math.random() - 0.5) * 0.5; // Slow horizontal movement
      const speedY = (Math.random() - 0.5) * 0.5; // Slow vertical movement
      const opacity = Math.random() * 0.4 + 0.3; // 0.3-0.7 opacity (increased from 0.2-0.7)
      const rotation = Math.random() * Math.PI * 2;
      const rotationSpeed = (Math.random() - 0.5) * 0.02;
      
      shapes.push({
        type,
        color,
        size,
        x,
        y,
        speedX,
        speedY,
        opacity,
        rotation,
        rotationSpeed,
        pulse: 0,
        pulseSpeed: Math.random() * 0.03 + 0.01
      });
    }
    
    // Draw heart shape
    const drawHeart = (ctx, x, y, size, rotation) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.beginPath();
      ctx.moveTo(0, -size/2);
      ctx.bezierCurveTo(
        size/2, -size, 
        size, -size/4, 
        0, size/2
      );
      ctx.bezierCurveTo(
        -size, -size/4, 
        -size/2, -size, 
        0, -size/2
      );
      ctx.closePath();
      ctx.restore();
    };
    
    // Draw star shape
    const drawStar = (ctx, x, y, size, rotation) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.beginPath();
      
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const x1 = Math.cos(angle) * size;
        const y1 = Math.sin(angle) * size;
        
        if (i === 0) {
          ctx.moveTo(x1, y1);
        } else {
          ctx.lineTo(x1, y1);
        }
        
        const angle2 = angle + Math.PI / 5;
        const x2 = Math.cos(angle2) * (size / 2);
        const y2 = Math.sin(angle2) * (size / 2);
        
        ctx.lineTo(x2, y2);
      }
      
      ctx.closePath();
      ctx.restore();
    };
    
    // Draw wave shape
    const drawWave = (ctx, x, y, size, rotation) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.beginPath();
      
      for (let i = 0; i < size*2; i++) {
        const angle = (i / size) * Math.PI;
        const yOffset = Math.sin(angle) * (size/3);
        ctx.lineTo(i - size, yOffset);
      }
      
      ctx.restore();
    };
    
    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      shapes.forEach(shape => {
        // Update position
        shape.x += shape.speedX;
        shape.y += shape.speedY;
        
        // Bounce off edges with padding
        if (shape.x < -50 || shape.x > canvas.width + 50) shape.speedX *= -1;
        if (shape.y < -50 || shape.y > canvas.height + 50) shape.speedY *= -1;
        
        // Update rotation
        shape.rotation += shape.rotationSpeed;
        
        // Update pulse
        shape.pulse += shape.pulseSpeed;
        const pulseFactor = 1 + Math.sin(shape.pulse) * 0.2;
        
        // Draw shape
        ctx.globalAlpha = shape.opacity;
        ctx.fillStyle = shape.color;
        
        switch (shape.type) {
          case 'heart':
            drawHeart(ctx, shape.x, shape.y, shape.size * pulseFactor, shape.rotation);
            ctx.fill();
            break;
          case 'circle':
            ctx.beginPath();
            ctx.arc(shape.x, shape.y, shape.size * pulseFactor, 0, Math.PI * 2);
            ctx.fill();
            break;
          case 'star':
            drawStar(ctx, shape.x, shape.y, shape.size * pulseFactor, shape.rotation);
            ctx.fill();
            break;
          case 'wave':
            drawWave(ctx, shape.x, shape.y, shape.size * pulseFactor, shape.rotation);
            ctx.lineWidth = 2;
            ctx.strokeStyle = shape.color;
            ctx.stroke();
            break;
          default:
            break;
        }
      });
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none"
      style={{ opacity: 0.7 }} // Increased overall opacity
    />
  );
};

export default AnimatedBackground; 