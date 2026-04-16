import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '../context/SettingsContext';

const TagInput = ({ value = '', onChange, type }) => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';
  const [tags, setTags] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const fetchTags = useCallback(async () => {
    try {
      const response = await api.get('/tags', { params: { type } });
      setAllTags(response.data);
    } catch (error) {
      console.error('Failed to fetch tags', error);
    }
  }, [type]);

  useEffect(() => {
    // Parse initial value
    if (value) {
      setTags(value.split(',').map(t => t.trim()).filter(Boolean));
    } else {
      setTags([]);
    }
  }, [value]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    
    if (val.trim()) {
      const filtered = allTags.filter(tag => 
        tag.name.toLowerCase().includes(val.toLowerCase()) && 
        !tags.includes(tag.name)
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const addTag = (tagName) => {
    const trimmed = tagName.trim();
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      setTags(newTags);
      onChange(newTags.join(','));
      setInputValue('');
      setShowSuggestions(false);
      inputRef.current?.focus();
    }
  };

  const removeTag = (tagToRemove) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    onChange(newTags.join(','));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="relative">
      <div className={`flex flex-wrap gap-2 px-3 py-2 rounded-xl transition-all duration-200 min-h-[44px] items-center ${isDayMode ? 'bg-white/92 border border-slate-200/80 focus-within:border-indigo-400/70 focus-within:bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]' : 'bg-white/5 border border-white/10 focus-within:border-indigo-500/50 focus-within:bg-white/10'}`}>
        <AnimatePresence>
        {tags.map((tag, index) => (
          <motion.span 
            key={tag}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            layout
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm border transition-all ${isDayMode ? 'bg-indigo-50 text-indigo-600 border-indigo-200/80 shadow-[0_8px_18px_rgba(99,102,241,0.12)] hover:bg-indigo-100' : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.1)] hover:border-indigo-500/50 hover:bg-indigo-500/20'}`}
          >
            <Tag size={12} />
            {tag}
            <button 
              type="button"
              onClick={() => removeTag(tag)}
              className={`ml-1 p-0.5 rounded-full transition-colors ${isDayMode ? 'text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100' : 'hover:text-white hover:bg-indigo-500/50'}`}
            >
              <X size={12} />
            </button>
          </motion.span>
        ))}
        </AnimatePresence>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue) setShowSuggestions(true);
            else if (allTags.length > 0) {
                 // Show top 5 tags if input is empty
                 setSuggestions(allTags.slice(0, 5));
                 setShowSuggestions(true);
            }
          }}
          className={`bg-transparent border-none outline-none flex-1 min-w-[120px] text-base ${isDayMode ? 'text-slate-900 placeholder:text-slate-400' : 'text-white placeholder-gray-500'}`}
          placeholder={tags.length === 0 ? t('upload.tags_placeholder') : ''}
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className={`absolute z-50 left-0 right-0 mt-2 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar backdrop-blur-xl ${isDayMode ? 'bg-white/96 border border-slate-200/90 shadow-[0_24px_60px_rgba(148,163,184,0.2)]' : 'bg-[#0a0a0a]/95 border border-white/10'}`}
        >
          {suggestions.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => addTag(tag.name)}
              className={`w-full text-left px-4 py-3 transition-colors flex justify-between items-center text-base ${isDayMode ? 'text-slate-700 hover:bg-slate-50 hover:text-slate-900' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
            >
              <span>{tag.name}</span>
              <span className={`text-xs ${isDayMode ? 'text-slate-400' : 'text-gray-500'}`}>{tag.count} {t('admin.tag_manager.items_count')}</span>
            </button>
          ))}
        </div>
      )}
      
      {/* Quick Select for Popular Tags */}
      {allTags.length > 0 && tags.length < 5 && !showSuggestions && (
          <div className="mt-2 flex flex-wrap gap-2">
              <span className={`text-sm py-1 ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>{t('upload.popular_tags')}</span>
              {allTags.slice(0, 5).filter(t => !tags.includes(t.name)).map(tag => (
                  <button
                      key={tag.id}
                      type="button"
                      onClick={() => addTag(tag.name)}
                      className={`text-sm px-3 py-1.5 rounded-lg transition-colors border ${isDayMode ? 'bg-white/92 hover:bg-white text-slate-600 hover:text-slate-900 border-slate-200/80 hover:border-indigo-200/80 shadow-[0_8px_18px_rgba(148,163,184,0.12)]' : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5'}`}
                  >
                      {tag.name}
                  </button>
              ))}
          </div>
      )}
    </div>
  );
};

export default TagInput;
