import { useState, useEffect, useRef } from 'react';
import { Search, Command, X, ArrowRight, Image as ImageIcon, Music, Film, FileText, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useBackClose } from '../hooks/useBackClose';
import { useReducedMotion } from '../utils/animations';
import { useSettings } from '../context/SettingsContext';

import { useTranslation } from 'react-i18next';

import { getThumbnailUrl } from '../utils/imageUtils';

const SearchPalette = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  useBackClose(isOpen, () => setIsOpen(false));
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const normalizedQuery = query.trim();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleOpenEvent = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-search-palette', handleOpenEvent);
    
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('open-search-palette', handleOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const controller = new AbortController();
    
    const timer = setTimeout(() => {
      if (normalizedQuery.length >= 2) {
        setLoading(true);
        api.get(`/search?q=${normalizedQuery}`, { signal: controller.signal })
          .then(res => {
            setResults((res.data || []).filter((item) => item.type !== 'community'));
            setSelectedIndex(0);
            setLoading(false);
          })
          .catch(err => {
            if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError') return;
            console.error(err);
            setLoading(false);
          });
      } else {
        setResults([]);
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, normalizedQuery]);

  const handleInputKeyDown = (e) => {
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    }
  };

  const handleSelect = (item) => {
    navigate(`${item.link}?id=${item.id}`);
    setIsOpen(false);
  };

  const getIcon = (type) => {
    switch(type) {
      case 'photo': return <ImageIcon size={16} className="text-purple-400" />;
      case 'music': return <Music size={16} className="text-pink-400" />;
      case 'video': return <Film size={16} className="text-blue-400" />;
      case 'article': return <FileText size={16} className="text-yellow-400" />;
      case 'event': return <Calendar size={16} className="text-green-400" />;
      default: return <Search size={16} />;
    }
  };

  const highlightTitle = (title) => {
    if (normalizedQuery.length < 2) return title;

    return title.split(new RegExp(`(${normalizedQuery})`, 'gi')).map((part, index) =>
      part.toLowerCase() === normalizedQuery.toLowerCase()
        ? <span key={index} className="text-indigo-400 bg-indigo-500/10 px-0.5 rounded">{part}</span>
        : part
    );
  };

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center md:pt-[20vh] md:px-4" role="dialog" aria-modal="true" aria-label={t('search.placeholder')}>
            <motion.div 
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className={`absolute inset-0 backdrop-blur-md ${isDayMode ? 'bg-white/55' : 'bg-black/60'}`}
            />

            <motion.div 
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98, y: -12 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.98, y: -12 }}
            transition={prefersReducedMotion ? undefined : { duration: 0.16 }}
            className={`relative w-full h-[100dvh] md:h-auto md:max-w-2xl backdrop-blur-xl border-0 md:border rounded-none md:rounded-xl shadow-2xl overflow-hidden flex flex-col ${isDayMode ? 'bg-white/94 md:bg-white/88 md:border-slate-200/80' : 'bg-[#0a0a0a]/92 md:bg-[#0a0a0a]/88 md:border-white/10'}`}
            >
            <div className={`flex items-center gap-3 px-4 py-4 border-b shrink-0 mt-[env(safe-area-inset-top)] md:mt-0 ${isDayMode ? 'border-slate-200/80' : 'border-white/10'}`}>
                <Search className={isDayMode ? 'text-slate-400' : 'text-gray-400'} size={20} />
                <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={t('search.placeholder')}
                className={`flex-1 bg-transparent placeholder-gray-500 focus:outline-none text-lg ${isDayMode ? 'text-slate-900' : 'text-white'}`}
                />
                <div className="flex items-center gap-2">
                    <kbd className={`hidden md:inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono ${isDayMode ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-gray-400'}`}>
                        <span className="text-xs">ESC</span>
                    </kbd>
                    <button type="button" aria-label={t('common.close', '关闭')} onClick={() => setIsOpen(false)} className={`p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? 'text-slate-400 hover:text-slate-900' : 'text-gray-400 hover:text-white'}`}>
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 pb-[env(safe-area-inset-bottom)]">
                {loading ? (
                    <div className={`p-8 text-center ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>{t('common.searching')}</div>
                ) : results.length > 0 ? (
                    <div className="space-y-1">
                        {results.map((item, index) => (
                            <button
                                key={`${item.type}-${item.id}`}
                                type="button"
                                aria-label={`${t(`common.${item.type}`, item.type)} ${item.title}`}
                                onClick={() => handleSelect(item)}
                                onMouseEnter={() => setSelectedIndex(index)}
                                className={`w-full min-h-[52px] flex items-center gap-4 px-4 py-3 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${
                                    index === selectedIndex 
                                      ? (isDayMode ? 'bg-indigo-50 border border-indigo-100/80' : 'bg-white/10')
                                      : (isDayMode ? 'hover:bg-slate-50' : 'hover:bg-white/5')
                                }`}
                            >
                                <div className={`w-10 h-10 rounded overflow-hidden flex-shrink-0 border ${isDayMode ? 'bg-white border-slate-200/80' : 'bg-black/50 border-white/10'}`}>
                                    {item.image ? (
                                        <img src={getThumbnailUrl(item.image)} alt={item.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                                            {getIcon(item.type)}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <h4 className={`text-sm font-medium ${index === selectedIndex ? (isDayMode ? 'text-slate-900' : 'text-white') : (isDayMode ? 'text-slate-700' : 'text-gray-300')}`}>
                                        {highlightTitle(item.title)}
                                    </h4>
                                    <span className={`text-xs capitalize ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>{t(`common.${item.type}`, item.type)}</span>
                                </div>
                                {index === selectedIndex && (
                                    <ArrowRight size={16} className={isDayMode ? 'text-slate-400' : 'text-gray-400'} />
                                )}
                            </button>
                        ))}
                    </div>
                ) : normalizedQuery.length >= 2 ? (
                    <div className={`p-8 text-center ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>{t('search.no_results', { query: normalizedQuery })}</div>
                ) : (
                    <div className={`p-12 text-center flex flex-col items-center ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 animate-pulse ${isDayMode ? 'bg-slate-100' : 'bg-white/5'}`}>
                            <Command className={isDayMode ? 'text-slate-300' : 'text-white/20'} size={40} />
                        </div>
                        <p className={`text-lg font-medium ${isDayMode ? 'text-slate-400' : 'text-white/40'}`}>{t('search.empty_hint')}</p>
                        <p className={`text-xs mt-2 ${isDayMode ? 'text-slate-300' : 'text-white/20'}`}>{t('search.min_chars')}</p>
                    </div>
                )}
            </div>
            
            <div className={`px-4 py-2 border-t text-xs flex justify-between ${isDayMode ? 'bg-slate-50/90 border-slate-200/80 text-slate-500' : 'bg-black/20 border-white/5 text-gray-500'}`}>
                <span>{t('search.footer_hint')}</span>
                <span>{t('search.brand_search')}</span>
            </div>
            </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SearchPalette;
