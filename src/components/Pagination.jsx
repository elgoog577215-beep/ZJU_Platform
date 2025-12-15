import React from 'react';
import { motion } from 'framer-motion';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center space-x-2 mt-8 pb-8">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white border border-white/10"
      >
        &lt;
      </button>
      
      <div className="flex space-x-2 overflow-x-auto max-w-[200px] md:max-w-none scrollbar-hide">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`min-w-[40px] h-10 rounded-lg transition-all border font-bold ${
              currentPage === page
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-transparent shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white border border-white/10"
      >
        &gt;
      </button>
    </div>
  );
};

export default Pagination;
