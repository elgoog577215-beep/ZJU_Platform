/**
 * Motion system
 * Shared animation tokens and variants for fast, consistent UI motion.
 */

import { useEffect, useRef, useCallback, useState } from "react";

const EASE = {
  standard: [0.2, 0.8, 0.2, 1],
  emphasized: [0.16, 1, 0.3, 1],
  exit: [0.4, 0, 1, 1],
};

const DURATION = {
  micro: 0.12,
  fast: 0.18,
  base: 0.24,
  calm: 0.36,
  reveal: 0.52,
};

export const motionTokens = {
  duration: DURATION,
  ease: EASE,
  spring: {
    press: { type: "spring", stiffness: 520, damping: 34, mass: 0.7 },
    snappy: { type: "spring", stiffness: 430, damping: 32, mass: 0.75 },
    gentle: { type: "spring", stiffness: 180, damping: 22, mass: 0.9 },
    page: { type: "spring", stiffness: 260, damping: 30, mass: 0.85 },
    tab: { type: "spring", stiffness: 520, damping: 38, mass: 0.7 },
  },
  viewport: { once: true, margin: "0px 0px -12% 0px", amount: 0.18 },
};

export const routeTransition = {
  initial: { opacity: 0, y: 10, scale: 0.992 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: motionTokens.spring.page,
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.996,
    transition: { duration: DURATION.fast, ease: EASE.exit },
  },
};

export const navEntrance = {
  initial: { opacity: 0, y: -18 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.calm, ease: EASE.emphasized },
  },
};

export const tabbarEntrance = {
  initial: { opacity: 0, y: 18, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DURATION.calm, ease: EASE.emphasized },
  },
};

export const heroStagger = {
  animate: {
    transition: {
      delayChildren: 0.08,
      staggerChildren: 0.09,
    },
  },
};

export const heroReveal = {
  initial: { opacity: 0, y: 28 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.68, ease: EASE.emphasized },
  },
};

export const sectionReveal = {
  initial: { opacity: 0, y: 18, scale: 0.995 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DURATION.reveal, ease: EASE.emphasized },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: DURATION.fast, ease: EASE.exit },
  },
};

export const listContainer = {
  animate: {
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.04,
    },
  },
};

export const listItem = {
  initial: { opacity: 0, y: 14, scale: 0.99 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DURATION.calm, ease: EASE.emphasized },
  },
  exit: {
    opacity: 0,
    y: 6,
    scale: 0.99,
    transition: { duration: DURATION.fast, ease: EASE.exit },
  },
};

export const modalBackdrop = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: DURATION.base, ease: EASE.standard },
  },
  exit: {
    opacity: 0,
    transition: { duration: DURATION.fast, ease: EASE.exit },
  },
};

export const modalContent = {
  initial: { opacity: 0, y: 16, scale: 0.975 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: motionTokens.spring.snappy,
  },
  exit: {
    opacity: 0,
    y: 12,
    scale: 0.98,
    transition: { duration: DURATION.fast, ease: EASE.exit },
  },
};

export const mobileSheet = {
  initial: { opacity: 0, y: 30 },
  animate: {
    opacity: 1,
    y: 0,
    transition: motionTokens.spring.snappy,
  },
  exit: {
    opacity: 0,
    y: 22,
    transition: { duration: DURATION.fast, ease: EASE.exit },
  },
};

export const hoverLift = {
  y: -4,
  scale: 1.01,
  transition: { duration: DURATION.base, ease: EASE.standard },
};

export const hoverScale = {
  scale: 1.015,
  transition: { duration: DURATION.base, ease: EASE.standard },
};

export const hoverGlow = {
  boxShadow: "0 18px 42px rgba(99, 102, 241, 0.22)",
  transition: { duration: DURATION.calm, ease: EASE.standard },
};

export const tapPress = {
  scale: 0.965,
  transition: motionTokens.spring.press,
};

export const subtleTapPress = {
  scale: 0.985,
  transition: motionTokens.spring.press,
};

export const cardHover = {
  rest: {
    scale: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE.standard },
  },
  hover: {
    scale: 1.01,
    y: -4,
    transition: { duration: DURATION.base, ease: EASE.standard },
  },
};

export const fadeInUp = {
  initial: { opacity: 0, y: 18 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.reveal, ease: EASE.emphasized },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: DURATION.fast, ease: EASE.exit },
  },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: DURATION.base, ease: EASE.standard },
  },
  exit: {
    opacity: 0,
    transition: { duration: DURATION.fast, ease: EASE.exit },
  },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: motionTokens.spring.snappy,
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: DURATION.fast, ease: EASE.exit },
  },
};

