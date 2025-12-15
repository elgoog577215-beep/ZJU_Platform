import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Skyfall3D from './games/Skyfall3D';
import Runner3D from './games/Runner3D';
import Shutter3D from './games/Shutter3D';
import Puzzle from './games/Puzzle';
import GameIntro from './GameIntro';

const GameOverlay = ({ photo, onClose }) => {
  const [showIntro, setShowIntro] = useState(true);
  const [gameActive, setGameActive] = useState(false);

  const handleStartGame = () => {
      setShowIntro(false);
      setGameActive(true);
  };

  const renderGame = () => {
    switch (photo.gameType) {
      case 'skyfall':
      case '冒险': // Adventure maps to Skyfall
        return <Skyfall3D onExit={onClose} />;
      case 'runner':
      case '动作': // Action maps to Runner
        return <Runner3D onExit={onClose} />;
      case 'shutter':
      case '摄影': // Photography maps to Shutter
        return <Shutter3D onExit={onClose} />;
      default: return <Puzzle onExit={onClose} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-black"
    >
      <AnimatePresence>
        {showIntro && (
            <GameIntro photo={photo} onStart={handleStartGame} onCancel={onClose} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameActive && (
          <motion.div 
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full"
          >
            {renderGame()}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Background Image while waiting */}
      {!gameActive && (
           <motion.img
           src={photo.url}
           className="absolute inset-0 w-full h-full object-cover opacity-20 blur-md"
         />
      )}
    </motion.div>
  );
};

export default GameOverlay;
