import React from 'react';
import { motion, useScroll } from 'framer-motion';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useReducedMotion } from '../utils/animations';

const ScrollProgress = () => {
  const prefersReducedMotion = useReducedMotion();
  const showOnDesktop = useMediaQuery('(min-width: 768px) and (hover: hover) and (pointer: fine)');
  const { scrollYProgress } = useScroll();

  if (prefersReducedMotion || !showOnDesktop) {
    return null;
  }

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 origin-left z-[100]"
      style={{ scaleX: scrollYProgress }}
    />
  );
};

export default ScrollProgress;
