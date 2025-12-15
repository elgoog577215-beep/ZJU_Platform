import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const GameIntro = ({ photo, onStart, onCancel }) => {
  const { t } = useTranslation();

  return (
    <div className="absolute inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-neutral-900 border border-white/10 max-w-2xl w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
      >
        {/* Image Side */}
        <div className="w-full md:w-1/2 h-64 md:h-auto relative">
            <img src={photo.url} className="w-full h-full object-cover opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-900 to-transparent" />
        </div>

        {/* Content Side */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
            <h2 className="text-2xl md:text-3xl font-bold font-serif text-white mb-2">{photo.gameType.toUpperCase()}</h2>
            <h3 className="text-blue-400 font-mono text-xs md:text-sm mb-4 md:mb-6 tracking-widest">{t('game.intro_subtitle')}</h3>
            
            <p className="text-gray-300 mb-6 text-sm leading-relaxed">
                {photo.gameDescription || t('game.default_desc')}
            </p>

            <div className="bg-black/30 rounded p-4 mb-8 border border-white/5">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">{t('game.controls')}</h4>
                <ul className="text-sm text-gray-300 space-y-1 font-mono">
                    {(photo.gameType === 'skyfall' || photo.gameType === '冒险') && <li>{t('game.steer')}</li>}
                    {(photo.gameType === 'runner' || photo.gameType === '动作') && <li>{t('game.jump')}</li>}
                    {(photo.gameType === 'shutter' || photo.gameType === '摄影') && <li>{t('game.shoot')}</li>}
                    {(photo.gameType === 'puzzle' || photo.gameType === '益智') && <li>{t('game.flip')}</li>}
                </ul>
            </div>

            <div className="flex gap-4">
                <button 
                    onClick={onStart}
                    className="flex-1 bg-white text-black font-bold py-3 rounded hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                    <Play size={18} /> {t('game.start')}
                </button>
                <button 
                    onClick={onCancel}
                    className="px-4 py-3 rounded border border-white/20 text-white hover:bg-white/10 transition-colors"
                >
                    {t('game.cancel')}
                </button>
            </div>
        </div>
      </motion.div>
    </div>
  );
};

export default GameIntro;
