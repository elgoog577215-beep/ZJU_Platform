import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera } from 'lucide-react';

const Shutter = ({ onExit }) => {
  const [targets, setTargets] = useState([]);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const id = Date.now();
      const x = Math.random() * 80 + 10; // 10-90%
      const y = Math.random() * 80 + 10;
      setTargets(prev => [...prev, { id, x, y }]);
      
      // Remove target after 2 seconds
      setTimeout(() => {
        setTargets(prev => prev.filter(t => t.id !== id));
      }, 2000);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleShoot = (id) => {
    setScore(s => s + 100);
    setTargets(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="relative w-full h-full bg-neutral-900 cursor-crosshair overflow-hidden">
      <div className="absolute top-4 left-4 text-white text-2xl font-serif font-bold z-10">Shots: {score}</div>
      <button onClick={onExit} className="absolute top-4 right-4 text-white z-10 bg-white/10 px-4 py-2 rounded">Finish Roll</button>

      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10">
        <Camera size={400} />
      </div>

      <AnimatePresence>
        {targets.map(target => (
          <motion.button
            key={target.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="absolute w-16 h-16 border-2 border-white rounded-full flex items-center justify-center hover:bg-white/20"
            style={{ left: `${target.x}%`, top: `${target.y}%` }}
            onClick={() => handleShoot(target.id)}
          >
            <div className="w-2 h-2 bg-red-500 rounded-full" />
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Shutter;
