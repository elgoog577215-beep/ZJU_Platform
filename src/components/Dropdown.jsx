import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

const Dropdown = ({ 
  value, 
  onChange, 
  options, 
  placeholder = "Select...", 
  icon: Icon,
  className = "",
  buttonClassName = "",
  menuClassName = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef} style={{ zIndex: isOpen ? 50 : 1 }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500/50 transition-all hover:bg-white/5 ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon size={16} className="text-gray-400" />}
          <span className={selectedOption ? "text-white" : "text-gray-400"}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown 
          size={16} 
          className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={`absolute top-full right-0 mt-2 w-full min-w-[160px] bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] ${menuClassName}`}
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-colors mb-0.5 last:mb-0 ${
                    value === option.value 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {value === option.value && <Check size={14} />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dropdown;
