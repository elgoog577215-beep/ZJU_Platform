import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

const INTERACTIVE_SELECTOR = 'a, button, input, textarea, select, summary, [role="button"], [data-cursor-hover], .cursor-pointer';

const CustomCursor = () => {
  // Use MotionValues to track mouse position without triggering re-renders
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Smooth springs for the cursor movement
  // Main dot follows closely
  const dotSpringConfig = { damping: 25, stiffness: 700 };
  const dotX = useSpring(mouseX, dotSpringConfig);
  const dotY = useSpring(mouseY, dotSpringConfig);

  // Ring follows with a bit more delay/smoothness
  const ringSpringConfig = { damping: 20, stiffness: 300 };
  const ringX = useSpring(mouseX, ringSpringConfig);
  const ringY = useSpring(mouseY, ringSpringConfig);

  const [isHovering, setIsHovering] = useState(false);
  const lastHoveringRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!mediaQuery.matches) {
      return undefined;
    }

    let frameId = null;
    let pointerX = -100;
    let pointerY = -100;

    const flushPointer = () => {
      mouseX.set(pointerX);
      mouseY.set(pointerY);
      frameId = null;
    };

    const queuePointerPosition = (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;

      if (frameId == null) {
        frameId = window.requestAnimationFrame(flushPointer);
      }
    };

    const updateHoverState = (target) => {
      const element = target instanceof Element ? target : null;
      const nextHovering = Boolean(element?.closest(INTERACTIVE_SELECTOR));
      if (lastHoveringRef.current !== nextHovering) {
        lastHoveringRef.current = nextHovering;
        setIsHovering(nextHovering);
      }
    };

    const handlePointerMove = (event) => {
      queuePointerPosition(event);
      updateHoverState(event.target);
    };

    const handlePointerOver = (event) => updateHoverState(event.target);
    const handlePointerOut = (event) => updateHoverState(event.relatedTarget);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        mouseX.set(-100);
        mouseY.set(-100);
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerover', handlePointerOver, { passive: true });
    document.addEventListener('pointerout', handlePointerOut, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Hide default cursor
    document.body.style.cursor = 'none';

    return () => {
      if (frameId != null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerover', handlePointerOver);
      document.removeEventListener('pointerout', handlePointerOut);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Restore default cursor
      document.body.style.cursor = 'auto';
    };
  }, [mouseX, mouseY]);

  return (
    <>
      {/* Main Cursor Dot */}
      <motion.div
        className="fixed top-0 left-0 w-3 h-3 bg-white rounded-full pointer-events-none z-[9999] mix-blend-difference"
        style={{
          x: dotX,
          y: dotY,
          translateX: '-50%', // Center the dot
          translateY: '-50%'
        }}
        animate={{
          scale: isHovering ? 0 : 1, // Disappear on hover to let the ring take over or content show
          opacity: isHovering ? 0 : 1
        }}
        transition={{
          scale: { duration: 0.2 },
          opacity: { duration: 0.2 }
        }}
      />
      
      {/* Trailing Ring / Hover Highlight */}
      <motion.div
        className="fixed top-0 left-0 w-8 h-8 border border-white rounded-full pointer-events-none z-[9998] mix-blend-difference"
        style={{
          x: ringX,
          y: ringY,
          translateX: '-50%', // Center the ring
          translateY: '-50%'
        }}
        animate={{
          scale: isHovering ? 2.5 : 1,
          backgroundColor: isHovering ? "rgba(255, 255, 255, 1)" : "rgba(255, 255, 255, 0)",
          borderWidth: isHovering ? "0px" : "1px",
          mixBlendMode: "difference"
        }}
        transition={{
          scale: { type: "spring", stiffness: 300, damping: 20 },
          backgroundColor: { duration: 0.2 },
          borderWidth: { duration: 0.2 }
        }}
      />
    </>
  );
};

export default CustomCursor;
