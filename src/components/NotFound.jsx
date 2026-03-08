import React from 'react';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NotFound = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-black text-white relative z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center relative"
      >
        <div className="absolute inset-0 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
        <motion.h1 
            className="text-9xl font-bold font-serif text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 mb-4 animate-text-gradient drop-shadow-2xl"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
            404
        </motion.h1>
        <p className="text-2xl text-gray-400 mb-8 relative z-10">{t('not_found.title')}</p>
        <p className="text-gray-500 mb-8 max-w-md mx-auto relative z-10">{t('not_found.description')}</p>
        
        <div className="flex items-center gap-4 justify-center">
            <button 
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all border border-white/10 backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:-translate-y-1 relative z-10 group"
            >
                <ArrowLeft size={20} className="text-gray-400 group-hover:text-white transition-colors" />
                <span className="font-medium">{t('common.back', 'Back')}</span>
            </button>

            <Link to="/" className="inline-flex items-center gap-2 px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all border border-white/10 backdrop-blur-md shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:-translate-y-1 relative z-10 group">
                <Home size={20} className="text-indigo-400 group-hover:text-white transition-colors" />
                <span className="font-medium">{t('not_found.go_home')}</span>
            </Link>
        </div>
      </motion.div>
    </section>
  );
};

export default NotFound;