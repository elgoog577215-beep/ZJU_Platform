import React from 'react';
import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NotFound = () => {
  const { t } = useTranslation();

  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-black text-white relative z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-9xl font-bold font-serif text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">404</h1>
        <p className="text-2xl text-gray-400 mb-8">{t('not_found.title')}</p>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">{t('not_found.description')}</p>
        
        <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full transition-all border border-white/10 backdrop-blur-md">
            <Home size={20} />
            <span>{t('not_found.go_home')}</span>
        </Link>
      </motion.div>
    </section>
  );
};

export default NotFound;