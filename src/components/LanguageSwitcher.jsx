import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const languages = [
  { code: 'zh', name: '中文', dir: 'ltr' },
  { code: 'en', name: 'English', dir: 'ltr' },
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const { uiMode } = useSettings();
  const [isOpen, setIsOpen] = React.useState(false);
  const isDayMode = uiMode === 'day';

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
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={i18n.t('nav.language_switcher', '切换语言')}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="language-switcher-menu"
        className={`flex items-center gap-2 transition-colors p-2 rounded-lg ${isDayMode ? 'text-slate-500 hover:text-slate-900 hover:bg-white/90' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
      >
        <Globe className="w-5 h-5" />
        <span className="uppercase font-medium text-sm">{i18n.language.split('-')[0]}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="language-switcher-menu"
            role="menu"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`absolute right-0 mt-2 w-40 border rounded-lg shadow-xl overflow-hidden ${isDayMode ? 'bg-white/96 border-slate-200/80 shadow-[0_18px_42px_rgba(148,163,184,0.18)]' : 'bg-neutral-900 border-white/10'}`}
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                role="menuitemradio"
                aria-checked={i18n.language === lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between relative
                  ${i18n.language === lang.code ? (isDayMode ? 'text-slate-900 font-bold' : 'text-white font-bold') : (isDayMode ? 'text-slate-500 hover:bg-slate-50 hover:text-slate-900' : 'text-gray-400 hover:bg-white/10')}`}
              >
                {i18n.language === lang.code && (
                    <motion.div 
                        layoutId="activeLang"
                        className={`absolute inset-0 ${isDayMode ? 'bg-indigo-50' : 'bg-white/5'}`}
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
