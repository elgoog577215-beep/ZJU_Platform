import React from 'react';
import { motion } from 'framer-motion';
import { useSettings } from '../context/SettingsContext';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  return (
    <div className="flex justify-center items-center space-x-2 sm:space-x-3 mt-8 pb-20 md:pb-8">
      <button
        type="button"
        aria-label="上一页"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={`px-4 py-3 sm:py-2 rounded-lg backdrop-blur-3xl disabled:opacity-50 disabled:cursor-not-allowed transition-all border min-h-[44px] min-w-[44px] inline-flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? 'bg-white/90 hover:bg-white text-slate-700 border-slate-200/80' : 'bg-[#0a0a0a]/60 hover:bg-[#0a0a0a]/80 text-white border-white/10'}`}
      >
        &lt;
      </button>
      
      <div className="flex space-x-2 overflow-x-auto max-w-[240px] sm:max-w-none scrollbar-hide">
        {getVisiblePages().map((page) => (
          <button
            key={page}
            type="button"
            aria-current={currentPage === page ? 'page' : undefined}
            aria-label={`第 ${page} 页`}
            onClick={() => onPageChange(page)}
            className={`min-w-[44px] h-11 sm:min-w-[40px] sm:h-10 rounded-full transition-all border font-bold relative overflow-hidden group ${
              currentPage === page
                ? 'text-white border-transparent shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-110'
                : isDayMode
                  ? 'bg-white/90 backdrop-blur-3xl hover:bg-white text-slate-500 hover:text-slate-900 border-slate-200/80 hover:border-indigo-200/80'
                  : 'bg-[#0a0a0a]/60 backdrop-blur-3xl hover:bg-[#0a0a0a]/80 text-gray-400 hover:text-white border-white/10 hover:border-white/30'
            }`}
          >
            {currentPage === page && (
              <motion.div 
                layoutId="activePage"
                className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">{page}</span>
            {currentPage !== page && (
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        aria-label="下一页"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className={`px-4 py-3 sm:py-2 rounded-lg backdrop-blur-3xl disabled:opacity-50 disabled:cursor-not-allowed transition-all border min-h-[44px] min-w-[44px] inline-flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? 'bg-white/90 hover:bg-white text-slate-700 border-slate-200/80' : 'bg-[#0a0a0a]/60 hover:bg-[#0a0a0a]/80 text-white border-white/10'}`}
      >
        &gt;
      </button>
    </div>
  );
};

export default Pagination;
