import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Film, Image as ImageIcon, Calendar, Music, AlertCircle } from 'lucide-react';
import { normalizeExternalImageUrl } from '../utils/imageUtils';

const getGradient = (text) => {
  if (!text) return 'from-slate-100 via-white to-stone-100 dark:from-gray-700 dark:to-gray-900';
  
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
    'from-rose-50 via-white to-indigo-50 dark:from-red-500 dark:to-orange-500',
    'from-orange-50 via-white to-amber-50 dark:from-orange-500 dark:to-amber-500',
    'from-amber-50 via-white to-stone-100 dark:from-amber-500 dark:to-yellow-500',
    'from-lime-50 via-white to-emerald-50 dark:from-yellow-500 dark:to-lime-500',
    'from-emerald-50 via-white to-teal-50 dark:from-green-500 dark:to-emerald-500',
    'from-teal-50 via-white to-cyan-50 dark:from-emerald-500 dark:to-teal-500',
    'from-sky-50 via-white to-violet-50 dark:from-cyan-500 dark:to-sky-500',
    'from-indigo-50 via-white to-fuchsia-50 dark:from-blue-500 dark:to-indigo-500',
    'from-violet-50 via-white to-pink-50 dark:from-violet-500 dark:to-purple-500',
    'from-fuchsia-50 via-white to-rose-50 dark:from-fuchsia-500 dark:to-pink-500',
  ];

  return colors[Math.abs(hash) % colors.length];
};

const SmartImage = ({ 
  src, 
  alt, 
  className = "", 
  imageClassName = "", 
  iconSize = 24, 
  type = 'generic',
  priority = false,
  blurPlaceholder,
  onLoad,
  onError,
  objectFit = 'cover',
  ...props 
}) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const maxRetries = 3;

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.01
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  useEffect(() => {
    setError(false);
    setLoaded(false);
    setRetryCount(0);
  }, [src]);

  // Check if image is already loaded from cache
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setLoaded(true);
      onLoad?.();
    }
  }, [src, retryCount, onLoad]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    onLoad?.();
  }, [onLoad]);

  // FIX: BUG-28 — Store retry timeout and clear on unmount
  const retryTimeoutRef = useRef(null);
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  const handleError = useCallback(() => {
    if (retryCount < maxRetries) {
      retryTimeoutRef.current = setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 1000 * (retryCount + 1));
    } else {
      setError(true);
      onError?.();
    }
  }, [retryCount, onError]);

  const icons = {
    generic: FileText,
    video: Film,
    image: ImageIcon,
    article: FileText,
    event: Calendar,
    music: Music,
    error: AlertCircle
  };

  const Icon = icons[type] || icons.generic;
  const gradient = getGradient(alt || type);

  // Get actual image source. Guard against null because `typeof null === 'object'`.
  const rawImageSrc = src && typeof src === 'object'
    ? (src.url || src.medium?.url || src.small?.url)
    : src;
  const imageSrc = normalizeExternalImageUrl(rawImageSrc);

  // Fallback state (error or missing src)
  if (!imageSrc || error) {
    return (
      <div 
        ref={containerRef}
        className={`${className} bg-gradient-to-br ${gradient} flex items-center justify-center relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.9),transparent_48%)] dark:bg-slate-950/45" />
        <Icon size={iconSize} className="relative z-10 text-slate-400/70 dark:text-white/55" />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`${className} relative overflow-hidden bg-gradient-to-br ${gradient}`}
    >
      {/* Skeleton/Placeholder */}
      <AnimatePresence>
        {!loaded && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-slate-950/35"
          >
            {blurPlaceholder ? (
              <img
                src={blurPlaceholder}
                alt=""
                className="w-full h-full blur-xl scale-110"
                style={{ objectFit }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/64 to-transparent animate-shimmer dark:via-white/10" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actual Image */}
      {isInView && (
        <motion.img
          ref={imgRef}
          key={`${imageSrc}-${retryCount}`}
          src={imageSrc}
          alt={alt || ''}
          initial={{ opacity: 0 }}
          animate={{ opacity: loaded ? 1 : 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          onLoad={handleLoad}
          onError={handleError}
          className={`
            w-full h-full
            transition-all duration-700
            ${loaded ? 'opacity-100' : 'opacity-0'}
            ${imageClassName}
          `}
          style={{ objectFit }}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          {...props}
        />
      )}

      {/* Retry indicator */}
      {retryCount > 0 && !loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default SmartImage;
