import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useReducedMotion } from '../utils/animations';

const ScrollToTop = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();
  const isAboutPage = location.pathname === '/about';
  const isDesktopViewport = useMediaQuery('(min-width: 768px)');
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isDesktopViewport) {
      setIsVisible(false);
      return undefined;
    }

    let frameId = 0;
    const toggleVisibility = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        setIsVisible(window.pageYOffset > 300);
      });
    };

    toggleVisibility();
    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, [isDesktopViewport]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  if (!isDesktopViewport) return null;

  return (
    <AnimatePresence>
        {isVisible && (
            <motion.div 
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.8 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
                className={`fixed bottom-[calc(var(--mobile-bottom-nav-height)+env(safe-area-inset-bottom)+0.75rem)] right-4 z-40 md:bottom-12 md:right-8 ${isAboutPage ? 'hidden md:block' : ''}`}
            >
            <button
                type="button"
                onClick={scrollToTop}
                aria-label={t('common.scroll_to_top', '返回顶部')}
                className="group relative bg-indigo-600/90 hover:bg-indigo-500 text-white p-3 rounded-full shadow-[0_8px_30px_rgba(79,70,229,0.3)] transition-all border border-white/20 backdrop-blur-md hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(79,70,229,0.4)] focus:outline-none focus:ring-2 focus:ring-indigo-300/80 focus:ring-offset-2 focus:ring-offset-black motion-reduce:hover:translate-y-0 motion-reduce:transition-none"
                title={t('common.scroll_to_top', '返回顶部')}
            >
                <div className="absolute inset-0 rounded-full border border-white/20 group-hover:scale-110 transition-transform duration-500 motion-reduce:transition-none motion-reduce:group-hover:scale-100" aria-hidden="true" />
                <ArrowUp size={24} className="group-hover:-translate-y-0.5 transition-transform motion-reduce:transition-none motion-reduce:group-hover:translate-y-0" aria-hidden="true" focusable="false" />
            </button>
            </motion.div>
        )}
    </AnimatePresence>
  );
};

export default ScrollToTop;
