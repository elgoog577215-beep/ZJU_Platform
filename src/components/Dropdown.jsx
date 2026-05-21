import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

// Tooltip that only appears when text is actually truncated, rendered via portal
const TruncatedLabel = ({ text }) => {
  const spanRef = useRef(null);
  const timerRef = useRef(null);
  const [tooltipPos, setTooltipPos] = useState(null); // { x, y } or null
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';

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
              className={`px-3 py-1.5 rounded-lg border text-xs shadow-xl pointer-events-none max-w-xs whitespace-normal ${isDayMode ? 'bg-white/95 border-slate-200/80 text-slate-800' : 'bg-[#1a1a2e] border-white/15 text-white'}`}
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
  menuClassName = "",
  variant = "default" // 'default' | 'sheet'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';

  useEffect(() => {
    const handleClickOutside = (event) => {
      // If it's sheet variant, we might not want to close on outside click as it's inline, 
      // but keeping it is fine.
      if (variant !== 'sheet' && containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [variant]);

  const selectedOption = options.find(opt => opt.value === value);
  const isSheet = variant === 'sheet';
  const hasSelection = selectedOption && selectedOption.value !== 'all';
  const focusClass = isDayMode
    ? 'focus-visible:ring-2 focus-visible:ring-cyan-500/45 focus-visible:shadow-[0_0_0_4px_rgba(6,182,212,0.1)]'
    : 'focus-visible:border-white/[0.22] focus-visible:ring-2 focus-visible:ring-cyan-200/30 focus-visible:shadow-[0_0_0_4px_rgba(103,232,249,0.1)]';

  return (
    <div className={`relative ${className}`} ref={containerRef} style={{ zIndex: isOpen && !isSheet ? 50 : 1 }}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 w-full backdrop-blur-sm border rounded-2xl px-4 py-3.5 sm:py-3 focus:outline-none focus-visible:outline-none transition-all duration-300 group min-h-[44px] sm:min-h-0 ${focusClass} ${isSheet ? (hasSelection ? (isDayMode ? 'border-cyan-300/50 bg-cyan-500/10 text-slate-900' : 'border-cyan-300/35 bg-cyan-300/10 text-white') : isOpen ? (isDayMode ? 'border-cyan-300/60 bg-white text-slate-900' : 'border-white/[0.16] bg-[#141926] text-white') : (isDayMode ? 'bg-white/82 border-slate-200/80 text-slate-600 hover:bg-white' : 'border-white/[0.11] text-slate-300 hover:bg-white/[0.06]')) : (isDayMode ? 'bg-white/82 border-slate-200/80 text-slate-800 hover:bg-white hover:border-cyan-300/70 focus:border-cyan-400/60' : 'bg-[#171a26] border-white/[0.11] text-white hover:bg-[#1d2130] hover:border-white/[0.18]')} ${buttonClassName}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {Icon && <Icon size={18} className={`shrink-0 transition-colors ${hasSelection ? (isDayMode ? 'text-cyan-700' : 'text-cyan-200') : (isDayMode ? 'text-slate-500 group-hover:text-cyan-600' : 'text-slate-400 group-hover:text-cyan-100')}`} />}
          <span className={`text-sm font-medium truncate min-w-0 flex-1 text-left ${hasSelection ? (isDayMode ? "text-slate-900" : "text-white") : (isDayMode ? "text-slate-500" : "text-gray-400")}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`transition-transform duration-300 ${hasSelection ? (isDayMode ? 'text-cyan-700' : 'text-cyan-200') : (isDayMode ? 'text-slate-500 group-hover:text-slate-900' : 'text-slate-500 group-hover:text-white')} ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={isSheet ? { height: 0, opacity: 0 } : { opacity: 0, y: -10, scale: 0.95 }}
            animate={isSheet ? { height: 'auto', opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={isSheet ? { height: 0, opacity: 0 } : { opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={isSheet
              ? `overflow-hidden mt-2 rounded-2xl border ${isDayMode ? 'border-slate-200/80 bg-white/80' : 'border-white/[0.1] bg-[#10131d]'} ${menuClassName}`
              : `absolute top-full left-0 mt-2 min-w-full w-max max-w-[320px] backdrop-blur-xl border rounded-[18px] shadow-2xl overflow-hidden z-[100] ${isDayMode ? 'bg-white/96 border-slate-200/80 ring-1 ring-slate-200/60 shadow-[0_20px_54px_rgba(15,23,42,0.12)]' : 'bg-[#0b0f1a]/96 border-white/[0.12] ring-1 ring-cyan-200/[0.06] shadow-[0_22px_60px_rgba(0,0,0,0.46)]'} ${menuClassName}`
            }
          >
            <div role="listbox" className={`${isSheet ? 'max-h-48' : 'max-h-72'} overflow-y-auto dropdown-scrollbar p-1.5 space-y-0.5`}>
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={value === option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-4 px-3.5 py-3 text-sm rounded-xl transition-all min-h-[40px] focus:outline-none focus-visible:outline-none ${focusClass} ${
                    value === option.value 
                      ? isDayMode
                        ? 'border border-cyan-500/25 bg-cyan-500/10 text-slate-950 shadow-[inset_3px_0_0_rgba(6,182,212,0.85)] font-black'
                        : 'border border-cyan-200/20 bg-white/[0.055] text-white shadow-[inset_3px_0_0_rgba(103,232,249,0.82)] font-black'
                      : isDayMode
                        ? 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 active:bg-slate-50 active:scale-[0.99]'
                        : 'text-slate-300 hover:bg-white/[0.06] hover:text-white active:bg-white/[0.05] active:scale-[0.99]'
                  }`}
                >
                  <TruncatedLabel text={option.label} />
                  {value === option.value && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`shrink-0 ${isDayMode ? 'text-cyan-700' : 'text-cyan-100'}`}
                    >
                        <Check size={16} strokeWidth={3} />
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
