import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
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
  const menuRef = useRef(null);
  const isDayMode = uiMode === 'day';
  const currentLanguageCode = (i18n.resolvedLanguage || i18n.language || 'zh').split('-')[0];

  useEffect(() => {
    const currentLang = languages.find((language) => language.code === currentLanguageCode) || languages[0];
    document.body.dir = currentLang.dir;
    document.documentElement.lang = currentLang.code;
  }, [currentLanguageCode]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className="relative z-50">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={i18n.t('nav.language_switcher', '切换语言')}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="language-switcher-menu"
        className={`flex items-center gap-2 rounded-lg p-2 transition-colors ${isDayMode ? 'text-slate-500 hover:bg-white/90 hover:text-slate-900' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
      >
        <Globe className="h-5 w-5" aria-hidden="true" />
        <span className="text-sm font-medium uppercase">{currentLanguageCode}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="language-switcher-menu"
            role="menu"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`absolute right-0 mt-2 w-40 overflow-hidden rounded-lg border shadow-xl ${isDayMode ? 'border-slate-200/80 bg-white/96 shadow-[0_18px_42px_rgba(148,163,184,0.18)]' : 'border-white/10 bg-neutral-900'}`}
          >
            {languages.map((language) => {
              const isActive = currentLanguageCode === language.code;

              return (
                <button
                  key={language.code}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => changeLanguage(language.code)}
                  className={`relative flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${isActive ? (isDayMode ? 'font-bold text-slate-900' : 'font-bold text-white') : (isDayMode ? 'text-slate-500 hover:bg-slate-50 hover:text-slate-900' : 'text-gray-400 hover:bg-white/10')}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeLang"
                      className={`absolute inset-0 ${isDayMode ? 'bg-indigo-50' : 'bg-white/5'}`}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10">{language.name}</span>
                  {isActive && (
                    <div className="relative z-10 h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSwitcher;
