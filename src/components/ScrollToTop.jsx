import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
        {isVisible && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="fixed bottom-40 right-6 z-40 md:bottom-12 md:right-8"
            >
            <button
                onClick={scrollToTop}
                className="group relative bg-indigo-600/90 hover:bg-indigo-500 text-white p-3 rounded-full shadow-[0_8px_30px_rgba(79,70,229,0.3)] transition-all border border-white/20 backdrop-blur-md hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(79,70,229,0.4)]"
                title="Scroll to Top"
            >
                <div className="absolute inset-0 rounded-full border border-white/20 group-hover:scale-110 transition-transform duration-500" />
                <ArrowUp size={24} className="group-hover:-translate-y-0.5 transition-transform" />
            </button>
            </motion.div>
        )}
    </AnimatePresence>
  );
};

export default ScrollToTop;
