import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Tag } from 'lucide-react';
import api from '../services/api';

const TagInput = ({ value = '', onChange, placeholder = 'Add tags...' }) => {
  const [tags, setTags] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

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
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTags = async () => {
    try {
      const response = await api.get('/tags');
      setAllTags(response.data);
    } catch (error) {
      console.error('Failed to fetch tags', error);
    }
  };

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
      <div className="flex flex-wrap gap-2 p-2 bg-black/20 border border-white/10 rounded-xl focus-within:border-indigo-500 transition-colors min-h-[50px]">
        {tags.map((tag, index) => (
          <span 
            key={index} 
            className="flex items-center gap-1 bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-sm border border-indigo-500/30"
          >
            <Tag size={12} />
            {tag}
            <button 
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-white transition-colors ml-1"
            >
              <X size={14} />
            </button>
          </span>
        ))}
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue && setShowSuggestions(true)}
          className="bg-transparent border-none outline-none text-white placeholder-gray-500 flex-1 min-w-[120px]"
          placeholder={tags.length === 0 ? placeholder : ''}
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute z-50 left-0 right-0 mt-1 bg-gray-900 border border-white/10 rounded-xl shadow-xl max-h-60 overflow-y-auto"
        >
          {suggestions.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => addTag(tag.name)}
              className="w-full text-left px-4 py-2 text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex justify-between items-center"
            >
              <span>{tag.name}</span>
              <span className="text-xs text-gray-500">{tag.count} usage</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagInput;
