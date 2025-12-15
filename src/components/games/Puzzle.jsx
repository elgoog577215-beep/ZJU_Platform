import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const Puzzle = ({ onExit }) => {
  // Simple tile swapping puzzle logic or just a "Click to reveal" for now to save complexity
  // Let's do a simple "Memory Match" with colors/icons
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [solved, setSolved] = useState([]);
  const { t } = useTranslation();

  useEffect(() => {
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C'];
    const deck = [...colors, ...colors]
      .sort(() => Math.random() - 0.5)
      .map((color, index) => ({ id: index, color }));
    setCards(deck);
  }, []);

  const handleCardClick = (id) => {
    if (flipped.length === 2 || flipped.includes(id) || solved.includes(id)) return;
    
    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;
      if (cards[first].color === cards[second].color) {
        setSolved(prev => [...prev, first, second]);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  return (
    <div className="relative w-full h-full bg-neutral-800 flex items-center justify-center flex-col">
      <h2 className="text-2xl text-white mb-8 font-serif">Memory Pattern</h2>
      <button onClick={onExit} className="absolute top-4 right-4 text-white/50 hover:text-white">{t('game.exit')}</button>
      
      <div className="grid grid-cols-4 gap-4">
        {cards.map(card => (
          <motion.div
            key={card.id}
            className="w-20 h-20 bg-neutral-700 rounded-lg cursor-pointer perspective-1000"
            onClick={() => handleCardClick(card.id)}
            animate={{ rotateY: flipped.includes(card.id) || solved.includes(card.id) ? 180 : 0 }}
          >
             <div className="w-full h-full relative preserve-3d">
               {/* Back */}
               <div className="absolute inset-0 bg-neutral-600 rounded-lg backface-hidden" />
               {/* Front */}
               <div 
                 className="absolute inset-0 rounded-lg backface-hidden rotate-y-180"
                 style={{ backgroundColor: card.color }} 
               />
             </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Puzzle;
