import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'zh', name: '中文', dir: 'ltr' },
  { code: 'en', name: 'English', dir: 'ltr' },
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  useEffect(() => {
    const currentLang = languages.find(l => l.code === i18n.language) || languages[0];
    document.body.dir = currentLang.dir;
    document.documentElement.lang = currentLang.code;
  }, [i18n.language]);

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
      >
        <Globe className="w-5 h-5" />
        <span className="uppercase font-medium text-sm">{i18n.language.split('-')[0]}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute right-0 mt-2 w-40 bg-neutral-900 border border-white/10 rounded-lg shadow-xl overflow-hidden"
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`w-full text-left px-4 py-3 text-sm hover:bg-white/10 transition-colors flex items-center justify-between relative
                  ${i18n.language === lang.code ? 'text-white font-bold' : 'text-gray-400'}`}
              >
                {i18n.language === lang.code && (
                    <motion.div 
                        layoutId="activeLang"
                        className="absolute inset-0 bg-white/5"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                )}
                <span className="relative z-10">{lang.name}</span>
                {i18n.language === lang.code && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 relative z-10 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSwitcher;
