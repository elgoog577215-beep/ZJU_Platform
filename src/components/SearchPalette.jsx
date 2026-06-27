import { useState, useEffect, useRef } from 'react';
import { Search, Command, X, ArrowRight, Image as ImageIcon, Music, Film, FileText, Calendar, MessageSquare, Users, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useBackClose, useBodyScrollLock } from '../hooks/useBackClose';
import { useReducedMotion } from '../utils/animations';
import { useSettings } from '../context/SettingsContext';

import { useTranslation } from 'react-i18next';

import { getThumbnailUrl } from '../utils/imageUtils';

const SearchPalette = ({ initialOpen = false }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(initialOpen);
  useBackClose(isOpen, () => setIsOpen(false));
  useBodyScrollLock(isOpen);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [resultGroups, setResultGroups] = useState([]);
  const [searchMeta, setSearchMeta] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const normalizedQuery = query.trim();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';
  const listboxId = 'search-palette-results';

  useEffect(() => {
    const handleKeyDown = (e) => {
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
      setResultGroups([]);
      setSearchMeta(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const controller = new AbortController();
    
    const timer = setTimeout(() => {
      if (normalizedQuery.length >= 2) {
        setLoading(true);
        api.get('/search', { params: { q: normalizedQuery }, signal: controller.signal })
          .then(res => {
            const payload = res.data;
            const nextResults = Array.isArray(payload)
              ? payload
              : (payload?.results || payload?.legacy || []);
            const nextGroups = Array.isArray(payload?.groups) ? payload.groups : [];
            setResults(nextResults);
            setResultGroups(nextGroups);
            setSearchMeta(Array.isArray(payload) ? null : payload);
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
        setResultGroups([]);
        setSearchMeta(null);
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

  const normalizeTarget = (item) => {
    const rawTarget = item.deepLink || item.link || '/';
    if (item.type === 'music' || rawTarget.startsWith('/music')) {
      const params = new URLSearchParams();
      try {
        const url = new URL(rawTarget, window.location.origin);
        url.searchParams.forEach((value, key) => params.set(key, value));
      } catch {
        // Fall back to item id below; malformed result links should still
        // land in the community podcast area.
      }
      const musicId = params.get('music') || params.get('id') || item.id;
      params.delete('id');
      if (musicId) params.set('music', musicId);
      const query = params.toString();
      return `/articles${query ? `?${query}` : ''}#community-podcast`;
    }
    return rawTarget;
  };

  const handleSelect = (item) => {
    const target = normalizeTarget(item);
    if (item.deepLink || target.includes('?')) {
      navigate(target);
    } else {
      navigate(`${target}?id=${item.id}`);
    }
    setIsOpen(false);
  };

  const getIcon = (type) => {
    switch(type) {
      case 'photo': return <ImageIcon size={16} aria-hidden="true" className="text-purple-400" />;
      case 'music': return <Music size={16} aria-hidden="true" className="text-pink-400" />;
      case 'video': return <Film size={16} aria-hidden="true" className="text-blue-400" />;
      case 'article': return <FileText size={16} aria-hidden="true" className="text-yellow-400" />;
      case 'event': return <Calendar size={16} aria-hidden="true" className="text-green-400" />;
      case 'post': return <MessageSquare size={16} aria-hidden="true" className="text-orange-400" />;
      case 'group': return <Users size={16} aria-hidden="true" className="text-cyan-400" />;
      case 'news': return <FileText size={16} aria-hidden="true" className="text-sky-400" />;
      default: return <Search size={16} aria-hidden="true" />;
    }
  };

  const resolveResultIndex = (item) => results.findIndex(
    (candidate) => candidate.type === item.type && String(candidate.id) === String(item.id),
  );

  const renderResultItem = (item) => {
    const index = resolveResultIndex(item);
    const isSelected = index === selectedIndex;

    return (
      <button
        key={`${item.type}-${item.id}`}
        type="button"
        role="option"
        aria-selected={isSelected}
        aria-label={`${item.typeLabel || t(`common.${item.type}`, item.type)} ${item.title}`}
        onClick={() => handleSelect(item)}
        onMouseEnter={() => setSelectedIndex(Math.max(0, index))}
        className={`w-full min-h-[60px] flex items-center gap-4 px-4 py-3 rounded-[5px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${
          isSelected
            ? (isDayMode ? 'bg-indigo-50 border border-indigo-100/80' : 'bg-white/10')
            : (isDayMode ? 'hover:bg-slate-50' : 'hover:bg-white/5')
        }`}
      >
        <div className={`w-10 h-10 rounded-[5px] overflow-hidden flex-shrink-0 border ${isDayMode ? 'bg-white border-slate-200/80' : 'bg-black/50 border-white/10'}`}>
          {item.image ? (
            <img src={getThumbnailUrl(item.image)} alt={item.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              {getIcon(item.type)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="flex min-w-0 items-center gap-2">
            <h4 className={`truncate text-sm font-medium ${isSelected ? (isDayMode ? 'text-slate-900' : 'text-white') : (isDayMode ? 'text-slate-700' : 'text-gray-300')}`}>
              {highlightTitle(item.title)}
            </h4>
            <span className={`shrink-0 rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold ${isDayMode ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-gray-400'}`}>
              {item.typeLabel || t(`common.${item.type}`, item.type)}
            </span>
          </div>
          {item.meta || item.summary ? (
            <p className={`mt-1 line-clamp-1 text-xs ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>
              {item.meta || item.summary}
            </p>
          ) : null}
          {Array.isArray(item.match_reasons) && item.match_reasons.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {item.match_reasons.slice(0, 2).map((reason) => (
                <span
                  key={reason}
                  className={`rounded-[4px] px-1.5 py-0.5 text-[10px] ${isDayMode ? 'bg-blue-50 text-blue-700' : 'bg-blue-500/10 text-blue-200'}`}
                >
                  {reason}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {isSelected && (
          <ArrowRight size={16} aria-hidden="true" className={isDayMode ? 'text-slate-400' : 'text-gray-400'} />
        )}
      </button>
    );
  };

  const highlightTitle = (title) => {
    if (normalizedQuery.length < 2) return title;

    // FIX: BUG-11 — Escape regex special characters from user input to prevent SyntaxError
    const escaped = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return title.split(new RegExp(`(${escaped})`, 'gi')).map((part, index) =>
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
            className={`absolute inset-0 ${isDayMode ? 'bg-slate-950/42' : 'bg-black/72'}`}
            />

            <motion.div 
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98, y: -12 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.98, y: -12 }}
            transition={prefersReducedMotion ? undefined : { duration: 0.16 }}
            className={`relative flex h-[100dvh] w-full flex-col overflow-hidden rounded-none border-0 shadow-[0_20px_48px_rgba(0,0,0,0.36)] md:h-auto md:max-w-2xl md:rounded-[7px] md:border ${isDayMode ? 'bg-white text-slate-950 md:border-slate-200' : 'bg-[#0a0a0a] text-white md:border-white/10'}`}
            >
            <div className={`mt-[env(safe-area-inset-top)] flex shrink-0 items-center gap-3 border-b px-4 py-4 md:mt-0 ${isDayMode ? 'theme-divider' : 'border-white/10'}`}>
                <Search aria-hidden="true" className={isDayMode ? 'text-slate-400' : 'text-gray-400'} size={20} />
                <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded={results.length > 0}
                aria-controls={results.length > 0 ? listboxId : undefined}
                aria-autocomplete="list"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={t('search.placeholder')}
                className={`flex-1 bg-transparent text-lg placeholder-gray-500 focus:outline-none ${isDayMode ? 'text-slate-900' : 'text-white'}`}
                />
                <div className="flex items-center gap-2">
                    <kbd className={`hidden md:inline-flex items-center gap-1 rounded-[4px] px-2 py-1 text-xs font-mono ${isDayMode ? 'theme-kbd' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                        <span className="text-xs">ESC</span>
                    </kbd>
                    <button type="button" aria-label={t('common.close', '关闭')} onClick={() => setIsOpen(false)} className={`rect-icon-button p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? 'text-slate-400 hover:text-slate-900' : 'text-gray-400 hover:text-white'}`}>
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 pb-[env(safe-area-inset-bottom)]">
                {loading ? (
                    <div className={`p-8 text-center ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>{t('common.searching')}</div>
                ) : results.length > 0 ? (
                    <div id={listboxId} role="listbox" aria-label={t('search.results', '搜索结果')} className="space-y-3">
                        {searchMeta?.parsed_query ? (
                          <div className={`flex items-center justify-between gap-3 rounded-[5px] border px-3 py-2 text-xs ${isDayMode ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-white/10 bg-white/[0.03] text-gray-400'}`}>
                            <span className="inline-flex items-center gap-1">
                              <Sparkles size={13} />
                              {t('search.ai_search', '全站 AI 搜索')}
                            </span>
                            <span>{t('search.result_meta', {
                              time: searchMeta.search_time_ms || 0,
                              count: searchMeta.total || results.length,
                              defaultValue: '{{time}}ms · {{count}} 条结果',
                            })}</span>
                          </div>
                        ) : null}

                        {resultGroups.length > 0 ? (
                          resultGroups.map((group) => (
                            <section key={group.key} className="space-y-1">
                              <div className={`flex items-center justify-between px-2 text-[11px] font-bold uppercase tracking-normal ${isDayMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                <span>{group.label}</span>
                                <span>{group.count}</span>
                              </div>
                              {(group.results || []).map(renderResultItem)}
                            </section>
                          ))
                        ) : (
                          <div className="space-y-1">
                            {results.map(renderResultItem)}
                          </div>
                        )}
                    </div>
                ) : normalizedQuery.length >= 2 ? (
                    <div className={`p-8 text-center ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>{t('search.no_results', { query: normalizedQuery })}</div>
                ) : (
                    <div className={`p-12 text-center flex flex-col items-center ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>
                        <div className={`mb-6 flex h-20 w-20 items-center justify-center border animate-pulse ${isDayMode ? 'border-slate-200 bg-slate-100' : 'border-white/10 bg-white/5'}`}>
                            <Command aria-hidden="true" className={isDayMode ? 'text-slate-300' : 'text-white/20'} size={40} />
                        </div>
                        <p className={`text-lg font-medium ${isDayMode ? 'text-slate-400' : 'text-white/40'}`}>{t('search.empty_hint')}</p>
                        <p className={`text-xs mt-2 ${isDayMode ? 'text-slate-300' : 'text-white/20'}`}>{t('search.min_chars')}</p>
                    </div>
                )}
            </div>
            
            <div className={`flex justify-between border-t px-4 py-2 text-xs ${isDayMode ? 'theme-surface-muted theme-divider text-slate-500' : 'bg-black/20 border-white/5 text-gray-500'}`}>
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
