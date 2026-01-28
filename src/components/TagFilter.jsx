import React, { useState, useEffect } from 'react';
import { Filter, ChevronDown, ChevronUp, X, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useTranslation } from 'react-i18next';

const TagFilter = ({ selectedTags = [], onChange, className, variant = 'card', type }) => {
  const { t } = useTranslation();
  const [allTags, setAllTags] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchTags();
  }, [type]);

  const fetchTags = async () => {
    try {
      const res = await api.get('/tags', { params: { type } });
      // Sort by usage count if available, otherwise alphabetical
      const sortedTags = res.data.sort((a, b) => (b.count || 0) - (a.count || 0));
      setAllTags(sortedTags);
    } catch (error) {
      console.error('Failed to fetch tags', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tagName) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter(t => t !== tagName)
      : [...selectedTags, tagName];
    onChange(newTags);
  };

  if (loading) return null;
  
  if (allTags.length === 0) {
    console.debug(`TagFilter: No tags found for type "${type}"`);
    return null;
  }

  const initialLimit = isMobile ? 10 : 20;
  const displayedTags = isExpanded ? allTags : allTags.slice(0, initialLimit);
  
  const containerClasses = variant === 'card' 
    ? "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3 md:p-6 shadow-xl"
    : "";

  return (
    <div className={`w-full ${className || ''}`}>
      <div className={containerClasses}>
        <div className="flex items-center justify-between mb-3 md:mb-4">
            <div 
                className="flex items-center gap-2 cursor-pointer md:cursor-default" 
                onClick={() => isMobile && setIsMobileCollapsed(!isMobileCollapsed)}
            >
                <div className={`p-1.5 md:p-2 rounded-lg ${variant === 'card' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/10 text-white'}`}>
                    <Filter size={isMobile ? 16 : 18} />
                </div>
                <span className="font-bold text-white text-base md:text-lg tracking-wide">{t('common.filter_by_tags', 'Filter by Tags')}</span>
                {isMobile && (
                    <motion.div 
                        animate={{ rotate: isMobileCollapsed ? 0 : 180 }}
                        className="ml-1 text-gray-400"
                    >
                        <ChevronDown size={16} />
                    </motion.div>
                )}
            </div>
            
            {selectedTags.length > 0 && (
                <button 
                    onClick={() => onChange([])}
                    className="text-xs font-medium text-gray-400 hover:text-white flex items-center gap-1 transition-colors px-2.5 py-1 md:px-3 md:py-1.5 rounded-full bg-white/5 hover:bg-white/10"
                >
                    <X size={12} />
                    {t('common.clear_all', 'Clear All')}
                </button>
            )}
        </div>

        <AnimatePresence>
            {(!isMobile || !isMobileCollapsed) && (
                <motion.div 
                    initial={isMobile ? { height: 0, opacity: 0 } : false}
                    animate={isMobile ? { height: 'auto', opacity: 1 } : false}
                    exit={isMobile ? { height: 0, opacity: 0 } : false}
                    className="overflow-hidden"
                >
                    <motion.div layout className="flex flex-wrap gap-1.5 md:gap-2">
                        <AnimatePresence>
                            {displayedTags.map(tag => {
                            const isSelected = selectedTags.includes(tag.name);
                            return (
                                <motion.button
                                    layout
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    key={tag.id}
                                    onClick={() => toggleTag(tag.name)}
                                    className={`
                                        group relative px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-medium transition-all duration-300 flex items-center gap-1.5 md:gap-2 overflow-hidden
                                        ${isSelected 
                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20' 
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5 hover:border-white/20'}
                                    `}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {isSelected && <CheckCircle size={isMobile ? 10 : 12} className="text-white/80" />}
                                    <span className="relative z-10">{tag.name}</span>
                                    {!isSelected && (
                                        <span className="ml-1 text-[10px] md:text-xs opacity-50 bg-black/20 px-1 rounded-full">
                                            {tag.count || 0}
                                        </span>
                                    )}
                                </motion.button>
                            );
                            })}
                        </AnimatePresence>
                    </motion.div>

                    {allTags.length > initialLimit && (
                        <div className="flex justify-center mt-3 md:mt-4">
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="flex items-center gap-1 text-xs md:text-sm text-gray-400 hover:text-white transition-colors"
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
