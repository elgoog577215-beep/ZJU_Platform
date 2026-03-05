import React from 'react';
import { motion } from 'framer-motion';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
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
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="px-4 py-3 sm:py-2 rounded-lg bg-[#0a0a0a]/60 backdrop-blur-3xl hover:bg-[#0a0a0a]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white border border-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        &lt;
      </button>
      
      <div className="flex space-x-2 overflow-x-auto max-w-[240px] sm:max-w-none scrollbar-hide">
        {getVisiblePages().map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`min-w-[44px] h-11 sm:min-w-[40px] sm:h-10 rounded-full transition-all border font-bold relative overflow-hidden group ${
              currentPage === page
                ? 'text-white border-transparent shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-110'
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
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="px-4 py-3 sm:py-2 rounded-lg bg-[#0a0a0a]/60 backdrop-blur-3xl hover:bg-[#0a0a0a]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white border border-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        &gt;
      </button>
    </div>
  );
};

export default Pagination;
