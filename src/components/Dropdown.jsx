import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

// Tooltip that only appears when text is actually truncated, rendered via portal
const TruncatedLabel = ({ text }) => {
  const spanRef = useRef(null);
  const timerRef = useRef(null);
  const [tooltipPos, setTooltipPos] = useState(null); // { x, y } or null

  const isTruncated = useCallback(() => {
    const el = spanRef.current;
    return el && el.scrollWidth > el.clientWidth;
  }, []);

  const handleMouseEnter = () => {
    if (!isTruncated()) return;
    timerRef.current = setTimeout(() => {
      const rect = spanRef.current.getBoundingClientRect();
      setTooltipPos({ x: rect.left, y: rect.bottom + 6 });
    }, 200);
  };

  const handleMouseLeave = () => {
    clearTimeout(timerRef.current);
    setTooltipPos(null);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <>
      <span
        ref={spanRef}
        className="truncate min-w-0 pr-2"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {text}
      </span>
      {createPortal(
        <AnimatePresence>
          {tooltipPos && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ position: 'fixed', left: tooltipPos.x, top: tooltipPos.y, zIndex: 9999 }}
              className="px-3 py-1.5 rounded-lg bg-[#1a1a2e] border border-white/15 text-white text-xs shadow-xl pointer-events-none max-w-xs whitespace-normal"
            >
              {text}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

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
        className={`flex items-center justify-between gap-2 w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3.5 sm:py-3 text-white focus:outline-none focus:border-indigo-500/50 transition-all duration-300 hover:bg-white/5 hover:border-indigo-500/30 hover:shadow-[0_0_20px_-10px_rgba(99,102,241,0.3)] group min-h-[44px] sm:min-h-0 ${buttonClassName}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {Icon && <Icon size={18} className={`shrink-0 text-gray-400 group-hover:text-indigo-400 transition-colors ${selectedOption ? 'text-indigo-400' : ''}`} />}
          <span className={`text-sm font-medium truncate min-w-0 flex-1 text-left ${selectedOption ? "text-white" : "text-gray-400"}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown 
          size={16} 
          className={`text-gray-500 group-hover:text-white transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`absolute top-full left-0 mt-2 min-w-full w-max max-w-[320px] bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] ring-1 ring-white/5 ${menuClassName}`}
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 sm:py-3 text-sm rounded-xl transition-all min-h-[44px] sm:min-h-0 ${
                    value === option.value 
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20 font-bold' 
                      : 'text-gray-400 hover:bg-white/10 hover:text-white active:bg-white/5 active:scale-[0.98]'
                  }`}
                >
                  <TruncatedLabel text={option.label} />
                  {value === option.value && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="shrink-0"
                    >
                        <Check size={16} strokeWidth={3} className="text-white" />
                    </motion.div>
                  )}
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
