import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const Runner = ({ onExit }) => {
  const [score, setScore] = useState(0);
  const [isJumping, setIsJumping] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        if (!isJumping) {
          setIsJumping(true);
          setTimeout(() => setIsJumping(false), 500);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isJumping]);

  useEffect(() => {
    const timer = setInterval(() => setScore(s => s + 1), 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden border-t-4 border-b-4 border-purple-500">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?w=1600&q=80')] bg-cover opacity-20" />
      
      <div className="absolute top-4 left-4 text-purple-400 text-2xl font-mono font-bold z-10">DISTANCE: {score}m</div>
      <button onClick={onExit} className="absolute top-4 right-4 text-purple-400 border border-purple-400 px-4 py-2 rounded hover:bg-purple-400 hover:text-black transition-colors z-10">ABORT</button>

      {/* Player */}
      <motion.div 
        animate={{ y: isJumping ? -150 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        className="absolute bottom-10 left-20 w-12 h-12 bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.8)]"
      />

      {/* Obstacle */}
      <motion.div 
        animate={{ x: [1000, -100] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        className="absolute bottom-10 w-10 h-20 bg-pink-600 shadow-[0_0_20px_rgba(219,39,119,0.8)]"
      />
      
      <div className="absolute bottom-0 w-full h-10 bg-gradient-to-r from-purple-900 to-blue-900" />
    </div>
  );
};

export default Runner;
