import React, { useState, useEffect, useMemo } from 'react';
import { Filter, ChevronDown, ChevronUp, X, CheckCircle, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';

const TAG_CACHE = new Map();

const TagFilter = ({ selectedTags = [], onChange, className, variant = 'card', type, filters = {} }) => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';
  const [allTags, setAllTags] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [isMobile, setIsMobile] = useState(false);
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Serialize filters to a stable string for use as effect dependency
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;
    const fetchTags = async () => {
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v != null && v !== '')
      );
      const cacheKey = JSON.stringify({ type, ...activeFilters });
      const cachedTags = TAG_CACHE.get(cacheKey);

      if (cachedTags) {
        setAllTags(cachedTags);
      }

      setIsFetching(true);
      try {
        const res = await api.get('/tags', {
          params: { type, ...activeFilters },
          silent: true,
          noRetry: true,
          timeout: 4000
        });
        const sortedTags = res.data.sort((a, b) => (b.count || 0) - (a.count || 0));
        TAG_CACHE.set(cacheKey, sortedTags);
        if (!cancelled) {
          setAllTags(sortedTags);
        }
        if (!cancelled && selectedTags.length > 0) {
          const tagNames = new Set(sortedTags.map((tag) => tag.name));
          const nextSelected = selectedTags.filter((tag) => tagNames.has(tag));
          if (nextSelected.length !== selectedTags.length) {
            onChange(nextSelected);
          }
        }
      } catch {
        if (!cancelled && !cachedTags) {
          setAllTags([]);
        }
      } finally {
        if (!cancelled) {
          setIsFetching(false);
        }
      }
    };
    fetchTags();
    return () => {
      cancelled = true;
    };
  }, [type, filtersKey]);

  const isSheetVariant = variant === 'sheet';
  const isInlineVariant = variant === 'inline';
  const initialLimit = isSheetVariant ? 14 : isInlineVariant ? 12 : isMobile ? 10 : 20;
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const orderedTags = useMemo(() => {
    if (selectedTags.length === 0) return allTags;
    const selected = [];
    const unselected = [];
    allTags.forEach((tag) => {
      if (selectedTags.includes(tag.name)) {
        selected.push(tag);
      } else {
        unselected.push(tag);
      }
    });
    return [...selected, ...unselected];
  }, [allTags, selectedTags]);
  const filteredTags = useMemo(
    () => orderedTags.filter((tag) => tag.name.toLowerCase().includes(normalizedSearchTerm)),
    [orderedTags, normalizedSearchTerm]
  );
  const displayedTags = isExpanded ? filteredTags : filteredTags.slice(0, initialLimit);
  const shouldShowSearch = allTags.length >= (isSheetVariant ? 10 : 12);
  const selectedCountLabel = t('common.selected_count', '已选 {{count}} 项', { count: selectedTags.length });

  const toggleTag = (tagName) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter(t => t !== tagName)
      : [...selectedTags, tagName];
    onChange(newTags);
  };

  if (allTags.length === 0) {
    return null;
  }
  
  const containerClasses = variant === 'card' 
    ? `${isDayMode ? 'bg-white/46 backdrop-blur-3xl border border-white/70 shadow-[0_16px_40px_rgba(99,102,241,0.08)] ring-1 ring-slate-900/[0.025]' : 'bg-[#07070a]/70 backdrop-blur-3xl border border-white/10 shadow-[0_18px_44px_rgba(0,0,0,0.35)]'} rounded-3xl p-4 md:p-6`
    : "";

  return (
    <div className={`w-full ${className || ''}`}>
      <div className={`${containerClasses} ${isFetching ? 'opacity-90 transition-opacity duration-150' : ''}`}>
        {!isSheetVariant && !isInlineVariant ? (
          <div className="flex items-center justify-between mb-4 md:mb-5">
              <button
                  type="button"
                  aria-expanded={!isMobileCollapsed}
                  aria-label={t('common.filter_by_tags', '标签筛选')}
                  className={`flex items-center gap-2 ${isMobile ? 'cursor-pointer' : 'cursor-default'} rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70`}
                  onClick={() => isMobile && setIsMobileCollapsed(!isMobileCollapsed)}
              >
                  <div className={`p-2.5 sm:p-2 rounded-xl ${variant === 'card' ? (isDayMode ? 'bg-white/64 text-indigo-500 border border-white/75 shadow-[0_8px_20px_rgba(99,102,241,0.12)]' : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 shadow-[0_0_20px_-8px_rgba(99,102,241,0.5)]') : (isDayMode ? 'bg-slate-100 text-slate-700 border border-slate-200/80' : 'bg-white/10 text-white')}`}>
                      <Filter size={isMobile ? 16 : 18} />
                  </div>
                  <span className={`font-bold text-base md:text-lg tracking-wide ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{t('common.filter_by_tags', '标签筛选')}</span>
                  {isMobile && (
                      <motion.div 
                          animate={{ rotate: isMobileCollapsed ? 0 : 180 }}
                          className={`ml-1 ${isDayMode ? 'text-slate-400' : 'text-gray-400'}`}
                      >
                          <ChevronDown size={16} />
                      </motion.div>
                  )}
              </button>
              
              {selectedTags.length > 0 && (
                  <button
                      type="button"
                      onClick={() => onChange([])}
                      className={`text-xs font-medium flex items-center gap-1 transition-colors px-3 py-2 sm:px-3 sm:py-1.5 rounded-full min-h-[44px] sm:min-h-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? 'text-slate-500 hover:text-slate-900 bg-white/54 hover:bg-white/82 border border-white/70' : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10'}`}
                  >
                      <X size={12} />
                      {t('common.clear_all', '清除全部')}
                  </button>
              )}
          </div>
        ) : isSheetVariant ? (
          <div className="mb-3 pl-1 flex items-center justify-between gap-3">
             <span className={`text-sm font-bold ${isDayMode ? 'text-slate-700' : 'text-white/80'}`}>{t('common.filter_by_tags', '标签筛选')}</span>
             {selectedTags.length > 0 && (
               <span className={`text-xs ${isDayMode ? 'text-indigo-600' : 'text-indigo-300'}`}>{selectedCountLabel}</span>
             )}
          </div>
        ) : null}
        {selectedTags.length > 0 && !isSheetVariant && !isInlineVariant && (
          <div className={`mb-3 text-xs inline-flex items-center px-2.5 py-1 rounded-full border ${isDayMode ? 'text-indigo-600 bg-indigo-50 border-indigo-200/80' : 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30'}`}>{selectedCountLabel}</div>
        )}
        {shouldShowSearch && !isInlineVariant && (
          <div className="mb-3 relative">
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDayMode ? 'text-slate-400' : 'text-gray-500'}`} />
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsExpanded(true);
              }}
              placeholder={t('common.search', '搜索...')}
              className={`w-full rounded-xl border pl-9 pr-10 py-2.5 min-h-[44px] text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? 'bg-white/52 border-white/70 text-slate-700 placeholder:text-slate-400 focus:border-indigo-300/80' : 'bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-indigo-400/40'}`}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label={t('common.clear', '清除')}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? 'text-slate-400 hover:text-slate-700' : 'text-gray-500 hover:text-white'}`}
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        <AnimatePresence>
            {((!isMobile || !isMobileCollapsed) || isSheetVariant || isInlineVariant) && (
                <motion.div 
                    initial={isMobile && !isSheetVariant ? { height: 0, opacity: 0 } : false}
                    animate={isMobile && !isSheetVariant ? { height: 'auto', opacity: 1 } : false}
                    exit={isMobile && !isSheetVariant ? { height: 0, opacity: 0 } : false}
                    className="overflow-hidden"
                >
                    <motion.div layout className={`flex flex-wrap ${isSheetVariant ? 'gap-2.5' : isInlineVariant ? 'gap-2' : 'gap-2.5 md:gap-3'}`}>
                        {displayedTags.map(tag => (
                            <motion.button
                                layout
                                key={tag.name}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                aria-pressed={selectedTags.includes(tag.name)}
                                onClick={() => toggleTag(tag.name)}
                                className={`${isInlineVariant ? 'min-h-[32px] rounded-full px-3 py-1.5 text-xs' : 'min-h-[44px] rounded-2xl px-4 py-2.5 text-sm sm:min-h-0 sm:py-2 hover:-translate-y-0.5'} font-medium transition-all border flex items-center gap-2 ${
                                    selectedTags.includes(tag.name)
                                        ? (isDayMode ? 'bg-blue-50 text-blue-700 border-blue-200/80 shadow-none' : 'bg-white text-black border-white shadow-none')
                                        : (isDayMode ? 'bg-white/70 text-slate-500 border-slate-200/80 hover:bg-white hover:text-slate-900 hover:border-blue-200/80' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20')
                                }`}
                            >
                                {selectedTags.includes(tag.name) && (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={isDayMode ? "rounded-full bg-blue-600 p-0.5" : "rounded-full bg-black p-0.5"}>
                                        <CheckCircle size={12} className="text-white" />
                                    </motion.div>
                                )}
                                {tag.name}
                                <span className={`ml-1 px-1.5 py-0.5 rounded-md text-xs font-semibold ${
                                    selectedTags.includes(tag.name) ? (isDayMode ? 'bg-indigo-100 text-indigo-600' : 'bg-indigo-500/30 text-indigo-200') : (isDayMode ? 'bg-white/68 text-slate-500' : 'bg-white/10 text-gray-400')
                                }`}>
                                    {tag.count}
                                </span>
                            </motion.button>
                        ))}
                    </motion.div>
                    {filteredTags.length === 0 && (
                      <div className={`text-center py-4 text-sm ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
                        {t('search.no_results', '没有找到关于 "{{query}}" 的结果', { query: searchTerm })}
                      </div>
                    )}

                    {filteredTags.length > initialLimit && (
                        <div className={`flex ${isInlineVariant ? 'mt-1 justify-start' : 'mt-3 justify-center md:mt-4'}`}>
                            <button
                                type="button"
                                onClick={() => setIsExpanded(!isExpanded)}
                                className={`flex items-center gap-1 text-xs md:text-sm transition-colors ${isDayMode ? 'text-slate-500 hover:text-slate-900' : 'text-gray-400 hover:text-white'}`}
                            >
                                {isExpanded ? (
                                    <>
                                        {t('common.show_less', 'Show Less')} <ChevronUp size={14} />
                                    </>
                                ) : (
                                    <>
                                        {t('common.show_more', 'Show More')} <ChevronDown size={14} />
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TagFilter;
