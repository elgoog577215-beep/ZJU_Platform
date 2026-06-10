import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileText, Film, Image as ImageIcon, Calendar, Music, AlertCircle } from 'lucide-react';
import { getOriginalUploadUrl, normalizeExternalImageUrl } from '../utils/imageUtils';
import { useSettings } from '../context/SettingsContext';

const getGradient = (text, isDayMode, placeholderTone = 'default') => {
  if (placeholderTone === 'neutral') {
    return isDayMode
      ? 'from-slate-100 via-slate-50 to-stone-100'
      : 'from-slate-800 via-slate-900 to-slate-950';
  }

  if (isDayMode) return 'from-slate-100 via-slate-50 to-stone-100';
  if (!text) return 'from-gray-700 to-gray-900';
  
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
        'from-red-500 to-orange-500',
        'from-orange-500 to-amber-500',
        'from-amber-500 to-yellow-500',
        'from-yellow-500 to-lime-500',
        'from-lime-500 to-green-500',
        'from-green-500 to-emerald-500',
        'from-emerald-500 to-teal-500',
        'from-teal-500 to-cyan-500',
        'from-cyan-500 to-sky-500',
        'from-sky-500 to-blue-500',
        'from-blue-500 to-indigo-500',
        'from-indigo-500 to-violet-500',
        'from-violet-500 to-purple-500',
        'from-purple-500 to-fuchsia-500',
        'from-fuchsia-500 to-pink-500',
        'from-pink-500 to-rose-500',
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
  placeholderTone = 'default',
  onLoad,
  onError,
  objectFit = 'cover',
  ...props 
}) => {
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const maxRetries = 3;

  // Get actual image source. Guard against null because `typeof null === 'object'`.
  const rawImageSrc = src && typeof src === 'object'
    ? (src.url || src.medium?.url || src.small?.url)
    : src;
  const imageSrc = normalizeExternalImageUrl(rawImageSrc);
  const originalUploadSrc = getOriginalUploadUrl(imageSrc);

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
    const currentImage = imgRef.current;
    const currentSrc = currentImage?.getAttribute('src');

    if (currentImage && originalUploadSrc && originalUploadSrc !== currentSrc && !currentImage.dataset.originalUploadFallback) {
      currentImage.dataset.originalUploadFallback = 'true';
      currentImage.src = originalUploadSrc;
      return;
    }

    if (retryCount < maxRetries) {
      retryTimeoutRef.current = setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 1000 * (retryCount + 1));
    } else {
      setError(true);
      onError?.();
    }
  }, [retryCount, onError, originalUploadSrc]);

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
  const gradient = getGradient(alt || type, isDayMode, placeholderTone);

  // Fallback state (error or missing src)
  if (!imageSrc || error) {
    return (
      <div 
        ref={containerRef}
        className={`${className} bg-gradient-to-br ${gradient} flex items-center justify-center relative overflow-hidden`}
      >
        <div className={`absolute inset-0 ${isDayMode ? "bg-white/18" : "bg-slate-950/45"}`} />
        <Icon size={iconSize} className={`relative z-10 ${isDayMode ? "text-slate-400/70" : "text-white/55"}`} />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`${className} relative overflow-hidden bg-gradient-to-br ${gradient}`}
    >
      {!loaded && (
        <div className={`absolute inset-0 z-10 ${isDayMode ? "bg-slate-100" : "bg-slate-950/35"}`}>
          {blurPlaceholder ? (
            <img
              src={blurPlaceholder}
              alt=""
              className="w-full h-full blur-xl scale-110"
              style={{ objectFit }}
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-r from-transparent animate-shimmer ${isDayMode ? "via-white/64" : "via-white/10"}`} />
          )}
        </div>
      )}

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
            ${loaded ? 'opacity-100' : 'opacity-0 invisible'}
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
          <div className={`w-6 h-6 rounded-full animate-spin ${isDayMode ? "border-2 border-slate-200 border-t-slate-500" : "border-2 border-white/30 border-t-white"}`} />
        </div>
      )}
    </div>
  );
};

export default SmartImage;
