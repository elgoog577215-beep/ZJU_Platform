import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, X, ArrowRight, Image as ImageIcon, Music, Film, FileText, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useBackClose } from '../hooks/useBackClose';

import { useTranslation } from 'react-i18next';

const SearchPalette = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const { onNavigate } = useBackClose(isOpen, () => setIsOpen(false));
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Toggle with Keyboard Shortcut & Custom Event
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

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Search Logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        setLoading(true);
        api.get(`/search?q=${query}`)
          .then(res => {
            setResults(res.data);
            setSelectedIndex(0);
            setLoading(false);
          })
          .catch(err => {
            console.error(err);
            setLoading(false);
          });
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard Navigation
  const handleInputKeyDown = (e) => {
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
    // Navigate with ID for deep linking
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center md:pt-[20vh] md:px-4">
            {/* Backdrop */}
            <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full h-[100dvh] md:h-auto md:max-w-2xl bg-[#1a1a1a] border-0 md:border md:border-white/10 rounded-none md:rounded-xl shadow-2xl overflow-hidden flex flex-col"
            >
            {/* Input Header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10 shrink-0 mt-[env(safe-area-inset-top)] md:mt-0">
                <Search className="text-gray-400" size={20} />
                <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={t('search.placeholder')}
                className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-lg"
                />
                <div className="flex items-center gap-2">
                    <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-1 bg-white/5 rounded text-xs text-gray-400 font-mono">
                        <span className="text-xs">ESC</span>
                    </kbd>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white p-2">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 pb-[env(safe-area-inset-bottom)]">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Searching...</div>
                ) : results.length > 0 ? (
                    <div className="space-y-1">
                        {results.map((item, index) => (
                            <motion.button
                                key={`${item.type}-${item.id}`}
                                layout
                                onClick={() => handleSelect(item)}
                                onMouseEnter={() => setSelectedIndex(index)}
                                className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${
                                    index === selectedIndex ? 'bg-white/10' : 'hover:bg-white/5'
                                }`}
                            >
                                <div className="w-10 h-10 rounded bg-black/50 overflow-hidden flex-shrink-0 border border-white/10">
                                    {item.image ? (
                                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                                            {getIcon(item.type)}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <h4 className={`text-sm font-medium ${index === selectedIndex ? 'text-white' : 'text-gray-300'}`}>
                                        {item.title}
                                    </h4>
                                    <span className="text-xs text-gray-500 capitalize">{item.type}</span>
                                </div>
                                {index === selectedIndex && (
                                    <ArrowRight size={16} className="text-gray-400" />
                                )}
                            </motion.button>
                        ))}
                    </div>
                ) : query.length >= 2 ? (
                    <div className="p-8 text-center text-gray-500">No results found for "{query}"</div>
                ) : (
                    <div className="p-12 text-center text-gray-500">
                        <Command className="mx-auto mb-4 opacity-20" size={48} />
                        <p>Type to search photos, music, videos, and more...</p>
                    </div>
                )}
            </div>
            
            {/* Footer Hint */}
            <div className="bg-black/20 px-4 py-2 border-t border-white/5 text-xs text-gray-500 flex justify-between">
                <span>Pro tip: Use arrow keys to navigate</span>
                <span>Lumos Search</span>
            </div>
            </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SearchPalette;