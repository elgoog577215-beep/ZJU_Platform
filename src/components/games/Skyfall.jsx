import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const Skyfall = ({ onExit }) => {
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const playerRef = useRef(null);
  const [playerPos, setPlayerPos] = useState(50); // Percentage

  useEffect(() => {
    if (gameOver) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') setPlayerPos(p => Math.max(0, p - 5));
      if (e.key === 'ArrowRight') setPlayerPos(p => Math.min(100, p + 5));
    };
    
    window.addEventListener('keydown', handleKeyDown);
    const interval = setInterval(() => setScore(s => s + 1), 100);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(interval);
    };
  }, [gameOver]);

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-sky-900 to-blue-500 overflow-hidden">
      <div className="absolute top-4 left-4 text-white text-2xl font-bold z-10">Score: {score}</div>
      <button onClick={onExit} className="absolute top-4 right-4 text-white z-10 bg-black/30 px-4 py-2 rounded">Exit</button>
      
      {/* Player */}
      <motion.div 
        animate={{ x: `${playerPos}%` }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="absolute bottom-20 left-0 w-12 h-12 bg-white rounded-full shadow-lg"
        style={{ left: 0 }} // Reset default
      />
      
      {/* Clouds (Decorative) */}
      <motion.div 
        animate={{ y: [0, 1000] }}
        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        className="absolute top-[-100px] left-20 text-6xl opacity-50"
      >☁️</motion.div>
       <motion.div 
        animate={{ y: [0, 1000] }}
        transition={{ repeat: Infinity, duration: 3, ease: "linear", delay: 1 }}
        className="absolute top-[-100px] right-20 text-6xl opacity-50"
      >☁️</motion.div>

      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white flex-col">
          <h2 className="text-4xl font-bold mb-4">Game Over</h2>
          <button onClick={() => { setScore(0); setGameOver(false); }} className="bg-white text-black px-6 py-3 rounded font-bold">Retry</button>
        </div>
      )}
    </div>
  );
};

export default Skyfall;