export const slideIn = {
  initial: { opacity: 0, x: -18 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION.calm, ease: EASE.emphasized },
  },
  exit: {
    opacity: 0,
    x: 12,
    transition: { duration: DURATION.fast, ease: EASE.exit },
  },
};

export const staggerContainer = listContainer;
export const staggerItem = listItem;
export const pageTransition = routeTransition;
export const buttonTap = tapPress;
export const buttonHover = hoverScale;
export const scrollReveal = {
  initial: sectionReveal.initial,
  whileInView: sectionReveal.animate,
  viewport: motionTokens.viewport,
};
export const scrollRevealLeft = {
  initial: { opacity: 0, x: -18 },
  whileInView: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION.reveal, ease: EASE.emphasized },
  },
  viewport: motionTokens.viewport,
};
export const scrollRevealRight = {
  initial: { opacity: 0, x: 18 },
  whileInView: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION.reveal, ease: EASE.emphasized },
  },
  viewport: motionTokens.viewport,
};

export const pulseAnimation = {
  animate: {
    opacity: [0.55, 1, 0.55],
    transition: {
      duration: 1.6,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export const shimmerAnimation = {
  animate: {
    x: ["-100%", "100%"],
    transition: {
      duration: 1.35,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

export const spinAnimation = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

export const useInView = (options = {}) => {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIsInView(entry.isIntersecting);
    }, { threshold: 0.1, ...options });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [options]);

  return [ref, isInView];
};

export const useSmoothScroll = () => {
  const scrollTo = useCallback((elementId, offset = 0) => {
    const element = document.getElementById(elementId);
    if (element) {
      const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }, []);

  return scrollTo;
};

export const useParallax = (speed = 0.5) => {
  const ref = useRef(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let frameId = null;

    const handleScroll = () => {
      if (frameId != null) return;
      frameId = window.requestAnimationFrame(() => {
        setOffset(window.pageYOffset * speed);
        frameId = null;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (frameId != null) window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [speed]);

  return [ref, offset];
};

export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event) => setPrefersReducedMotion(event.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
};

export const useMotionPreference = () => {
  const prefersReducedMotion = useReducedMotion();
  const [isLowPowerDevice, setIsLowPowerDevice] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const cores = Number(navigator.hardwareConcurrency || 0);
    const memory = Number(navigator.deviceMemory || 0);
    setIsLowPowerDevice((cores > 0 && cores <= 4) || (memory > 0 && memory <= 4));
  }, []);

  return {
    prefersReducedMotion,
    isLowPowerDevice,
    shouldReduceMotion: prefersReducedMotion || isLowPowerDevice,
  };
};

export const getStaggerDelay = (index, baseDelay = 0.045) => index * baseDelay;

export const getRevealTransition = (index = 0, baseDelay = 0.045) => ({
  duration: DURATION.calm,
  ease: EASE.emphasized,
  delay: getStaggerDelay(index, baseDelay),
});

export const springConfig = {
  gentle: motionTokens.spring.gentle,
  bouncy: { type: "spring", stiffness: 300, damping: 18 },
  stiff: motionTokens.spring.press,
  smooth: motionTokens.spring.snappy,
};

export const easing = {
  easeOut: EASE.standard,
  easeIn: EASE.exit,
  easeInOut: [0.4, 0, 0.2, 1],
  emphasized: EASE.emphasized,
  spring: motionTokens.spring.snappy,
};

export const animationPresets = {
  subtle: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: DURATION.base, ease: EASE.standard },
  },
  dramatic: heroReveal,
  bouncy: scaleIn,
  slideUp: fadeInUp,
  fadeScale: scaleIn,
};

export default {
  motionTokens,
  routeTransition,
  navEntrance,
  tabbarEntrance,
  heroStagger,
  heroReveal,
  sectionReveal,
  listContainer,
  listItem,
  fadeInUp,
  fadeIn,
  scaleIn,
  slideIn,
  staggerContainer,
  staggerItem,
  hoverScale,
  hoverLift,
  hoverGlow,
  pageTransition,
  modalBackdrop,
  modalContent,
  mobileSheet,
  cardHover,
  buttonTap,
  buttonHover,
  tapPress,
  subtleTapPress,
  pulseAnimation,
  shimmerAnimation,
  spinAnimation,
  scrollReveal,
  scrollRevealLeft,
  scrollRevealRight,
  springConfig,
  easing,
  animationPresets,
  getStaggerDelay,
  getRevealTransition,
};
