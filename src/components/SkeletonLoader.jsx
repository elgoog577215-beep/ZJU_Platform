import React from 'react';
import { motion } from 'framer-motion';

/**
 * Skeleton Loader Component - Glassmorphism Style
 * Maintains the site's visual aesthetic while loading
 */

const shimmerVariants = {
  initial: { x: '-100%' },
  animate: { 
    x: '100%',
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: 'linear'
    }
  }
};

const pulseVariants = {
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

// Base skeleton item with glass effect
const SkeletonItem = ({ className = '', variant = 'shimmer' }) => {
  return (
    <motion.div
      variants={pulseVariants}
      animate="animate"
      className={`
        relative overflow-hidden rounded-xl
        bg-white/5 backdrop-blur-sm
        border border-white/5
        ${className}
      `}
    >
      {variant === 'shimmer' && (
        <motion.div
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        />
      )}
    </motion.div>
  );
};

// Photo card skeleton
export const PhotoCardSkeleton = () => {
  return (
    <div className="break-inside-avoid mb-4 md:mb-6">
      <SkeletonItem className="w-full aspect-[3/4] rounded-2xl" />
      <div className="mt-3 space-y-2">
        <SkeletonItem className="h-5 w-3/4" />
        <SkeletonItem className="h-4 w-1/2" />
      </div>
    </div>
  );
};

// Gallery skeleton grid
export const GallerySkeleton = ({ count = 12 }) => {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <PhotoCardSkeleton key={i} />
      ))}
    </div>
  );
};

// Music card skeleton
export const MusicCardSkeleton = () => {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
      <SkeletonItem className="w-16 h-16 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonItem className="h-5 w-3/4" />
        <SkeletonItem className="h-4 w-1/2" />
      </div>
      <SkeletonItem className="w-10 h-10 rounded-full" />
    </div>
  );
};

// Video card skeleton
export const VideoCardSkeleton = () => {
  return (
    <div className="group">
      <SkeletonItem className="w-full aspect-video rounded-2xl" />
      <div className="mt-3 space-y-2">
        <SkeletonItem className="h-5 w-3/4" />
        <SkeletonItem className="h-4 w-1/2" />
      </div>
    </div>
  );
};

// Article card skeleton
export const ArticleCardSkeleton = () => {
  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
      <SkeletonItem className="w-full md:w-48 h-32 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-3">
        <SkeletonItem className="h-6 w-3/4" />
        <SkeletonItem className="h-4 w-full" />
        <SkeletonItem className="h-4 w-2/3" />
        <div className="flex gap-2 pt-2">
          <SkeletonItem className="h-6 w-16 rounded-full" />
          <SkeletonItem className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
};

// Event card skeleton
export const EventCardSkeleton = () => {
  return (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-2 flex-1">
          <SkeletonItem className="h-6 w-3/4" />
          <SkeletonItem className="h-4 w-1/2" />
        </div>
        <SkeletonItem className="w-20 h-20 rounded-xl flex-shrink-0" />
      </div>
      <div className="space-y-2">
        <SkeletonItem className="h-4 w-full" />
        <SkeletonItem className="h-4 w-2/3" />
      </div>
    </div>
  );
};

// Text skeleton (for paragraphs)
export const TextSkeleton = ({ lines = 3 }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonItem 
          key={i} 
          className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} 
        />
      ))}
    </div>
  );
};

// Hero skeleton
export const HeroSkeleton = () => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center space-y-6 max-w-4xl mx-auto px-4">
        <SkeletonItem className="h-16 md:h-24 w-3/4 mx-auto rounded-2xl" />
        <SkeletonItem className="h-8 md:h-12 w-1/2 mx-auto rounded-xl" />
        <div className="flex gap-4 justify-center pt-4">
          <SkeletonItem className="h-12 w-32 rounded-full" />
          <SkeletonItem className="h-12 w-32 rounded-full" />
        </div>
      </div>
    </div>
  );
};

// Admin dashboard skeleton
export const AdminDashboardSkeleton = () => {
  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <SkeletonItem className="h-10 w-48 rounded-xl" />
          <SkeletonItem className="h-10 w-32 rounded-xl" />
        </div>
        
        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonItem key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        
        {/* Content area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonItem className="h-96 rounded-2xl lg:col-span-2" />
          <SkeletonItem className="h-96 rounded-2xl" />
        </div>
      </div>
    </div>
  );
};

// Table skeleton
export const TableSkeleton = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-white/10">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonItem key={i} className="h-6 flex-1 rounded-lg" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonItem 
              key={colIndex} 
              className="h-5 flex-1 rounded-lg" 
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// Generic card skeleton
export const CardSkeleton = ({ className = '' }) => {
  return (
    <div className={`p-6 rounded-2xl bg-white/5 border border-white/10 ${className}`}>
      <SkeletonItem className="h-48 w-full rounded-xl mb-4" />
      <div className="space-y-3">
        <SkeletonItem className="h-6 w-3/4 rounded-lg" />
        <SkeletonItem className="h-4 w-full rounded-lg" />
        <SkeletonItem className="h-4 w-2/3 rounded-lg" />
      </div>
    </div>
  );
};

export default SkeletonItem;
