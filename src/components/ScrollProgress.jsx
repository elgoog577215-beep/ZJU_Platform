import React from 'react';
import { motion, useScroll } from 'framer-motion';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useReducedMotion } from '../utils/animations';
import { useSettings } from '../context/SettingsContext';

const ScrollProgress = () => {
  const prefersReducedMotion = useReducedMotion();
  const showOnDesktop = useMediaQuery('(min-width: 768px) and (hover: hover) and (pointer: fine)');
  const { scrollYProgress } = useScroll();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';

  if (prefersReducedMotion || !showOnDesktop) {
    return null;
  }

  return (
    <motion.div
      className={`fixed top-0 left-0 right-0 origin-left z-[100] ${
        isDayMode
          ? 'h-[2px] bg-gradient-to-r from-sky-300/70 via-indigo-300/70 to-rose-300/70 shadow-[0_0_14px_rgba(129,140,248,0.24)]'
          : 'h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
      }`}
      style={{ scaleX: scrollYProgress }}
    />
  );
};

export default ScrollProgress;
