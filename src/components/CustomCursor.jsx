import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const CustomCursor = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const updateMousePosition = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => setIsHovering(false);

    window.addEventListener('mousemove', updateMousePosition);

    // Add event listeners to all interactive elements
    const interactiveElements = document.querySelectorAll('a, button, input, textarea, .cursor-pointer');
    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);
    });

    // MutationObserver to handle dynamic content
    const observer = new MutationObserver(() => {
        const newElements = document.querySelectorAll('a, button, input, textarea, .cursor-pointer');
        newElements.forEach(el => {
            el.removeEventListener('mouseenter', handleMouseEnter); // clean up duplicates
            el.removeEventListener('mouseleave', handleMouseLeave);
            
            el.addEventListener('mouseenter', handleMouseEnter);
            el.addEventListener('mouseleave', handleMouseLeave);
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });

    // Hide default cursor
    document.body.style.cursor = 'none';

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
      interactiveElements.forEach(el => {
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
      });
      observer.disconnect();
      // Restore default cursor
      document.body.style.cursor = 'auto';
    };
  }, []);

  return (
    <>
      {/* Main Cursor Dot */}
      <motion.div
        className="fixed top-0 left-0 w-3 h-3 bg-white rounded-full pointer-events-none z-[9999] mix-blend-difference"
        animate={{
          x: mousePosition.x - 6,
          y: mousePosition.y - 6,
          scale: isHovering ? 0 : 1, // Disappear on hover to let the ring take over or content show
          opacity: isHovering ? 0 : 1
        }}
        transition={{
          type: "spring",
          stiffness: 1000,
          damping: 50,
          mass: 0.1
        }}
      />
      
      {/* Trailing Ring / Hover Highlight */}
      <motion.div
        className="fixed top-0 left-0 w-8 h-8 border border-white rounded-full pointer-events-none z-[9998] mix-blend-difference"
        animate={{
          x: mousePosition.x - 16,
          y: mousePosition.y - 16,
          scale: isHovering ? 2.5 : 1,
          backgroundColor: isHovering ? "rgba(255, 255, 255, 1)" : "rgba(255, 255, 255, 0)",
          borderWidth: isHovering ? "0px" : "1px",
          mixBlendMode: "difference"
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 25,
          mass: 0.5
        }}
      />
    </>
  );
};

export default CustomCursor;