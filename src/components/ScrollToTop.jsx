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
                className="fixed bottom-24 right-6 z-40"
            >
            <button
                onClick={scrollToTop}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-lg transition-colors border border-white/20 backdrop-blur-md"
                title="Scroll to Top"
            >
                <ArrowUp size={24} />
            </button>
            </motion.div>
        )}
    </AnimatePresence>
  );
};

export default ScrollToTop;
