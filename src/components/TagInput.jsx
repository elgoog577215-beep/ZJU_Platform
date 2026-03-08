import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

import { motion, AnimatePresence } from 'framer-motion';

const TagInput = ({ value = '', onChange, type }) => {
  const { t } = useTranslation();
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
      <div className="flex flex-wrap gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus-within:border-indigo-500/50 focus-within:bg-white/10 transition-all duration-200 min-h-[44px] items-center">
        <AnimatePresence>
        {tags.map((tag, index) => (
          <motion.span 
            key={tag}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            layout
            className="flex items-center gap-1 bg-indigo-500/10 text-indigo-300 px-3 py-1 rounded-full text-sm border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.1)] hover:border-indigo-500/50 hover:bg-indigo-500/20 transition-all"
          >
            <Tag size={12} />
            {tag}
            <button 
              onClick={() => removeTag(tag)}
              className="hover:text-white ml-1 p-0.5 rounded-full hover:bg-indigo-500/50 transition-colors"
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
          className="bg-transparent border-none outline-none text-white placeholder-gray-500 flex-1 min-w-[120px] text-base"
          placeholder={tags.length === 0 ? t('upload.tags_placeholder') : ''}
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute z-50 left-0 right-0 mt-2 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar"
        >
          {suggestions.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => addTag(tag.name)}
              className="w-full text-left px-4 py-3 text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex justify-between items-center text-base"
            >
              <span>{tag.name}</span>
              <span className="text-xs text-gray-500">{tag.count} {t('admin.tag_manager.items_count')}</span>
            </button>
          ))}
        </div>
      )}
      
      {/* Quick Select for Popular Tags */}
      {allTags.length > 0 && tags.length < 5 && !showSuggestions && (
          <div className="mt-2 flex flex-wrap gap-2">
              <span className="text-sm text-gray-500 py-1">{t('upload.popular_tags')}</span>
              {allTags.slice(0, 5).filter(t => !tags.includes(t.name)).map(tag => (
                  <button
                      key={tag.id}
                      type="button"
                      onClick={() => addTag(tag.name)}
                      className="text-sm bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors border border-white/5"
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